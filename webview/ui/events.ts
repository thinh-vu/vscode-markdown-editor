import { callCommand, insert } from '@milkdown/utils';
import {
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  createCodeBlockCommand,
} from '@milkdown/preset-commonmark';
import { addRowAfterCommand, addColAfterCommand } from '@milkdown/preset-gfm';
import { deleteRow, deleteColumn, deleteTable } from '@milkdown/prose/tables';
import { editorViewCtx } from '@milkdown/core';
import { state, vscode } from '../state';
import { initCodeMirror } from '../editor/codemirror';
import { updateMetadataUI } from './metadata';

let targetImage: HTMLImageElement | null = null;

export function setupUIEvents() {
  setupImageObserver();
  setupToolbarEvents();
  setupContextMenuEvents();
  setupTableModalEvents();
  setupOtherEvents();
}

function setupImageObserver() {
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
                const prefix = state.publicPathPrefix
                  ? state.publicPathPrefix.startsWith('/')
                    ? state.publicPathPrefix
                    : '/' + state.publicPathPrefix
                  : '';
                img.setAttribute('data-raw-src', originalSrc);
                if (state.workspaceRoot) {
                  img.src = state.workspaceRoot + prefix + originalSrc;
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
          const prefix = state.publicPathPrefix
            ? state.publicPathPrefix.startsWith('/')
              ? state.publicPathPrefix
              : '/' + state.publicPathPrefix
            : '';
          if (
            !img.hasAttribute('data-raw-src') ||
            img.getAttribute('data-raw-src') !== originalSrc
          ) {
            img.setAttribute('data-raw-src', originalSrc);
            if (state.workspaceRoot) {
              img.src = state.workspaceRoot + prefix + originalSrc;
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

  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      e.preventDefault();
      targetImage = target as HTMLImageElement;
      const imageMenu = document.getElementById('image-context-menu');
      if (imageMenu) {
        imageMenu.style.display = 'block';
        imageMenu.style.left = `${e.pageX}px`;
        imageMenu.style.top = `${e.pageY}px`;
      }
    }
  });
}

function setupToolbarEvents() {
  document.getElementById('btn-code')?.addEventListener('click', () => {
    if (state.editor) state.editor.action(callCommand(createCodeBlockCommand.key));
  });
  document.getElementById('btn-bullet')?.addEventListener('click', () => {
    if (state.editor) state.editor.action(callCommand(wrapInBulletListCommand.key));
  });
  document.getElementById('btn-ordered')?.addEventListener('click', () => {
    if (state.editor) state.editor.action(callCommand(wrapInOrderedListCommand.key));
  });
  document.getElementById('btn-task')?.addEventListener('click', () => {
    if (state.editor) {
      state.editor.action((ctx) => {
        callCommand(wrapInBulletListCommand.key)(ctx);
        const view = ctx.get(editorViewCtx);
        view.dispatch(view.state.tr.insertText('[ ] '));
      });
    }
  });

  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    state.currentZoom += 1;
    document.documentElement.style.setProperty('--editor-zoom-level', `${state.currentZoom}px`);
  });

  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    if (state.currentZoom > 10) state.currentZoom -= 1;
    document.documentElement.style.setProperty('--editor-zoom-level', `${state.currentZoom}px`);
  });

  document.getElementById('btn-toggle')?.addEventListener('click', () => {
    const editorDiv = document.getElementById('editor');
    const sourceDiv = document.getElementById('source-editor');
    if (!editorDiv || !sourceDiv) return;

    state.isSourceMode = !state.isSourceMode;

    if (state.isSourceMode) {
      editorDiv.style.display = 'none';
      sourceDiv.style.display = 'block';

      const fullText = (state.currentFrontmatter ? state.currentFrontmatter : '') + state.lastMarkdown;
      if (!state.cmView) {
        initCodeMirror(fullText);
      } else {
        state.isUpdatingFromVSCode = true;
        state.cmView.dispatch({
          changes: { from: 0, to: state.cmView.state.doc.length, insert: fullText },
        });
        setTimeout(() => {
          state.isUpdatingFromVSCode = false;
        }, 50);
      }
    } else {
      sourceDiv.style.display = 'none';
      editorDiv.style.display = 'flex';
    }
    
    if (vscode) {
      vscode.postMessage({ type: 'toggleEditor' });
    }
  });

  document.getElementById('btn-image')?.addEventListener('click', () => {
    const url = prompt('Enter image URL:');
    if (url !== null && state.editor) {
      state.editor.action(insert(`![image](${url})`));
    }
  });

  document.getElementById('btn-toc')?.addEventListener('click', () => {
    if (vscode) {
      vscode.postMessage({ type: 'insertTOC' });
    }
  });

  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    if (vscode) {
      vscode.postMessage({ type: 'showInfo', message: 'Preparing PDF export...' });
      const htmlContent = document.documentElement.outerHTML;
      vscode.postMessage({ type: 'exportPdf', html: htmlContent });
    }
  });

  document.getElementById('btn-copy')?.addEventListener('click', async () => {
    try {
      const editorDiv = document.querySelector('.milkdown .editor') as HTMLElement;
      if (!editorDiv) return;
      const html = editorDiv.innerHTML;
      const text = editorDiv.innerText;
      
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([text], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
      
      const btn = document.getElementById('btn-copy');
      if (btn) {
        const origColor = btn.style.color;
        btn.style.color = 'var(--vscode-testing-iconPassed)';
        setTimeout(() => { btn.style.color = origColor; }, 1000);
      }
    } catch(err: any) {
      console.error(err);
      if (vscode) vscode.postMessage({ type: 'logError', message: 'Failed to copy rich text: ' + err.message });
    }
  });
}

