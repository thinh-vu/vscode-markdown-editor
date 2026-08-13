import { $view } from '@milkdown/utils';
import { htmlSchema } from '@milkdown/preset-commonmark';
import { diagramSchema } from '@milkdown/plugin-diagram';
import mermaid from 'mermaid';

export const htmlView = $view(htmlSchema.node, () => (node, view, getPos) => {
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
    stopEvent: (event) => {
      // Allow native interaction (like clicking summary to expand details)
      return event.type === 'mousedown' || event.type === 'click';
    },
    ignoreMutation: () => {
      // Prevent ProseMirror from undoing the 'open' attribute added to <details> by the browser
      return true;
    }
  };
});

mermaid.initialize({ startOnLoad: false, theme: 'default' });

export const mermaidView = $view(diagramSchema.node, () => (node, view, getPos) => {
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
