import { getHtmlForWebview } from './webview/template';
import { handleWebviewMessage } from './handlers/messageHandler';
import * as vscode from 'vscode';

export class MarkdownLiveProvider implements vscode.CustomTextEditorProvider {
  public static currentPanel: vscode.WebviewPanel | undefined;
  public static currentDocument: vscode.TextDocument | undefined;
  public static openPanels: { panel: vscode.WebviewPanel, document: vscode.TextDocument }[] = [];

  public static postCommandToActiveWebview(command: string) {
    if (MarkdownLiveProvider.currentPanel) {
      MarkdownLiveProvider.currentPanel.webview.postMessage({ type: 'command', command });
    }
  }

  public static insertTextToActiveWebview(text: string) {
    if (MarkdownLiveProvider.currentPanel) {
      MarkdownLiveProvider.currentPanel.webview.postMessage({ type: 'insertText', text });
    } else if (vscode.window.activeTextEditor) {
      const editor = vscode.window.activeTextEditor;
      editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, text);
      });
    } else {
      vscode.window.showWarningMessage('No active Markdown Live Editor found to insert template.');
    }
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownLiveProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      MarkdownLiveProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
      },
    );

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('markdownLive')) {
        for (const { panel, document } of MarkdownLiveProvider.openPanels) {
          panel.webview.html = getHtmlForWebview(panel.webview, document, context);
        }
      }
    }));

    return providerRegistration;
  }

  private static readonly viewType = 'markdownLive.editor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public isUpdatingFromWebview = false;

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {

    // Hack: VS Code Custom Editors do not support split diff views natively.
    // If we detect this document is opened inside a Diff Editor, we render a fallback UI.
    let isDiffEditor = document.uri.scheme === 'git';
    let diffTab: vscode.Tab | undefined;
    if (!isDiffEditor) {
      for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
          if (tab.input instanceof vscode.TabInputTextDiff) {
            if (tab.input.original.toString() === document.uri.toString() || 
                tab.input.modified.toString() === document.uri.toString()) {
              isDiffEditor = true;
              diffTab = tab;
              break;
            }
          }
        }
        if (isDiffEditor) break;
      }
    }

    const config = vscode.workspace.getConfiguration('markdownLive');
    const lang = config.get<string>('language', 'en');
    
    if (isDiffEditor) {
      const title = lang === 'vi' ? 'Live Editor không hỗ trợ xem Git Diff' : 'Live Editor does not support Git Diff view';
      const desc = lang === 'vi' 
        ? 'Giao diện xem Diff chia đôi màn hình hiện chỉ khả dụng ở trình soạn thảo mặc định của VS Code.'
        : 'The split-screen Diff view is currently only available in the default VS Code text editor.';
      const btn = lang === 'vi' ? 'Chuyển sang Standard Text Editor' : 'Switch to Standard Text Editor';

      webviewPanel.webview.options = { enableScripts: true };
      webviewPanel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); padding: 20px; text-align: center; margin-top: 50px; }
            button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
            button:hover { background: var(--vscode-button-hoverBackground); }
            .icon { font-size: 48px; margin-bottom: 20px; opacity: 0.8; }
          </style>
        </head>
        <body>
          <div class="icon">🔍</div>
          <h2>${title}</h2>
          <p>${desc}</p>
          <br/>
          <button onclick="acquireVsCodeApi().postMessage({ command: 'reopen' })">${btn}</button>
        </body>
        </html>
      `;
      webviewPanel.webview.onDidReceiveMessage(async (e) => {
        if (e.command === 'reopen') {
          if (diffTab && diffTab.input instanceof vscode.TabInputTextDiff) {
            const original = diffTab.input.original;
            const modified = diffTab.input.modified;
            const label = diffTab.label;
            
            await vscode.window.tabGroups.close(diffTab);
            setTimeout(() => {
              vscode.commands.executeCommand('vscode.diff', original, modified, label, { override: 'default' });
            }, 100);
          } else {
            vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
          }
        }
      });
      return;
    }

    const docDir = vscode.Uri.joinPath(document.uri, '..');
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    const localResourceRoots = [vscode.Uri.joinPath(this.context.extensionUri, 'dist'), docDir];
    if (workspaceFolder) {
      localResourceRoots.push(workspaceFolder.uri);
    }

    // Setup webview
    webviewPanel.webview.options = {
      enableScripts: true,
      enableFindWidget: true,
      localResourceRoots: localResourceRoots,
    };
    webviewPanel.webview.html = getHtmlForWebview(webviewPanel.webview, document, this.context);

    MarkdownLiveProvider.openPanels.push({ panel: webviewPanel, document });

    webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) {
        MarkdownLiveProvider.currentPanel = e.webviewPanel;
        MarkdownLiveProvider.currentDocument = document;
      }
    });
    if (webviewPanel.active) {
      MarkdownLiveProvider.currentPanel = webviewPanel;
      MarkdownLiveProvider.currentDocument = document;
    }

    // Send initial content
    const updateWebview = () => {
      if (this.isUpdatingFromWebview) return;
      webviewPanel.webview.postMessage({
        type: 'update',
        text: document.getText(),
      });
    };

    // Listen for document changes (e.g. from git pull or external editor)
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      MarkdownLiveProvider.openPanels = MarkdownLiveProvider.openPanels.filter(p => p.panel !== webviewPanel);
      if (MarkdownLiveProvider.currentPanel === webviewPanel) {
        MarkdownLiveProvider.currentPanel = undefined;
        MarkdownLiveProvider.currentDocument = undefined;
      }
    });

    // Receive messages from webview
    // Receive messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (e) => {
      await handleWebviewMessage(e, document, webviewPanel, this);
    });

    // Wait a bit for webview to load, then send text
    setTimeout(() => updateWebview(), 500);
  }

  public async updateTextDocument(document: vscode.TextDocument, newText: string) {
    const normalize = (str: string) => str.replace(/\r\n/g, '\n');
    if (normalize(document.getText()) === normalize(newText)) return;

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
    await vscode.workspace.applyEdit(edit);
  }


}
