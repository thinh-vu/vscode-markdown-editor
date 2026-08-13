import {
  Editor,
  rootCtx,
  defaultValueCtx,
  parserCtx,
  editorViewCtx,
  prosePluginsCtx,
} from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';

// Import CSS
import '@milkdown/theme-nord/style.css';
import '@milkdown/prose/view/style/prosemirror.css';

import { callCommand, insert, insertPos } from '@milkdown/utils';
import { history, undoCommand, redoCommand } from '@milkdown/plugin-history';
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInBlockquoteCommand,
  createCodeBlockCommand,
  wrapInHeadingCommand,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  toggleLinkCommand,
  htmlSchema,
} from '@milkdown/preset-commonmark';
import {
  toggleStrikethroughCommand,
  addRowAfterCommand,
  addColAfterCommand,
} from '@milkdown/preset-gfm';
import { deleteRow, deleteColumn, deleteTable } from '@milkdown/prose/tables';
// editorViewCtx already imported at line 1
import { clipboard } from '@milkdown/plugin-clipboard';
import { diagram, diagramSchema } from '@milkdown/plugin-diagram';
import { prism, prismConfig } from '@milkdown/plugin-prism';
import 'prism-themes/themes/prism-nord.css';
import { slashFactory, SlashProvider } from '@milkdown/plugin-slash';
import { PluginKey } from '@milkdown/prose/state';
import { $view } from '@milkdown/utils';
import mermaid from 'mermaid';
import { yamlPlugin } from './yamlPlugin';

const htmlView = $view(htmlSchema.node, () => (node, view, getPos) => {
  const container = document.createElement('span');
  container.className = 'custom-html-block';
  container.style.display = 'inline-block';
  container.style.width = '100%';
  container.style.margin = '8px 0';
  container.innerHTML = node.attrs.value;

  return {
    dom: container,
    update: (updatedNode) => {
      if (updatedNode.type.name !== 'html') return false;
      container.innerHTML = updatedNode.attrs.value;
      return true;
    },
  };
});

mermaid.initialize({ startOnLoad: false, theme: 'default' });

const mermaidView = $view(diagramSchema.node, () => (node, view, getPos) => {
  const container = document.createElement('div');
  container.className = 'mermaid-container';
  container.style.border = '1px dashed var(--vscode-panel-border)';
  container.style.padding = '8px';
  container.style.margin = '8px 0';

  const preview = document.createElement('div');
  preview.style.textAlign = 'center';
  preview.style.cursor = 'pointer';
  preview.title = 'Click to edit Mermaid code';

  const textarea = document.createElement('textarea');
  textarea.style.width = '100%';
  textarea.style.boxSizing = 'border-box';
  textarea.style.fontFamily = 'monospace';
  textarea.style.minHeight = '100px';
  textarea.style.backgroundColor = 'var(--vscode-input-background)';
  textarea.style.color = 'var(--vscode-input-foreground)';
  textarea.style.display = 'none';
  textarea.value = node.attrs.value;

  container.appendChild(preview);
  container.appendChild(textarea);

  let isEditing = false;

  const render = async () => {
    if (!node.attrs.value.trim()) {
      preview.innerHTML =
        '<em style="color: var(--vscode-descriptionForeground)">Empty Mermaid diagram</em>';
      return;
    }
    try {
      const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
      const { svg } = await mermaid.render(id, node.attrs.value);
      preview.innerHTML = svg;
    } catch (e) {
      preview.innerHTML = `<div style="color: var(--vscode-errorForeground)">Mermaid Syntax Error</div>`;
    }
  };
  render();

  preview.addEventListener('dblclick', (e) => {
    e.preventDefault();
    isEditing = true;
    preview.style.display = 'none';
    textarea.style.display = 'block';
    textarea.focus();
  });

  textarea.addEventListener('blur', () => {
    isEditing = false;
    preview.style.display = 'block';
    textarea.style.display = 'none';
    const newCode = textarea.value;
    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (pos !== undefined) {
      view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, value: newCode }));
    }
  });

  return {
    dom: container,
    update: (updatedNode) => {
      if (updatedNode.type.name !== 'diagram') return false;
      if (updatedNode.attrs.value !== node.attrs.value) {
        node = updatedNode;
        textarea.value = node.attrs.value;
        if (!isEditing) {
          render();
        }
      }
      return true;
    },
    ignoreMutation: () => true,
  };
});

// @ts-expect-error acquireVsCodeApi is injected by VS Code
const vscode = acquireVsCodeApi();
let isUpdatingFromVSCode = false;

window.addEventListener('error', (event) => {
  vscode.postMessage({
    type: 'logError',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
  });
});
window.addEventListener('unhandledrejection', (event) => {
  vscode.postMessage({ type: 'logError', message: event.reason?.message || String(event.reason) });
});

