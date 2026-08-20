import type { EditorView } from 'codemirror';
import type { Editor } from '@milkdown/core';

// Declare VS Code API so TypeScript doesn't complain
declare function acquireVsCodeApi(): any;

export const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;

export const state = {
    isUpdatingFromVSCode: false,
    isSourceMode: false,
    cmView: null as EditorView | null,
    editor: null as Editor | null,
    currentZoom: 14,
    lastMarkdown: '',
    currentFrontmatter: '',
    publicPathPrefix: '',
    workspaceRoot: '',
    configLang: 'en'
};

const langMeta = document.querySelector('meta[name="config-lang"]');
if (langMeta) {
    state.configLang = langMeta.getAttribute('content') || 'en';
}
