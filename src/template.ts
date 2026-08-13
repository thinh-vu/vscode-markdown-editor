import * as vscode from 'vscode';
import { MarkdownLiveProvider } from './editorProvider';

export async function insertTemplateCommand() {
  const config = vscode.workspace.getConfiguration('markdownLive');
  const templateFolder = config.get<string>('templateFolder');
  
  if (!templateFolder) {
    vscode.window.showErrorMessage('Template folder not configured. Please set "markdownLive.templateFolder" in settings (e.g., "templates").');
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace is currently open.');
    return;
  }

  // Find absolute path to template folder (assuming first workspace folder for simplicity)
  const folderUri = vscode.Uri.joinPath(workspaceFolders[0].uri, templateFolder);
  
  // Get all .md files in the folder
  let files: string[] = [];
  try {
    const entries = await vscode.workspace.fs.readDirectory(folderUri);
    files = entries.filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.md')).map(([name]) => name);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to read template folder: ${err.message}`);
    return;
  }
  
  if (files.length === 0) {
    vscode.window.showInformationMessage('No markdown templates found in the configured folder.');
    return;
  }

  const selected = await vscode.window.showQuickPick(files, {
    placeHolder: 'Select a template to insert'
  });

  if (!selected) return;

  const fileUri = vscode.Uri.joinPath(folderUri, selected);
  const fileData = await vscode.workspace.fs.readFile(fileUri);
  let content = new TextDecoder().decode(fileData);

  // Process template variables
  content = processTemplate(content);

  // Insert into active editor
  MarkdownLiveProvider.insertTextToActiveWebview(content);
}

function processTemplate(content: string): string {
  // 1. tp.file.title
  let title = 'Untitled';
  const currentDoc = MarkdownLiveProvider.currentDocument;
  
  const getBasename = (uri: vscode.Uri) => {
    const pathParts = uri.path.split('/');
    const file = pathParts[pathParts.length - 1];
    return file.endsWith('.md') ? file.slice(0, -3) : file;
  };

  if (currentDoc) {
    title = getBasename(currentDoc.uri);
  } else if (vscode.window.activeTextEditor) {
    title = getBasename(vscode.window.activeTextEditor.document.uri);
  }

  content = content.replace(/<%\s*tp\.file\.title\s*%>/g, title);

  // 2. tp.date.now("format")
  content = content.replace(/<%\s*tp\.date\.now\((['"])(.*?)\1\)\s*%>/g, (match, quote, format) => {
    return formatDate(new Date(), format);
  });
  
  // 3. tp.date.now() without parameters
  content = content.replace(/<%\s*tp\.date\.now\(\)\s*%>/g, () => {
    return formatDate(new Date(), "YYYY-MM-DD");
  });

  return content;
}

function formatDate(date: Date, format: string): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const YYYY = date.getFullYear().toString();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return format
    .replace('YYYY', YYYY)
    .replace('MM', MM)
    .replace('DD', DD)
    .replace('HH', HH)
    .replace('mm', mm)
    .replace('ss', ss);
}
