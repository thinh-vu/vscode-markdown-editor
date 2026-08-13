
import 'katex/dist/katex.min.css';
import '@milkdown/theme-nord/style.css';
import '@milkdown/prose/view/style/prosemirror.css';
import 'prism-themes/themes/prism-nord.css';
import './ui/style.css';

import { initMilkdown } from './editor/milkdown';
import { setupMessageListener } from './communication';
import { setupUIEvents } from './ui/events';
import { vscode } from './state';

function initWebview() {
  window.addEventListener('error', (event) => {
    console.error('Webview Error:', event.error);
    if (vscode) {
      vscode.postMessage({
        type: 'logError',
        message: event.error?.message || event.message || 'Unknown error',
      });
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Webview Promise Rejection:', event.reason);
    if (vscode) {
      vscode.postMessage({
        type: 'logError',
        message: event.reason?.message || String(event.reason) || 'Unknown promise rejection',
      });
    }
  });

  // Load configuration and indicate readiness
  if (vscode) {
    vscode.postMessage({ type: 'ready' });
  }

  // Khởi tạo Milkdown
  initMilkdown('');

  // Lắng nghe messages từ extension
  setupMessageListener();

  // Đăng ký toàn bộ event listeners cho UI
  setupUIEvents();
  
  // Inject Slash Menu styles since it's dynamically created
  const style = document.createElement('style');
  style.innerHTML = `
  .slash-menu {
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 4px;
      min-width: 200px;
      z-index: 1000;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      display: none;
      position: absolute;
  }
  .slash-item {
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
  }
  .slash-item:hover {
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-list-hoverForeground);
  }
  .slash-item-icon {
      font-weight: bold;
      opacity: 0.7;
      width: 20px;
  }
  `;
  document.head.appendChild(style);
}

initWebview();
