import { $node, $remark } from '@milkdown/utils';
import remarkFrontmatter from 'remark-frontmatter';

// Extract the default export correctly in case esbuild wraps it
const frontmatterPlugin = (remarkFrontmatter as any).default || remarkFrontmatter;

export const yamlRemarkPlugin = $remark('yaml-remark', () => frontmatterPlugin, ['yaml']);

export const yamlNode = $node('yaml', () => ({
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  parseDOM: [{ tag: 'pre[data-type="yaml"]' }],
  toDOM: (node) => {
    return [
      'pre',
      {
        'data-type': 'yaml',
        class: 'yaml-frontmatter',
        style:
          'background-color: var(--vscode-textBlockQuote-background); border-left: 4px solid var(--vscode-textLink-foreground); padding: 8px; margin: 8px 0; font-family: monospace;',
      },
      ['code', 0],
    ];
  },
  parseMarkdown: {
    match: (node) => node.type === 'yaml',
    runner: (state, node, type) => {
      state
        .openNode(type)
        .addText(node.value as string)
        .closeNode();
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'yaml',
    runner: (state, node) => {
      state.addNode('yaml', undefined, node.textContent || '');
    },
  },
}));

export const yamlPlugin = [yamlRemarkPlugin, yamlNode];