function setupContextMenuEvents() {
  document.addEventListener('click', () => {
    const menu = document.getElementById('table-context-menu');
    const textMenu = document.getElementById('text-context-menu');
    const imageMenu = document.getElementById('image-context-menu');
    if (menu) menu.style.display = 'none';
    if (textMenu) textMenu.style.display = 'none';
    if (imageMenu) imageMenu.style.display = 'none';
  });

  document.querySelectorAll('#admonition-menu .dropdown-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const val = (e.target as HTMLElement).getAttribute('data-val');
      if (val && state.editor) {
        state.editor.action(insert(`\n> [!${val}]\n> Nội dung...\n\n`));
      }
    });
  });

  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') return; // Handled by image observer

    const table = target.closest('table');
    const menu = document.getElementById('table-context-menu');
    const textMenu = document.getElementById('text-context-menu');

    if (menu) menu.style.display = 'none';
    if (textMenu) textMenu.style.display = 'none';

    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      e.preventDefault();
      if (textMenu) {
        textMenu.style.display = 'block';
        textMenu.style.left = `${e.pageX}px`;
        textMenu.style.top = `${e.pageY}px`;
      }
    } else if (table) {
      e.preventDefault();
      if (menu) {
        menu.style.display = 'block';
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
      }
    }
  });

  document.getElementById('ctx-send-to-ai')?.addEventListener('click', () => {
    import('../communication').then(({ handleVSCodeCommand }) => {
      handleVSCodeCommand('sendToAI');
    });
  });

  document.getElementById('ctx-img-rename')?.addEventListener('click', () => {
    if (targetImage && vscode) {
      const rawSrc = targetImage.getAttribute('data-raw-src') || targetImage.getAttribute('src');
      vscode.postMessage({
        type: 'renameImage',
        src: rawSrc,
      });
      targetImage = null;
    }
  });

  document.getElementById('ctx-img-reveal')?.addEventListener('click', () => {
    if (targetImage && vscode) {
      const rawSrc = targetImage.getAttribute('data-raw-src') || targetImage.getAttribute('src');
      vscode.postMessage({
        type: 'revealImage',
        src: rawSrc,
      });
      targetImage = null;
    }
  });

  document.getElementById('ctx-add-row')?.addEventListener('click', () => {
    if (state.editor) state.editor.action(callCommand(addRowAfterCommand.key));
  });
  document.getElementById('ctx-add-col')?.addEventListener('click', () => {
    if (state.editor) state.editor.action(callCommand(addColAfterCommand.key));
  });
  document.getElementById('ctx-del-row')?.addEventListener('click', () => {
    if (state.editor) {
      state.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        deleteRow(view.state, view.dispatch);
      });
    }
  });
  document.getElementById('ctx-del-col')?.addEventListener('click', () => {
    if (state.editor) {
      state.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        deleteColumn(view.state, view.dispatch);
      });
    }
  });
  document.getElementById('ctx-del-table')?.addEventListener('click', () => {
    if (state.editor) {
      state.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        deleteTable(view.state, view.dispatch);
      });
    }
  });
}

function setupTableModalEvents() {
  const tableModal = document.getElementById('table-modal');

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

      if (r > 0 && c > 0 && state.editor) {
        let tableMd = '\n';
        for (let i = 0; i < c; i++) tableMd += '|   ';
        tableMd += '|\n';
        for (let i = 0; i < c; i++) tableMd += '| --- ';
        tableMd += '|\n';
        for (let i = 0; i < r; i++) {
          for (let j = 0; j < c; j++) tableMd += '|   ';
          tableMd += '|\n';
        }
        state.editor.action(insert(tableMd + '\n'));
      }
    }
  });
}

function setupOtherEvents() {
  document.getElementById('metadata-content')?.addEventListener('input', (e) => {
    if (!state.isUpdatingFromVSCode) {
      const target = e.target as HTMLElement;
      const yaml = target.innerText || '';
      const newFrontmatter = yaml.trim() ? `---\n${yaml.trim()}\n---\n` : '';
      state.currentFrontmatter = newFrontmatter;
      if (vscode) {
        vscode.postMessage({
          type: 'edit',
          text: newFrontmatter + state.lastMarkdown,
        });
      }

      if (state.isSourceMode && state.cmView) {
        state.isUpdatingFromVSCode = true;
        const fullText = newFrontmatter + state.lastMarkdown;
        state.cmView.dispatch({
          changes: { from: 0, to: state.cmView.state.doc.length, insert: fullText },
        });
        setTimeout(() => {
          state.isUpdatingFromVSCode = false;
        }, 50);
      }
    }
  });
}
