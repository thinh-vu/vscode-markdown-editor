import * as vscode from 'vscode';
import { MarkdownLiveProvider } from './editorProvider';
import { insertTemplateCommand } from './template';
import { registerFileDeletionHandler } from './handlers/fileDeletionHandler';
import { SidebarProvider } from './sidebarProvider';
import { NoteManager } from './noteManager';

export function activate(context: vscode.ExtensionContext) {
  // Register the custom editor provider
  context.subscriptions.push(MarkdownLiveProvider.register(context));

  // Register file deletion handler for cleaning up attachments
  registerFileDeletionHandler(context);

  // Register Sidebar Webview Provider
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
  );

  // File system watcher to refresh sidebar when markdown files are modified
  const mdWatcher = vscode.workspace.createFileSystemWatcher('**/*.md');
  context.subscriptions.push(mdWatcher);
  
  mdWatcher.onDidCreate(() => sidebarProvider.refresh());
  mdWatcher.onDidChange(() => sidebarProvider.refresh());
  mdWatcher.onDidDelete(() => sidebarProvider.refresh());

  // Register the command to open Live Editor manually
  context.subscriptions.push(
    vscode.commands.registerCommand('markdown-live.openLiveEditor', (uri?: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (targetUri) {
        vscode.commands.executeCommand('vscode.openWith', targetUri, 'markdownLive.editor');
      }
    }),
  );

  // Commands to forward to active webview
  const commands = [
    'sendToAI',
    'insertLink',
    'save',
    'insertTable',
    'insertHeading1',
    'insertHeading2',
    'insertHeading3',
    'insertHeading4',
    'insertHeading5',
    'insertHeading6',
    'insertCodeBlock',
    'insertBlockquote',
    'insertImage',
    'toggleBold',
    'toggleItalic',
  ];

  commands.forEach((cmd) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(`markdown-live.${cmd}`, () => {
        MarkdownLiveProvider.postCommandToActiveWebview(cmd);
      }),
    );
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('markdown-live.insertTemplate', () => {
      insertTemplateCommand();
    }),
    vscode.commands.registerCommand('markdown-live.newNote', () => {
      NoteManager.createNewNote().then(() => sidebarProvider.refresh());
    }),
    vscode.commands.registerCommand('markdown-live.newNoteFromTemplate', () => {
      NoteManager.createNewNoteFromTemplate().then(() => sidebarProvider.refresh());
    }),
    vscode.commands.registerCommand('markdown-live.refreshSidebar', () => {
      sidebarProvider.refresh();
    })
  );
}
