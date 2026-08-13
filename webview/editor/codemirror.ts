import { EditorView, basicSetup } from 'codemirror';
import { ViewPlugin, Decoration, MatchDecorator, DecorationSet } from '@codemirror/view';
import { markdown as cmMarkdown } from '@codemirror/lang-markdown';
import { replaceAll } from '@milkdown/utils';
import { state, vscode } from '../state';
import { frontmatterRegex, updateMetadataUI } from '../ui/metadata';

const vsCodeTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--vscode-editor-background)',
      color: 'var(--vscode-editor-foreground)',
      height: '100%',
    },
    '.cm-content': {
      caretColor: 'var(--vscode-editorCursor-foreground)',
      fontFamily: 'var(--vscode-editor-font-family, monospace)',
      fontSize: 'var(--vscode-editor-font-size, 14px)',
      lineHeight: '1.6',
      padding: '24px 32px',
      maxWidth: '800px',
      margin: '0 auto',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--vscode-editorCursor-foreground)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'var(--vscode-editor-selectionBackground)',
    },
    '.cm-panels': {
      backgroundColor: 'var(--vscode-editorWidget-background)',
      color: 'var(--vscode-editorWidget-foreground)',
    },
    '.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
    '.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },
    '.cm-searchMatch': {
      backgroundColor: 'var(--vscode-editor-findMatchBackground)',
      outline: '1px solid var(--vscode-editor-findMatchHighlightBackground)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'var(--vscode-editor-findMatchHighlightBackground)',
    },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-selectionMatch': { backgroundColor: 'var(--vscode-editor-selectionHighlightBackground)' },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: 'var(--vscode-editorBracketMatch-background)',
      outline: '1px solid var(--vscode-editorBracketMatch-border)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--vscode-editorGutter-background)',
      color: 'var(--vscode-editorLineNumber-foreground)',
      border: 'none',
      borderRight: '1px solid var(--vscode-editorIndentGuide-background)',
    },
    '.cm-activeLineGutter': {
      color: 'var(--vscode-editorLineNumber-activeForeground)',
      backgroundColor: 'transparent',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'var(--vscode-editor-foreground)',
    },
    '.cm-tooltip': {
      border: 'none',
      backgroundColor: 'var(--vscode-editorHoverWidget-background)',
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'var(--vscode-editorSuggestWidget-selectedBackground)',
        color: 'var(--vscode-editorSuggestWidget-selectedForeground)',
      },
    },
    '.cm-hashtag': {
      color: 'var(--vscode-editor-foreground)',
      backgroundColor: 'var(--vscode-textCodeBlock-background)',
      padding: '1px 6px',
      borderRadius: '12px',
      fontWeight: '500',
      border: '1px solid var(--vscode-panel-border)',
      opacity: '0.8',
    },
  },
  { dark: true },
);

const hashtagDecorator = new MatchDecorator({
  regexp: /(?:^|\s)(#[a-zA-Z0-9_-]+)/g,
  decoration: (match, view, pos) => {
    return Decoration.mark({ class: 'cm-hashtag' });
  },
});

const hashtagPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = hashtagDecorator.createDeco(view);
    }
    update(update: any) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = hashtagDecorator.updateDeco(update, this.decorations);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export function initCodeMirror(initialText: string) {
  if (state.cmView) return;
  const parent = document.getElementById('source-editor');
  if (!parent) return;

  state.cmView = new EditorView({
    doc: initialText,
    extensions: [
      basicSetup,
      cmMarkdown(),
      vsCodeTheme,
      hashtagPlugin,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !state.isUpdatingFromVSCode) {
          const text = update.state.doc.toString();
          // Send to VS Code
          if (vscode) {
            vscode.postMessage({
              type: 'edit',
              text: text,
            });
          }
          
          // Update Milkdown implicitly
          state.isUpdatingFromVSCode = true;

          const match = text.match(frontmatterRegex);
          let markdownToRender = text;
          if (match) {
            state.currentFrontmatter = match[0];
            updateMetadataUI(match[1]);
            markdownToRender = text.slice(match[0].length);
          } else {
            state.currentFrontmatter = '';
            updateMetadataUI('');
          }

          state.lastMarkdown = markdownToRender;
          if (state.editor) {
            state.editor.action(replaceAll(markdownToRender));
          }
          
          setTimeout(() => {
            state.isUpdatingFromVSCode = false;
          }, 50);
        }
      }),
      EditorView.theme({
        '&': {
          backgroundColor: 'var(--vscode-editor-background)',
          color: 'var(--vscode-editor-foreground)',
        },
        '.cm-gutters': {
          backgroundColor: 'var(--vscode-editorGutter-background)',
          color: 'var(--vscode-editorLineNumber-foreground)',
          border: 'none',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'var(--vscode-editorLineNumber-activeForeground)',
        },
      }),
    ],
    parent: parent,
  });
}
