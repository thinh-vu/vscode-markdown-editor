import { Plugin, PluginKey } from '@milkdown/prose/state';
import { vscode } from '../state';

export const imagePastePlugin = new Plugin({
  key: new PluginKey('IMAGE_PASTE'),
  props: {
    handlePaste: (view, event, slice) => {
      const items = event.clipboardData?.items;
      if (!items) return false;
      let handled = false;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                const parts = result.split(',');
                const data = parts[1];
                const ext = file.name ? file.name.split('.').pop() : item.type.split('/')[1] || 'png';
                if (vscode) {
                  vscode.postMessage({
                    type: 'saveImage',
                    data: data,
                    ext: ext,
                    pastePos: view.state.selection.from,
                  });
                }
              }
            };
            reader.readAsDataURL(file);
            handled = true;
          }
        }
      }
      return handled;
    },
    handleDrop: (view, event, slice, moved) => {
      const items = event.dataTransfer?.items;
      if (!items) return false;
      let handled = false;
      
      const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
      const dropPos = pos ? pos.pos : view.state.selection.from;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                const parts = result.split(',');
                const data = parts[1];
                const ext = file.name ? file.name.split('.').pop() : item.type.split('/')[1] || 'png';
                if (vscode) {
                  vscode.postMessage({
                    type: 'saveImage',
                    data: data,
                    ext: ext,
                    pastePos: dropPos,
                  });
                }
              }
            };
            reader.readAsDataURL(file);
            handled = true;
          }
        }
      }
      return handled;
    }
  }
});
