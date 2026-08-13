import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';

export const admonitionPlugin = new Plugin({
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
              note: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-notepad-text"><path d="M8 2v4"/><path d="M12 2v4"/><path d="M16 2v4"/><rect width="16" height="18" x="4" y="4" rx="2"/><path d="M8 10h6"/><path d="M8 14h8"/><path d="M8 18h5"/></svg>',
              warning: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
              tip: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
              important: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge-alert"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
              caution: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-octagon-alert"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
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
