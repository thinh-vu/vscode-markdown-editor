export function updateOutline(markdown: string) {
  const container = document.getElementById('flyout-container');
  if (!container) return;

  // Chỉ quét heading từ H1 đến H4 theo yêu cầu
  const regex = /^(#{1,4})\s+(.+)$/gm;
  let match;
  let html = '';

  let count = 0;
  while ((match = regex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const safeText = text.replace(/"/g, '&quot;');

    html += `
            <div class="outline-item outline-h${level}" data-text="${safeText}" title="${safeText}">
                <span class="outline-dash"></span>
                <span class="outline-text">${text}</span>
            </div>
        `;
    count++;
  }

  if (count === 0) {
    html = `<div style="color:red; font-size: 11px; white-space: normal; padding: 10px;">No headings found in ${markdown.length} chars.<br/>Preview:<br/>${markdown.substring(0, 50).replace(/</g, '&lt;')}</div>`;
  }

  container.innerHTML = html;

  const items = container.querySelectorAll('.outline-item');
  items.forEach((item) => {
    item.addEventListener('click', () => {
      const text = item.getAttribute('data-text');
      if (text) {
        const unescapedText = text.replace(/&quot;/g, '"');
        const headings = document.querySelectorAll(
          '.milkdown h1, .milkdown h2, .milkdown h3, .milkdown h4',
        );
        for (let i = 0; i < headings.length; i++) {
          if (headings[i].textContent?.includes(unescapedText)) {
            headings[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
            break;
          }
        }
      }
    });
  });
}
