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
