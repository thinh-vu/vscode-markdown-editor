import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewCtx,
  prosePluginsCtx,
} from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll, callCommand, insert } from '@milkdown/utils';
import { math } from '@milkdown/plugin-math';
import { history } from '@milkdown/plugin-history';
import {
  wrapInHeadingCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand,
  createCodeBlockCommand,
} from '@milkdown/preset-commonmark';
import { clipboard } from '@milkdown/plugin-clipboard';
import { diagram } from '@milkdown/plugin-diagram';
import { prism } from '@milkdown/plugin-prism';
import { slashFactory, SlashProvider } from '@milkdown/plugin-slash';
import { Plugin, PluginKey } from '@milkdown/prose/state';

import { state, vscode } from '../state';
import { htmlView, mermaidView } from '../plugins/customViews';
import { admonitionPlugin } from '../plugins/admonition';
import { updateOutline } from '../ui/outline';
import { updateMetadataUI, frontmatterRegex } from '../ui/metadata';
import { insertFootnote } from '../utils/markdown';
import { yamlPlugin } from '../yamlPlugin';
import { hashtagPlugin } from '../plugins/hashtag';
import { imagePastePlugin } from '../plugins/imagePaste';

const slash = slashFactory('my-slash');

export async function initMilkdown(initialText: string) {
  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, document.querySelector('#editor'));
      ctx.set(defaultValueCtx, initialText);

      ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
        if (!state.isUpdatingFromVSCode) {
          updateOutline(markdown);
          const match = markdown.match(frontmatterRegex);
          let markdownToRender = markdown;
          if (match) {
            state.currentFrontmatter = match[0];
            updateMetadataUI(match[1]);
            markdownToRender = markdown.slice(match[0].length);
            
            // Remove frontmatter from Milkdown if it was just typed/inserted
            setTimeout(() => {
              if (state.editor) {
                state.isUpdatingFromVSCode = true;
                state.editor.action(replaceAll(markdownToRender));
                setTimeout(() => {
                  state.isUpdatingFromVSCode = false;
                }, 50);
              }
            }, 0);
          }
          state.lastMarkdown = markdownToRender;

          if (vscode) {
            vscode.postMessage({
              type: 'edit',
              text: state.currentFrontmatter + state.lastMarkdown,
            });
          }
        }
      });
      ctx.get(listenerCtx).mounted((ctx) => {
        state.isUpdatingFromVSCode = false;
        updateOutline(initialText);
      });

      // Slash provider setup
      const content = document.createElement('div');
      content.className = 'slash-provider';
      content.innerHTML = `
          <div class="slash-item" data-action="h1"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg></span>Heading 1</div>
          <div class="slash-item" data-action="h2"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-2.75 4-4.25 4-6.25a1.5 1.5 0 0 0-3-0.5"/></svg></span>Heading 2</div>
          <div class="slash-item" data-action="h3"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .5 4-1.5a2 2 0 0 0-2-2"/></svg></span>Heading 3</div>
          <div class="slash-item" data-action="ul"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg></span>Bullet List</div>
          <div class="slash-item" data-action="ol"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg></span>Ordered List</div>
          <div class="slash-item" data-action="task"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg></span>Task List</div>
          <div class="slash-item" data-action="quote"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg></span>Quote</div>
          <div class="slash-item" data-action="code"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></span>Code Block</div>
          <div class="slash-item" data-action="table"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="3" y2="21"/><line x1="15" x2="15" y1="3" y2="21"/></svg></span>Table</div>
          <div class="slash-item" data-action="image"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></span>Image</div>
          <div class="slash-item" data-action="yaml"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg></span>YAML Frontmatter</div>
          <div class="slash-item" data-action="footnote"><span class="slash-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 19 8-8" /><path d="m12 19-8-8" /><path d="M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06" /></svg></span>Footnote</div>
      `;
      const provider = new SlashProvider({
        content,
        trigger: '/',
        shouldShow: (view) => {
          const contentStr = provider.getContent(view);
          if (!contentStr) return false;
          // Show slash menu if text ends with / followed by any non-space characters
          return /\/[^\s/]*$/.test(contentStr);
        }
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
          const editorView = ctx.get(editorViewCtx);
          const { state: pmState, dispatch } = editorView;
          const { tr, selection } = pmState;
          
          const contentStr = provider.getContent(editorView);
          if (contentStr) {
            const match = contentStr.match(/(\/[^\s/]*)$/);
            if (match) {
              dispatch(tr.delete(selection.from - match[1].length, selection.from));
            } else {
              dispatch(tr.delete(selection.from - 1, selection.from));
            }
          } else {
            dispatch(tr.delete(selection.from - 1, selection.from));
          }
          
          provider.hide();

          switch (action) {
            case 'h1': callCommand(wrapInHeadingCommand.key, 1)(ctx); break;
            case 'h2': callCommand(wrapInHeadingCommand.key, 2)(ctx); break;
            case 'h3': callCommand(wrapInHeadingCommand.key, 3)(ctx); break;
            case 'ul': callCommand(wrapInBulletListCommand.key)(ctx); break;
            case 'ol': callCommand(wrapInOrderedListCommand.key)(ctx); break;
            case 'task':
              callCommand(wrapInBulletListCommand.key)(ctx);
              ctx.get(editorViewCtx).dispatch(ctx.get(editorViewCtx).state.tr.insertText('[ ] '));
              break;
            case 'quote': callCommand(wrapInBlockquoteCommand.key)(ctx); break;
            case 'code': callCommand(createCodeBlockCommand.key)(ctx); break;
            case 'table':
              insert('\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Text     | Text     |\n')(ctx);
              break;
            case 'image': insert('\n![image]()\n')(ctx); break;
            case 'yaml': insert('---\ntitle: Untitled\n---\n\n')(ctx); break;
            case 'footnote': insertFootnote(ctx); break;
          }
        }
      });

      const slashPlugin = new Plugin({
        key: new PluginKey('MILKDOWN_SLASH'),
        view: (editorView) => {
          return {
            update: (updatedView: any, prevState: any) => {
              provider.update(updatedView, prevState);
              
              const contentStr = provider.getContent(updatedView);
              if (contentStr) {
                const match = contentStr.match(/\/([^\s/]*)$/);
                if (match) {
                  const search = match[1].toLowerCase();
                  const items = content.querySelectorAll('.slash-item');
                  let hasVisible = false;
                  items.forEach((item) => {
                    const text = item.textContent?.toLowerCase() || '';
                    if (text.includes(search)) {
                      (item as HTMLElement).style.display = 'block';
                      hasVisible = true;
                    } else {
                      (item as HTMLElement).style.display = 'none';
                    }
                  });
                  if (!hasVisible) {
                    provider.hide();
                  }
                }
              }
            },
            destroy: () => {
              provider.destroy();
              content.remove();
            },
          };
        }
      });

      ctx.update(prosePluginsCtx, (prev) => [...prev, admonitionPlugin, hashtagPlugin, slashPlugin, imagePastePlugin]);
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
    .use(math)
    .use(htmlView)
    .use(prism)
    .use(yamlPlugin);

  state.editor = await editor.create();
}
