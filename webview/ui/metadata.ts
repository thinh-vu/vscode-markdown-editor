export const frontmatterRegex = /^\s*---[\s]*\r?\n([\s\S]*?)\r?\n---[\s]*(?:\r?\n|$)/;

export function updateMetadataUI(content: string) {
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
