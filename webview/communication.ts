import {
  callCommand,
  insert,
  replaceAll,
} from '@milkdown/utils';
import {
  toggleLinkCommand,
  wrapInHeadingCommand,
  createCodeBlockCommand,
  wrapInBlockquoteCommand,
  toggleStrongCommand,
  toggleEmphasisCommand,
} from '@milkdown/preset-commonmark';
import { editorViewCtx } from '@milkdown/core';
import { state, vscode } from './state';
import { updateMetadataUI, frontmatterRegex } from './ui/metadata';
import { initCodeMirror } from './editor/codemirror';
import { insertFootnote } from './utils/markdown';

export function setupMessageListener() {
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'update':
        if (state.isSourceMode) {
          if (!state.cmView) {
            initCodeMirror(message.text);
          } else {
            state.isUpdatingFromVSCode = true;
            state.cmView.dispatch({
              changes: { from: 0, to: state.cmView.state.doc.length, insert: message.text },
            });
            setTimeout(() => {
              state.isUpdatingFromVSCode = false;
            }, 50);
          }
        } else {
          if (state.editor) {
            state.isUpdatingFromVSCode = true;
            let markdownToRender = message.text;
            const match = message.text.match(frontmatterRegex);
            if (match) {
              state.currentFrontmatter = match[0];
              updateMetadataUI(match[1]);
              markdownToRender = message.text.slice(match[0].length);
            } else {
              state.currentFrontmatter = '';
              updateMetadataUI('');
            }
            state.lastMarkdown = markdownToRender;

            state.editor.action(replaceAll(markdownToRender));
            setTimeout(() => {
              state.isUpdatingFromVSCode = false;
            }, 50);
          }
        }
        break;

      case 'setMode':
        const themeClass = message.theme === 2 ? 'vscode-dark' : 'vscode-light';
        document.body.className = themeClass;
        break;
      
      case 'insertText':
        if (state.isSourceMode && state.cmView) {
          const selection = state.cmView.state.selection.main;
          state.cmView.dispatch({
            changes: { from: selection.from, to: selection.to, insert: message.text },
            selection: { anchor: selection.from + message.text.length }
          });
        } else if (state.editor) {
          state.editor.action(insert(message.text));
        }
        break;

      case 'replaceFootnote':
        if (state.editor) {
          state.editor.action((ctx: any) => {
            const view = ctx.get(editorViewCtx);
            const { state: pmState, dispatch } = view;
            
            let tr = pmState.tr;
            let posOffset = 0;
            
            pmState.doc.descendants((node: any, pos: number) => {
              if (node.isText && node.text) {
                const globalPos = pos + posOffset;
                const match = node.text.match(/\[\^([^\]]+)\](?!:)/);
                if (match && match[1] === message.oldId) {
                  const start = globalPos + match.index!;
                  const end = start + match[0].length;
                  tr = tr.replaceWith(start, end, pmState.schema.text(`[^${message.newId}]`));
                  posOffset += (message.newId.length - message.oldId.length);
                } else {
                  const defMatch = node.text.match(new RegExp(`^\\[\\^${message.oldId}\\]:`));
                  if (defMatch) {
                    const start = globalPos;
                    const end = start + defMatch[0].length;
                    tr = tr.replaceWith(start, end, pmState.schema.text(`[^${message.newId}]:`));
                    posOffset += (message.newId.length - message.oldId.length);
                  }
                }
              }
              return true;
            });
            
            if (tr.docChanged) dispatch(tr);
          });
        }
        break;

      case 'config':
        state.publicPathPrefix = message.publicPathPrefix;
        state.workspaceRoot = message.workspaceRoot;
        break;

      case 'command':
        handleVSCodeCommand(message.command);
        break;
    }
  });
}

export function handleVSCodeCommand(command: string) {
  if (!state.editor) return;

  switch (command) {
    case 'sendToAI':
      state.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state: pmState } = view;
        const selectedText = pmState.doc.textBetween(
          pmState.selection.from,
          pmState.selection.to,
          '\n',
        );

        if (selectedText && vscode) {
          vscode.postMessage({ type: 'sendToAI', text: selectedText });
        }
      });
      break;
    case 'insertLink':
      state.editor.action(callCommand(toggleLinkCommand.key));
      break;
    case 'save':
      if (vscode) vscode.postMessage({ type: 'save' });
      break;
    case 'insertTable':
      state.editor.action(
        insert(`\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Text     | Text     |\n`),
      );
      break;
    case 'insertHeading1':
      state.editor.action(callCommand(wrapInHeadingCommand.key, 1));
      break;
    case 'insertHeading2':
      state.editor.action(callCommand(wrapInHeadingCommand.key, 2));
      break;
    case 'insertHeading3':
      state.editor.action(callCommand(wrapInHeadingCommand.key, 3));
      break;
    case 'insertHeading4':
      state.editor.action(callCommand(wrapInHeadingCommand.key, 4));
      break;
    case 'insertHeading5':
      state.editor.action(callCommand(wrapInHeadingCommand.key, 5));
      break;
    case 'insertHeading6':
      state.editor.action(callCommand(wrapInHeadingCommand.key, 6));
      break;
    case 'insertCodeBlock':
      state.editor.action(callCommand(createCodeBlockCommand.key));
      break;
    case 'insertBlockquote':
      state.editor.action(callCommand(wrapInBlockquoteCommand.key));
      break;
    case 'insertImage':
      state.editor.action(insert(`\n![image]()\n`));
      break;
    case 'toggleBold':
      state.editor.action(callCommand(toggleStrongCommand.key));
      break;
    case 'toggleItalic':
      state.editor.action(callCommand(toggleEmphasisCommand.key));
      break;
  }
}
