import * as vscode from 'vscode';
import { NoteManager } from './noteManager';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'markdownLive.fileBrowser';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'newNote': {
          await NoteManager.createNewNote();
          this.refresh();
          break;
        }
        case 'newNoteFromTemplate': {
          await NoteManager.createNewNoteFromTemplate();
          this.refresh();
          break;
        }
        case 'openFile': {
          const uri = vscode.Uri.parse(data.value);
          await vscode.commands.executeCommand('vscode.openWith', uri, 'markdownLive.editor');
          break;
        }
      }
    });

    this.refresh();
  }

  public refresh() {
    if (this._view) {
      this._updateContent();
    }
  }

  private async _updateContent() {
    if (!this._view) return;

    const config = vscode.workspace.getConfiguration('markdownLive');
    const scanDir = config.get<string>('sidebarScanDirectory', '');

    let files: vscode.Uri[] = [];
    
    if (scanDir && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      const folder = vscode.workspace.workspaceFolders[0];
      const pattern = new vscode.RelativePattern(folder, `${scanDir}/**/*.md`);
      files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    } else {
      files = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
    }
    
    const fileStats = await Promise.all(
      files.map(async (uri) => {
        try {
          const stat = await vscode.workspace.fs.stat(uri);
          return { uri, stat };
        } catch {
          return { uri, stat: { mtime: 0 } as unknown as vscode.FileStat };
        }
      })
    );

    // Create two sorted arrays
    const recentFiles = [...fileStats].sort((a, b) => b.stat.mtime - a.stat.mtime);
    const vaultFiles = [...fileStats].sort((a, b) => a.uri.fsPath.localeCompare(b.uri.fsPath));

    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const generateHtmlList = async (filesList: typeof fileStats) => {
      let htmlList = '';
      for (const { uri } of filesList) {
        try {
          const contentUint8 = await vscode.workspace.fs.readFile(uri);
          const content = new TextDecoder().decode(contentUint8);
          
          let title = uri.path.split('/').pop()?.replace(/\.md$/i, '') || 'Untitled';
          const titleMatch = content.match(/^#\s+(.+)$/m);
          if (titleMatch) {
            title = titleMatch[1].trim();
          }

          let thumbnailHtml = '';
          const imgMatch = content.match(/!\[.*?\]\((.+?)\)/);
          if (imgMatch) {
            let imgPath = imgMatch[1];
            const config = vscode.workspace.getConfiguration('markdownLive');
            const imagePublicPath = config.get<string>('imagePublicPath', '');
            
            let imgUri: vscode.Uri | undefined;
            if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
              thumbnailHtml = `<img src="${escapeHtml(imgPath)}" class="note-thumbnail" onerror="this.style.display='none'" onload="if(this.naturalWidth<20)this.style.display='none'">`;
            } else {
              const workspaceFolders = vscode.workspace.workspaceFolders;
              if (workspaceFolders && workspaceFolders.length > 0) {
                const rootUri = workspaceFolders[0].uri;
                if (imgPath.startsWith('/')) {
                  if (imagePublicPath) {
                    imgUri = vscode.Uri.joinPath(rootUri, imagePublicPath, imgPath.slice(1));
                  } else {
                    imgUri = vscode.Uri.joinPath(rootUri, imgPath.slice(1));
                  }
                } else {
                  const dir = vscode.Uri.joinPath(uri, '..');
                  imgUri = vscode.Uri.joinPath(dir, imgPath);
                }
                
                if (imgUri && this._view) {
                  const webviewImgUri = this._view.webview.asWebviewUri(imgUri);
                  thumbnailHtml = `<img src="${webviewImgUri}" class="note-thumbnail" onerror="this.style.display='none'" onload="if(this.naturalWidth<20)this.style.display='none'">`;
                }
              }
            }
          }

          let cleanContent = content.replace(/^---[\s\S]+?---/, '');
          cleanContent = cleanContent.replace(/#+\s+.+/g, '');
          cleanContent = cleanContent.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
          cleanContent = cleanContent.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
          cleanContent = cleanContent.replace(/[*_~`>]/g, '');
          cleanContent = cleanContent.replace(/\s+/g, ' ').trim();

          const preview = cleanContent.substring(0, 100) + (cleanContent.length > 100 ? '...' : '');

          htmlList += `
            <div class="note-item" onclick="openFile('${uri.toString()}')">
              <div class="note-content">
                <div class="note-title">${escapeHtml(title)}</div>
                <div class="note-preview">${preview ? escapeHtml(preview) : '<em>Empty note</em>'}</div>
              </div>
              ${thumbnailHtml}
            </div>
          `;
        } catch (err) {
          console.error('Failed to read file:', uri.fsPath, err);
        }
      }
      return htmlList === '' ? '<div class="empty-state">No markdown files found.</div>' : htmlList;
    };

    const recentHtml = await generateHtmlList(recentFiles);
    const vaultHtml = await generateHtmlList(vaultFiles);

    this._view.webview.postMessage({ type: 'updateList', recentHtml, vaultHtml });
  }

  private _getHtmlForWebview() {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notes</title>
        <style>
          body {
            padding: 10px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-sideBar-background);
          }
          .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
          }
          .tab {
            padding: 6px 12px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--vscode-descriptionForeground);
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
          }
          .tab:hover {
            color: var(--vscode-foreground);
          }
          .tab.active {
            color: var(--vscode-foreground);
            border-bottom-color: var(--vscode-activityBar-activeBorder);
          }
          .notes-container {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .note-item {
            padding: 10px;
            background-color: var(--vscode-list-inactiveSelectionBackground);
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.1s, transform 0.1s;
            border: 1px solid transparent;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
          }
          .note-content {
            flex: 1;
            min-width: 0;
          }
          .note-thumbnail {
            width: 48px;
            height: 48px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
            flex-shrink: 0;
            background-color: var(--vscode-editor-background);
          }
          .note-item:hover {
            background-color: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-list-focusOutline);
          }
          .note-title {
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 4px;
            color: var(--vscode-list-activeSelectionForeground);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .note-preview {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .empty-state {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
          }
        </style>
      </head>
      <body>
        
        <div class="tabs">
          <div class="tab active" id="tab-recent" onclick="switchTab('recent')">Recent Files</div>
          <div class="tab" id="tab-vault" onclick="switchTab('vault')">Vault Files</div>
        </div>

        <div class="notes-container" id="notes-recent">
          <div class="empty-state">Loading notes...</div>
        </div>
        <div class="notes-container" id="notes-vault" style="display: none;">
          <div class="empty-state">Loading notes...</div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          const notesVault = document.getElementById('notes-vault');
          const notesRecent = document.getElementById('notes-recent');
          const tabVault = document.getElementById('tab-vault');
          const tabRecent = document.getElementById('tab-recent');

          let currentTab = 'recent';

          function switchTab(tab) {
            currentTab = tab;
            if (tab === 'vault') {
              tabVault.classList.add('active');
              tabRecent.classList.remove('active');
              notesVault.style.display = 'flex';
              notesRecent.style.display = 'none';
            } else {
              tabRecent.classList.add('active');
              tabVault.classList.remove('active');
              notesRecent.style.display = 'flex';
              notesVault.style.display = 'none';
            }
          }

          function openFile(path) {
            vscode.postMessage({ type: 'openFile', value: path });
          }

          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'updateList') {
              notesVault.innerHTML = message.vaultHtml;
              notesRecent.innerHTML = message.recentHtml;
            }
          });
        </script>
      </body>
      </html>`;
  }
}
