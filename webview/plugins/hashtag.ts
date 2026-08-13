import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';

export const hashtagPlugin = new Plugin({
  key: new PluginKey('hashtag'),
  props: {
    decorations(state) {
      const decorations: Decoration[] = [];
      // Match hashtags like #tag, #multi-word-tag
      const HASHTAG_REGEX = /(?:^|\s)(#[a-zA-Z0-9_-]+)/g;

      state.doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          let match;
          while ((match = HASHTAG_REGEX.exec(node.text)) !== null) {
            // match[1] is the actual hashtag. 
            // match[0] could include a leading whitespace.
            const startPos = pos + match.index + (match[0].length - match[1].length);
            const endPos = startPos + match[1].length;

            decorations.push(
              Decoration.inline(startPos, endPos, {
                class: 'hashtag',
              })
            );
          }
        }
      });

      return DecorationSet.create(state.doc, decorations);
    },
  },
});
