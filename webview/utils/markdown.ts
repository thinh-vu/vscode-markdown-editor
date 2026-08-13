import { editorViewCtx, parserCtx } from '@milkdown/core';
import { state } from '../state';

export const insertFootnote = (ctx: any) => {
  if (!state.isSourceMode) {
    const view = ctx.get(editorViewCtx);
    const parser = ctx.get(parserCtx);
    const { state: pmState, dispatch } = view;
    const fullText = pmState.doc.textBetween(0, pmState.doc.content.size);
    const matches = [...fullText.matchAll(/\[\^(\d+)\]/g)];
    let nextNum = 1;
    if (matches.length > 0) {
      const nums = matches.map((m) => parseInt(m[1])).filter((n) => !isNaN(n));
      if (nums.length > 0) nextNum = Math.max(...nums) + 1;
    }

    let tr = pmState.tr;
    tr = tr.insertText(`[^${nextNum}]`);

    const lastPart = fullText.slice(-200);
    const hasDivider = lastPart.includes('---');
    const def = hasDivider ? `\n[^${nextNum}]: ` : `\n\n---\n[^${nextNum}]: `;

    const doc = parser(def);
    const slice = doc.slice(0, doc.content.size);
    tr = tr.insert(tr.doc.content.size, slice.content);

    dispatch(tr);
  } else {
    if (state.cmView) {
      const fullText = state.cmView.state.doc.toString();
      const matches = [...fullText.matchAll(/\[\^(\d+)\]/g)];
      let nextNum = 1;
      if (matches.length > 0) {
        const nums = matches.map((m) => parseInt(m[1])).filter((n) => !isNaN(n));
        if (nums.length > 0) nextNum = Math.max(...nums) + 1;
      }

      const { head } = state.cmView.state.selection.main;
      const ref = `[^${nextNum}]`;

      const lastPart = fullText.slice(-200);
      const hasDivider = lastPart.includes('---');
      const def = hasDivider ? `\n[^${nextNum}]: ` : `\n\n---\n[^${nextNum}]: `;

      state.cmView.dispatch({
        changes: [
          { from: head, insert: ref },
          { from: state.cmView.state.doc.length, insert: def },
        ],
        selection: { anchor: head + ref.length },
      });
    }
  }
};