import { Plugin, PluginKey, TextSelection } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';

// CodeMirror imports
import { EditorView, basicSetup } from 'codemirror';
import { markdown as cmMarkdown } from '@codemirror/lang-markdown';

let isSourceMode = false;
let cmView: EditorView | null = null;

const insertFootnote = (ctx: any) => {
  if (!isSourceMode) {
    const view = ctx.get(editorViewCtx);
    const parser = ctx.get(parserCtx);
    const { state, dispatch } = view;
    const fullText = state.doc.textBetween(0, state.doc.content.size);
    const matches = [...fullText.matchAll(/\[\^(\d+)\]/g)];
    let nextNum = 1;
    if (matches.length > 0) {
      const nums = matches.map((m) => parseInt(m[1])).filter((n) => !isNaN(n));
      if (nums.length > 0) nextNum = Math.max(...nums) + 1;
    }

    let tr = state.tr;
    tr = tr.insertText(`[^${nextNum}]`);

    const lastPart = fullText.slice(-200);
    const hasDivider = lastPart.includes('---');
    const def = hasDivider ? `\n[^${nextNum}]: ` : `\n\n---\n[^${nextNum}]: `;

    const doc = parser(def);
    const slice = doc.slice(0, doc.content.size);
    tr = tr.insert(tr.doc.content.size, slice.content);

    dispatch(tr);
  } else {
    if (cmView) {
      const fullText = cmView.state.doc.toString();
      const matches = [...fullText.matchAll(/\[\^(\d+)\]/g)];
      let nextNum = 1;
      if (matches.length > 0) {
        const nums = matches.map((m) => parseInt(m[1])).filter((n) => !isNaN(n));
        if (nums.length > 0) nextNum = Math.max(...nums) + 1;
      }

      const { head } = cmView.state.selection.main;
      const ref = `[^${nextNum}]`;

      const lastPart = fullText.slice(-200);
      const hasDivider = lastPart.includes('---');
      const def = hasDivider ? `\n[^${nextNum}]: ` : `\n\n---\n[^${nextNum}]: `;

      cmView.dispatch({
        changes: [
          { from: head, insert: ref },
          { from: cmView.state.doc.length, insert: def },
        ],
        selection: { anchor: head + ref.length },
      });
    }
  }
};

let currentZoom = 14;
let lastMarkdown = '';

// Trích xuất Frontmatter (hỗ trợ LF/CRLF và khoảng trắng thừa)
const frontmatterRegex = /^\s*---[\s]*\r?\n([\s\S]*?)\r?\n---[\s]*(?:\r?\n|$)/;
let currentFrontmatter = '';

function updateMetadataUI(content: string) {
  const container = document.getElementById('metadata-container');
  const contentDiv = document.getElementById('metadata-content');
  if (content) {
    if (container) container.style.display = 'block';
    if (contentDiv) contentDiv.textContent = content;
  } else {
    if (container) container.style.display = 'none';
    if (contentDiv) contentDiv.textContent = '';
  }
}

// ProseMirror Plugin to style Admonitions
const admonitionPlugin = new Plugin({
  key: new PluginKey('admonition'),
  props: {
    decorations(state) {
      const decorations: Decoration[] = [];
      let adType: string | null = null;
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'blockquote') {
          const text = node.textContent.trim();
          const match = text.match(/^\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]/i);
          if (match) {
            adType = match[1].toLowerCase();
            decorations.push(
              Decoration.node(pos, pos + node.nodeSize, {
                class: `admonition admonition-${adType}`,
              }),
            );
          }
        } else if (node.type.name === 'paragraph' && adType) {
          const pText = node.textContent;
          const match = pText.match(/^\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]/i);
          if (match) {
            const startPos = pos + 1;
            const endPos = startPos + match[0].length;

            decorations.push(
              Decoration.inline(startPos, endPos, {
                style: 'display: none;',
              }),
            );

            const titleWidget = document.createElement('span');
            titleWidget.className = `admonition-title admonition-title-${adType}`;
            const icons: any = {
              note: '📘',
              warning: '⚠️',
              tip: '💡',
              important: '❗',
              caution: '🛑',
            };
            titleWidget.innerHTML = `
                            <span class="admonition-icon">${icons[adType] || '📘'}</span>
                            <span class="admonition-text">${match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()}</span>
                        `;
            decorations.push(Decoration.widget(startPos, titleWidget));
          }
          adType = null;
        }
      });
      return DecorationSet.create(state.doc, decorations);
    },
  },
});

const slash = slashFactory('my-slash');

function updateOutline(markdown: string) {
  const container = document.getElementById('flyout-container');
  if (!container) return;

  // Chỉ quét heading từ H1 đến H4 theo yêu cầu
  const regex = /^(#{1,4})\s+(.+)$/gm;
  let match;
  let html = '';

  let count = 0;
  while ((match = regex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const safeText = text.replace(/"/g, '&quot;');

    html += `
            <div class="outline-item outline-h${level}" data-text="${safeText}" title="${safeText}">
                <span class="outline-dash"></span>
                <span class="outline-text">${text}</span>
            </div>
        `;
    count++;
  }

  if (count === 0) {
    html = `<div style="color:red; font-size: 11px; white-space: normal; padding: 10px;">No headings found in ${markdown.length} chars.<br/>Preview:<br/>${markdown.substring(0, 50).replace(/</g, '&lt;')}</div>`;
  }

  container.innerHTML = html;

  const items = container.querySelectorAll('.outline-item');
  items.forEach((item) => {
    item.addEventListener('click', () => {
      const text = item.getAttribute('data-text');
      if (text) {
        const unescapedText = text.replace(/&quot;/g, '"');
        const headings = document.querySelectorAll(
          '.milkdown h1, .milkdown h2, .milkdown h3, .milkdown h4',
        );
        for (let i = 0; i < headings.length; i++) {
          if (headings[i].textContent?.includes(unescapedText)) {
            headings[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
            break;
          }
        }
      }
    });
  });
}

async function initEditor() {
  const publicPathPrefixMeta = document.querySelector(
    'meta[name="image-public-path"]',
  ) as HTMLMetaElement;
  const publicPathPrefix = publicPathPrefixMeta ? publicPathPrefixMeta.content : '';
  const workspaceRootMeta = document.querySelector(
    'meta[name="workspace-root"]',
  ) as HTMLMetaElement;
  const workspaceRoot = workspaceRootMeta ? workspaceRootMeta.content : '';

  if (publicPathPrefix || workspaceRoot) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const imgs =
                node.tagName === 'IMG'
                  ? [node as HTMLImageElement]
                  : Array.from(node.querySelectorAll('img'));
              imgs.forEach((img) => {
                const originalSrc = img.getAttribute('src');
                if (originalSrc && originalSrc.startsWith('/')) {
                  if (originalSrc.startsWith('vscode-webview:')) return;
                  const prefix = publicPathPrefix
                    ? publicPathPrefix.startsWith('/')
                      ? publicPathPrefix
                      : '/' + publicPathPrefix
                    : '';
                  img.setAttribute('data-raw-src', originalSrc);
                  if (workspaceRoot) {
                    img.src = workspaceRoot + prefix + originalSrc;
                  } else {
                    img.src = prefix + originalSrc;
                  }
                } else if (originalSrc && !img.hasAttribute('data-raw-src')) {
                  img.setAttribute('data-raw-src', originalSrc);
                }
              });
            }
          });
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          const img = mutation.target as HTMLImageElement;
          const originalSrc = img.getAttribute('src');
          if (originalSrc && originalSrc.startsWith('/')) {
            if (originalSrc.startsWith('vscode-webview:')) return;
            const prefix = publicPathPrefix
              ? publicPathPrefix.startsWith('/')
                ? publicPathPrefix
                : '/' + publicPathPrefix
              : '';
            if (
              !img.hasAttribute('data-raw-src') ||
              img.getAttribute('data-raw-src') !== originalSrc
            ) {
              img.setAttribute('data-raw-src', originalSrc);
              if (workspaceRoot) {
                img.src = workspaceRoot + prefix + originalSrc;
              } else {
                img.src = prefix + originalSrc;
              }
            }
          }
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  }

  // Image Context Menu Logic
  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      e.preventDefault();
      const rawSrc = target.getAttribute('data-raw-src') || target.getAttribute('src');
      vscode.postMessage({
        type: 'renameImage',
        src: rawSrc,
      });
    }
  });

  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, document.querySelector('#editor'));
      ctx.set(defaultValueCtx, '# Loading...');

      ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
        if (markdown !== prevMarkdown && !isUpdatingFromVSCode) {
          lastMarkdown = markdown;
          vscode.postMessage({
            type: 'edit',
            // Ghép frontmatter vào đầu file khi gửi về VS Code
            text: (currentFrontmatter ? currentFrontmatter : '') + markdown,
          });
        } else if (markdown !== prevMarkdown) {
          lastMarkdown = markdown;
        }
        updateOutline(markdown);
      });

      // Cấu hình slash plugin spec
      ctx.set(slash.key, {
        view: (view) => {
          const content = document.createElement('div');
          content.className = 'slash-menu';
          content.innerHTML = `
                        <div class="slash-item" data-action="h1"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heading-1"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg></span>Heading 1</div>
                        <div class="slash-item" data-action="h2"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heading-2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg></span>Heading 2</div>
                        <div class="slash-item" data-action="h3"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heading-3"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg></span>Heading 3</div>
                        <div class="slash-item" data-action="ul"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/></svg></span>Bullet List</div>
                        <div class="slash-item" data-action="ol"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-ordered"><path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/></svg></span>Ordered List</div>
                        <div class="slash-item" data-action="task"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-todo"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><rect x="3" y="4" width="6" height="6" rx="1"/></svg></span>Task List</div>
                        <div class="slash-item" data-action="quote"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-quote"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg></span>Quote</div>
                        <div class="slash-item" data-action="code"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg></span>Code Block</div>
                        <div class="slash-item" data-action="table"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg></span>Table</div>
                        <div class="slash-item" data-action="image"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></span>Image</div>
                        <div class="slash-item" data-action="yaml"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-braces"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg></span>YAML Frontmatter</div>
                        <div class="slash-item" data-action="footnote"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-superscript"><path d="m4 19 8-8" /><path d="m12 19-8-8" /><path d="M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06" /></svg></span>Footnote</div>
                    `;
          const provider = new SlashProvider({
            content,
            trigger: '/',
          });

          provider.onShow = () => {
            content.style.display = 'block';
          };
          provider.onHide = () => {
            content.style.display = 'none';
          };

          content.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const target = e.target as HTMLElement;
            const item = target.closest('.slash-item');
            if (!item) return;

            const action = item.getAttribute('data-action');
            if (action) {
              provider.hide();
              const editorView = ctx.get(editorViewCtx);
              const { state, dispatch } = editorView;
              const { tr, selection } = state;
              // Delete the '/' character
              dispatch(tr.delete(selection.from - 1, selection.from));

              switch (action) {
                case 'h1':
                  callCommand(wrapInHeadingCommand.key, 1)(ctx);
                  break;
                case 'h2':
                  callCommand(wrapInHeadingCommand.key, 2)(ctx);
                  break;
                case 'h3':
                  callCommand(wrapInHeadingCommand.key, 3)(ctx);
                  break;
                case 'ul':
                  callCommand(wrapInBulletListCommand.key)(ctx);
                  break;
                case 'ol':
                  callCommand(wrapInOrderedListCommand.key)(ctx);
                  break;
                case 'task':
                  callCommand(wrapInBulletListCommand.key)(ctx);
                  ctx
                    .get(editorViewCtx)
                    .dispatch(ctx.get(editorViewCtx).state.tr.insertText('[ ] '));
                  break;
                case 'quote':
                  callCommand(wrapInBlockquoteCommand.key)(ctx);
                  break;
                case 'code':
                  callCommand(createCodeBlockCommand.key)(ctx);
                  break;
                case 'table':
                  insert(
                    '\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Text     | Text     |\n',
                  )(ctx);
                  break;
                case 'image':
                  insert('\n![image]()\n')(ctx);
                  break;
                case 'yaml':
                  insert('---\ntitle: Untitled\n---\n\n')(ctx);
                  break;
                case 'footnote':
                  insertFootnote(ctx);
                  break;
              }
            }
          });

          return {
            update: (updatedView, prevState) => {
              provider.update(updatedView, prevState);
            },
            destroy: () => {
              provider.destroy();
              content.remove();
            },
          };
        },
      });

      // Add custom Prosemirror plugins
      ctx.update(prosePluginsCtx, (prev) => [...prev, admonitionPlugin]);
    })
    .config(nord)
    .use(commonmark)
    .use(gfm);

  const enableSlashMeta = document.querySelector(
    'meta[name="enable-slash-command"]',
  ) as HTMLMetaElement;
  const enableSlash = enableSlashMeta ? enableSlashMeta.content !== 'false' : true;
  if (enableSlash) {
    editor.use(slash);
  }

  editor
    .use(listener)
    .use(history)
    .use(clipboard)
    .use(diagram)
    .use(mermaidView)
    .use(htmlView)
    .use(prism)
    .use(yamlPlugin)
    .create();

  // Lắng nghe message từ VS Code (Extension Host)
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'update') {
      isUpdatingFromVSCode = true;

      // Xử lý YAML Frontmatter
      const match = message.text.match(frontmatterRegex);
      let markdownToRender = message.text;
      if (match) {
        currentFrontmatter = match[0];
        updateMetadataUI(match[1]);
        markdownToRender = message.text.slice(match[0].length);
      } else {
        currentFrontmatter = '';
        updateMetadataUI('');
      }

      editor.action(replaceAll(markdownToRender));
      updateOutline(markdownToRender);

      if (cmView && isSourceMode) {
        cmView.dispatch({
          changes: { from: 0, to: cmView.state.doc.length, insert: markdownToRender },
        });
      }

      // Đợi Milkdown render xong mới mở khóa
      setTimeout(() => {
        isUpdatingFromVSCode = false;
      }, 50);
    } else if (message.type === 'insertImage') {
      if (message.pastePos !== undefined && message.pastePos >= 0) {
        if (isSourceMode && cmView) {
          cmView.dispatch({
            changes: { from: message.pastePos, insert: `\n![image](${message.url})\n` },
          });
        } else {
          editor.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            view.dispatch(
              view.state.tr.setSelection(TextSelection.create(view.state.doc, message.pastePos)),
            );
          });
          editor.action(insert(`\n![image](${message.url})\n`));
        }
      } else {
        editor.action(insert(`\n![image](${message.url})\n`));
      }
    } else if (message.type === 'insertText') {
      const text = message.text;
      const replaceLastBracket = message.replaceLastBracket;
      if (!isSourceMode) {
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state, dispatch } = view;
          const from = state.selection.from;
          if (replaceLastBracket && from >= 2) {
            const before = state.doc.textBetween(from - 2, from);
            if (before === '[[') {
              dispatch(state.tr.delete(from - 2, from));
              insert(text)(ctx);
              return;
            }
          }
          if (replaceLastBracket) {
            insert(text)(ctx);
          } else {
            dispatch(state.tr.insertText(text));
          }
        });
      } else {
        if (cmView) {
          const { head } = cmView.state.selection.main;
          const from = head;
          if (replaceLastBracket && from >= 2) {
            const before = cmView.state.sliceDoc(from - 2, from);
            if (before === '[[') {
              cmView.dispatch({
                changes: { from: from - 2, to: from, insert: text },
                selection: { anchor: from - 2 + text.length },
              });
              return;
            }
          }
          cmView.dispatch({
            changes: { from: head, to: head, insert: text },
            selection: { anchor: head + text.length },
          });
        }
      }
    } else if (message.type === 'command') {
      handleVSCodeCommand(message.command);
    }
  });

  function handleVSCodeCommand(command: string) {
    if (!editor) return;

    switch (command) {
      case 'sendToAI':
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state } = view;
          const selectedText = state.doc.textBetween(
            state.selection.from,
            state.selection.to,
            '\n',
          );

          if (selectedText) {
            vscode.postMessage({ type: 'sendToAI', text: selectedText });
          }
        });
        break;
      case 'insertLink':
        editor.action(callCommand(toggleLinkCommand.key));
        break;
      case 'save':
        // The editor provider automatically saves via VS Code's standard system.
        // But if they press Cmd+S when webview is focused, we can let VS Code handle it or just do nothing,
        // because Custom Editor syncs document changes in real time.
        // We can trigger save by posting message if needed.
        vscode.postMessage({ type: 'save' });
        break;
      case 'insertTable':
        editor.action(
          insert(`\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Text     | Text     |\n`),
        );
        break;
      case 'insertHeading1':
        editor.action(callCommand(wrapInHeadingCommand.key, 1));
        break;
      case 'insertHeading2':
        editor.action(callCommand(wrapInHeadingCommand.key, 2));
        break;
      case 'insertHeading3':
        editor.action(callCommand(wrapInHeadingCommand.key, 3));
        break;
      case 'insertHeading4':
        editor.action(callCommand(wrapInHeadingCommand.key, 4));
        break;
      case 'insertHeading5':
        editor.action(callCommand(wrapInHeadingCommand.key, 5));
        break;
      case 'insertHeading6':
        editor.action(callCommand(wrapInHeadingCommand.key, 6));
        break;
      case 'insertCodeBlock':
        editor.action(callCommand(createCodeBlockCommand.key));
        break;
      case 'insertBlockquote':
        editor.action(callCommand(wrapInBlockquoteCommand.key));
        break;
      case 'insertImage':
        editor.action(insert(`\n![image]()\n`));
        break;
      case 'toggleBold':
        editor.action(callCommand(toggleStrongCommand.key));
        break;
      case 'toggleItalic':
        editor.action(callCommand(toggleEmphasisCommand.key));
        break;
    }
  }

  // Hàm thiết lập CodeMirror
  const vsCodeTheme = EditorView.theme(
    {
      '&': {
        color: 'var(--vscode-editor-foreground)',
        backgroundColor: 'var(--vscode-editor-background)',
      },
      '.cm-content': { caretColor: 'var(--vscode-editorCursor-foreground)' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--vscode-editorCursor-foreground)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'var(--vscode-editor.selectionBackground)',
      },
      '.cm-panels': {
        backgroundColor: 'var(--vscode-editorWidget-background)',
        color: 'var(--vscode-editorWidget-foreground)',
      },
      '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--vscode-panel-border)' },
      '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--vscode-panel-border)' },
      '.cm-searchMatch': { backgroundColor: '#72a1ff59', outline: '1px solid #457dff' },
      '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#6199ff2f' },
      '.cm-activeLine': { backgroundColor: 'var(--vscode-editor-lineHighlightBackground)' },
      '.cm-selectionMatch': { backgroundColor: '#aafe661a' },
      '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
        backgroundColor: '#bad0f847',
        outline: '1px solid #515a6b',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--vscode-editorGutter-background)',
        color: 'var(--vscode-editorLineNumber-foreground)',
        border: 'none',
        borderRight: '1px solid var(--vscode-editorGroup-border)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--vscode-editor-lineHighlightBackground)',
        color: 'var(--vscode-editorLineNumber-activeForeground)',
      },
      '.cm-foldPlaceholder': { backgroundColor: 'transparent', border: 'none', color: '#ddd' },
      '.cm-tooltip': {
        border: '1px solid var(--vscode-editorWidget-border)',
        backgroundColor: 'var(--vscode-editorWidget-background)',
      },
      '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
      },
      '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: 'var(--vscode-editorWidget-background)',
        borderBottomColor: 'var(--vscode-editorWidget-background)',
      },
      '.cm-tooltip-autocomplete': {
        '& > ul > li[aria-selected]': {
          backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
          color: 'var(--vscode-list-activeSelectionForeground)',
        },
      },
    },
    { dark: true },
  );

  function initCodeMirror(initialText: string) {
    if (cmView) return;
    const parent = document.getElementById('source-editor');
    if (!parent) return;

    cmView = new EditorView({
      doc: initialText,
      extensions: [
        basicSetup,
        cmMarkdown(),
        vsCodeTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isUpdatingFromVSCode) {
            const text = update.state.doc.toString();
            // Gửi về VS Code
            vscode.postMessage({
              type: 'edit',
              text: text,
            });
            // Cập nhật ngầm Milkdown
            isUpdatingFromVSCode = true;

            const match = text.match(frontmatterRegex);
            let markdownToRender = text;
            if (match) {
              currentFrontmatter = match[0];
              updateMetadataUI(match[1]);
              markdownToRender = text.slice(match[0].length);
            } else {
              currentFrontmatter = '';
              updateMetadataUI('');
            }

            lastMarkdown = markdownToRender;
            editor.action(replaceAll(markdownToRender));
            setTimeout(() => {
              isUpdatingFromVSCode = false;
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

  // Bắt sự kiện Paste Ảnh (Dùng capture: true để chặn ProseMirror nuốt event)
  document.addEventListener(
    'paste',
    (e) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.indexOf('image') !== -1) {
            e.preventDefault();
            e.stopPropagation(); // Chỉ chặn ProseMirror xử lý khi đúng là file ảnh

            let pastePos = -1;
            try {
              if (isSourceMode && cmView) {
                pastePos = cmView.state.selection.main.head;
              } else {
                editor.action((ctx) => {
                  const view = ctx.get(editorViewCtx);
                  pastePos = view.state.selection.from;
                });
              }
            } catch (err: any) {
              vscode.postMessage({ type: 'logError', message: 'pastePos Error: ' + err.message });
            }

            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = (event.target?.result as string).split(',')[1];
              const ext = file.type.split('/')[1] || 'png';
              vscode.postMessage({ type: 'saveImage', data: base64, ext, pastePos });
            };
            reader.readAsDataURL(file);
            return; // Dừng xử lý paste sau khi bắt được ảnh
          }
        }
      }

      // Cố gắng kiểm tra items nếu files không có
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            e.stopPropagation(); // Chỉ chặn ProseMirror xử lý khi đúng là file ảnh

            let pastePos = -1;
            try {
              if (isSourceMode && cmView) {
                pastePos = cmView.state.selection.main.head;
              } else {
                editor.action((ctx) => {
                  const view = ctx.get(editorViewCtx);
                  pastePos = view.state.selection.from;
                });
              }
            } catch (err: any) {
              vscode.postMessage({ type: 'logError', message: 'pastePos Error: ' + err.message });
            }

            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = (event.target?.result as string).split(',')[1];
              const ext = file.type.split('/')[1] || 'png';
              vscode.postMessage({ type: 'saveImage', data: base64, ext, pastePos });
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    },
    true,
  );

  // Phím tắt giờ đây được quản lý qua VS Code keybindings và gửi xuống qua Webview message

  const handleInsertLink = () => {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { state, dispatch } = view;
      const { from, to, empty } = state.selection;

      if (empty) {
        const tr = state.tr.insertText('[]()', from);
        const newPos = from + 3; // Position cursor inside ()
        tr.setSelection(TextSelection.create(tr.doc, newPos));
        dispatch(tr);
      } else {
        const selectedText = state.doc.textBetween(from, to, ' ');
        const replacement = `[${selectedText}]()`;
        const tr = state.tr.insertText(replacement, from, to);
        const newPos = from + selectedText.length + 3; // Position cursor inside ()
        tr.setSelection(TextSelection.create(tr.doc, newPos));
        dispatch(tr);
      }
      view.focus();
    });
  };

  // Toolbar Events
  document.getElementById('btn-undo')?.addEventListener('click', () => {
    editor.action(callCommand(undoCommand.key));
  });
  document.getElementById('btn-redo')?.addEventListener('click', () => {
    editor.action(callCommand(redoCommand.key));
  });

  document.getElementById('heading-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val === '0') {
      editor.action(callCommand(turnIntoTextCommand.key));
    } else if (val) {
      editor.action(callCommand(wrapInHeadingCommand.key, Number(val)));
    }
    (e.target as HTMLSelectElement).value = '0';
  });

  document.getElementById('btn-bold')?.addEventListener('click', () => {
    editor.action(callCommand(toggleStrongCommand.key));
  });
  document.getElementById('btn-italic')?.addEventListener('click', () => {
    editor.action(callCommand(toggleEmphasisCommand.key));
  });
  document.getElementById('btn-strikethrough')?.addEventListener('click', () => {
    editor.action(callCommand(toggleStrikethroughCommand.key));
  });

  document.getElementById('btn-link')?.addEventListener('click', () => {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const state = view.state;
      const { from, to } = state.selection;
      const selectedText = state.doc.textBetween(from, to);

      const tr = state.tr;
      tr.insertText(`[${selectedText}]()`, from, to);
      // Move cursor to inside ()
      tr.setSelection(TextSelection.create(tr.doc, from + selectedText.length + 3));

      view.dispatch(tr);
      view.focus();
    });
  });

  document.getElementById('btn-wikilink')?.addEventListener('click', () => {
    if (!isSourceMode) {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state, dispatch } = view;
        dispatch(state.tr.insertText('[[', state.selection.from));
      });
    } else {
      if (cmView) {
        const { head } = cmView.state.selection.main;
        cmView.dispatch({ changes: { from: head, insert: '[[' }, selection: { anchor: head + 2 } });
      }
    }
    vscode.postMessage({ type: 'searchWikilink' });
  });

  let lastBracketTime = 0;
  document.addEventListener('keydown', (e) => {
    if (e.key === '[') {
      const now = Date.now();
      if (now - lastBracketTime < 500) {
        setTimeout(() => {
          vscode.postMessage({ type: 'searchWikilink' });
        }, 10);
        lastBracketTime = 0;
        return;
      }
      lastBracketTime = now;
    } else {
      lastBracketTime = 0;
    }
  });

  document.getElementById('btn-quote')?.addEventListener('click', () => {
    editor.action(callCommand(wrapInBlockquoteCommand.key));
  });
  document.getElementById('btn-footnote')?.addEventListener('click', () => {
    editor.action((ctx) => insertFootnote(ctx));
  });
  document.getElementById('btn-code')?.addEventListener('click', () => {
    editor.action(callCommand(createCodeBlockCommand.key));
  });
  document.getElementById('btn-bullet')?.addEventListener('click', () => {
    editor.action(callCommand(wrapInBulletListCommand.key));
  });
  document.getElementById('btn-ordered')?.addEventListener('click', () => {
    editor.action(callCommand(wrapInOrderedListCommand.key));
  });
  document.getElementById('btn-task')?.addEventListener('click', () => {
    editor.action((ctx) => {
      callCommand(wrapInBulletListCommand.key)(ctx);
      const view = ctx.get(editorViewCtx);
      view.dispatch(view.state.tr.insertText('[ ] '));
    });
  });

  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    currentZoom += 1;
    document.documentElement.style.setProperty('--editor-zoom-level', `${currentZoom}px`);
  });

  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    if (currentZoom > 10) currentZoom -= 1;
    document.documentElement.style.setProperty('--editor-zoom-level', `${currentZoom}px`);
  });

  document.getElementById('btn-toggle')?.addEventListener('click', () => {
    const editorDiv = document.getElementById('editor');
    const sourceDiv = document.getElementById('source-editor');
    if (!editorDiv || !sourceDiv) return;

    isSourceMode = !isSourceMode;

    if (isSourceMode) {
      // Chuyển sang Source Mode
      editorDiv.style.display = 'none';
      sourceDiv.style.display = 'block';

      const fullText = (currentFrontmatter ? currentFrontmatter : '') + lastMarkdown;
      if (!cmView) {
        initCodeMirror(fullText);
      } else {
        isUpdatingFromVSCode = true;
        cmView.dispatch({
          changes: { from: 0, to: cmView.state.doc.length, insert: fullText },
        });
        setTimeout(() => {
          isUpdatingFromVSCode = false;
        }, 50);
      }
    } else {
      // Chuyển sang WYSIWYG Mode
      sourceDiv.style.display = 'none';
      editorDiv.style.display = 'flex';
    }
  });

  document.getElementById('btn-image')?.addEventListener('click', () => {
    const url = prompt('Enter image URL:');
    if (url !== null) {
      editor.action(insert(`![image](${url})`));
    }
  });

  document.getElementById('btn-toggle')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'toggleEditor' });
  });

  // Dropdown for Admonition
  const admonitionDropdown = document.getElementById('btn-admonition');
  admonitionDropdown?.addEventListener('click', (e) => {
    const content = document.getElementById('admonition-menu');
    if (content) {
      content.style.display = content.style.display === 'block' ? 'none' : 'block';
      e.stopPropagation();
    }
  });

  document.addEventListener('click', () => {
    const content = document.getElementById('admonition-menu');
    if (content) content.style.display = 'none';

    const menu = document.getElementById('table-context-menu');
    if (menu) menu.style.display = 'none';
  });

  document.querySelectorAll('#admonition-menu .dropdown-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const val = (e.target as HTMLElement).getAttribute('data-val');
      if (val) {
        editor.action(insert(`\n> [!${val}]\n> Nội dung...\n\n`));
      }
    });
  });

  // Table Context Menu
  const style = document.createElement('style');
  style.innerHTML = `
.slash-menu {
    background: var(--vscode-dropdown-background);
    color: var(--vscode-dropdown-foreground);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 4px;
    min-width: 200px;
    z-index: 1000;
    font-family: var(--vscode-font-family);
    font-size: 13px;
    display: none;
    position: absolute;
}
.slash-item {
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.slash-item:hover {
    background: var(--vscode-list-hoverBackground);
    color: var(--vscode-list-hoverForeground);
}
.slash-item-icon {
    font-weight: bold;
    opacity: 0.7;
    width: 20px;
}
`;
  document.head.appendChild(style);

  // Chờ DOM tải xong
  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    const table = target.closest('table');
    const menu = document.getElementById('table-context-menu');
    if (menu) {
      if (table) {
        e.preventDefault();
        menu.style.display = 'block';
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
      } else {
        menu.style.display = 'none';
      }
    }
  });

  document.getElementById('ctx-add-row')?.addEventListener('click', () => {
    editor.action(callCommand(addRowAfterCommand.key));
  });
  document.getElementById('ctx-add-col')?.addEventListener('click', () => {
    editor.action(callCommand(addColAfterCommand.key));
  });
  document.getElementById('ctx-del-row')?.addEventListener('click', () => {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      deleteRow(view.state, view.dispatch);
    });
  });
  document.getElementById('ctx-del-col')?.addEventListener('click', () => {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      deleteColumn(view.state, view.dispatch);
    });
  });
  document.getElementById('ctx-del-table')?.addEventListener('click', () => {
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      deleteTable(view.state, view.dispatch);
    });
  });

  // Insert Table Modal Logic
  const tableModal = document.getElementById('table-modal');

  // Xử lý thay đổi Metadata UI
  document.getElementById('metadata-content')?.addEventListener('input', (e) => {
    if (!isUpdatingFromVSCode) {
      const target = e.target as HTMLElement;
      const yaml = target.innerText || '';
      const newFrontmatter = yaml.trim() ? `---\n${yaml.trim()}\n---\n` : '';
      currentFrontmatter = newFrontmatter;
      vscode.postMessage({
        type: 'edit',
        text: newFrontmatter + lastMarkdown,
      });

      if (isSourceMode && cmView) {
        isUpdatingFromVSCode = true;
        const fullText = newFrontmatter + lastMarkdown;
        cmView.dispatch({
          changes: { from: 0, to: cmView.state.doc.length, insert: fullText },
        });
        setTimeout(() => {
          isUpdatingFromVSCode = false;
        }, 50);
      }
    }
  });

  document.getElementById('btn-table')?.addEventListener('click', () => {
    if (tableModal) {
      tableModal.style.display = tableModal.style.display === 'block' ? 'none' : 'block';
    }
  });

  document.getElementById('btn-table-cancel')?.addEventListener('click', () => {
    if (tableModal) tableModal.style.display = 'none';
  });

  document.getElementById('btn-table-confirm')?.addEventListener('click', () => {
    if (tableModal) {
      tableModal.style.display = 'none';

      const rInput = document.getElementById('table-rows') as HTMLInputElement;
      const cInput = document.getElementById('table-cols') as HTMLInputElement;
      const r = parseInt(rInput?.value || '3');
      const c = parseInt(cInput?.value || '3');

      if (r > 0 && c > 0) {
        let tableMd = '\n';
        for (let i = 0; i < c; i++) tableMd += '|   ';
        tableMd += '|\n';
        for (let i = 0; i < c; i++) tableMd += '| --- ';
        tableMd += '|\n';
        for (let i = 0; i < r; i++) {
          for (let j = 0; j < c; j++) tableMd += '|   ';
          tableMd += '|\n';
        }
        editor.action(insert(tableMd + '\n'));
      }
    }
  });
}

initEditor();
