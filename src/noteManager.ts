import * as vscode from 'vscode';

export class NoteManager {
  /**
   * Prompts user for a note name and creates a new blank note in the default directory.
   */
  public static async createNewNote() {
    const config = vscode.workspace.getConfiguration('markdownLive');
    const templateFolderStr = config.get<string>('templateFolder', '');

    if (templateFolderStr) {
      const choice = await vscode.window.showQuickPick([
        { label: '$(add) Empty Note', id: 'empty' },
        { label: '$(layout-template) Note from Template', id: 'template' }
      ], { placeHolder: 'Select note type' });

      if (!choice) return;

      if (choice.id === 'template') {
        await this.createNewNoteFromTemplate();
        return;
      }
    }

    const noteName = await vscode.window.showInputBox({
      prompt: 'Enter the name of the new note (without .md)',
      placeHolder: 'e.g. My New Idea',
    });

    if (!noteName) return;

    await this.createFile(noteName, `# ${noteName}\n\n`);
  }

  /**
   * Shows a quick pick of templates, prompts for a note name, and creates the note from the template.
   */
  public static async createNewNoteFromTemplate() {
    const config = vscode.workspace.getConfiguration('markdownLive');
    const templateFolderStr = config.get<string>('templateFolder', '');
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace is open.');
      return;
    }

    if (!templateFolderStr) {
      vscode.window.showErrorMessage('Template folder is not configured. Please set `markdownLive.templateFolder` in settings.');
      return;
    }

    const templateFolderUri = vscode.Uri.joinPath(workspaceFolders[0].uri, templateFolderStr);
    let templates: [string, vscode.FileType][];
    
    try {
      templates = await vscode.workspace.fs.readDirectory(templateFolderUri);
    } catch (error) {
      vscode.window.showErrorMessage(`Template folder not found at ${templateFolderStr}`);
      return;
    }

    const markdownTemplates = templates.filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.md'));

    if (markdownTemplates.length === 0) {
      vscode.window.showInformationMessage(`No markdown templates found in ${templateFolderStr}`);
      return;
    }

    const items: vscode.QuickPickItem[] = markdownTemplates.map(([name]) => ({
      label: name,
      iconPath: new vscode.ThemeIcon('markdown'),
    }));

    const selectedTemplate = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a template',
    });

    if (!selectedTemplate) return;

    const noteName = await vscode.window.showInputBox({
      prompt: 'Enter the name of the new note (without .md)',
      placeHolder: 'e.g. Daily Log',
    });

    if (!noteName) return;

    const templateUri = vscode.Uri.joinPath(templateFolderUri, selectedTemplate.label);
    const templateContent = await vscode.workspace.fs.readFile(templateUri);
    const contentString = new TextDecoder().decode(templateContent);

    // Basic placeholder replacement for the title
    const finalContent = contentString.replace(/{{title}}/gi, noteName);

    await this.createFile(noteName, finalContent);
  }

  /**
   * Helper to write the file to the default directory and open it.
   */
  private static async createFile(noteName: string, content: string) {
    const config = vscode.workspace.getConfiguration('markdownLive');
    const defaultDirStr = config.get<string>('defaultNoteDirectory', '');
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace is open.');
      return;
    }

    // Ensure filename ends with .md
    let filename = noteName;
    if (!filename.toLowerCase().endsWith('.md')) {
      filename += '.md';
    }

    // Replace invalid characters for file names
    filename = filename.replace(/[\\/:\*\?"<>\|]/g, '-');

    const targetDirUri = defaultDirStr 
      ? vscode.Uri.joinPath(workspaceFolders[0].uri, defaultDirStr) 
      : workspaceFolders[0].uri;

    // Ensure directory exists
    try {
      await vscode.workspace.fs.createDirectory(targetDirUri);
    } catch (err) {
      console.warn('Directory creation failed or already exists:', err);
    }

    const fileUri = vscode.Uri.joinPath(targetDirUri, filename);

    try {
      // Check if file exists
      await vscode.workspace.fs.stat(fileUri);
      vscode.window.showErrorMessage(`File already exists: ${filename}`);
      return;
    } catch (e) {
      // File doesn't exist, proceed
    }

    const writeData = new TextEncoder().encode(content);
    await vscode.workspace.fs.writeFile(fileUri, writeData);

    // Open file
    await vscode.commands.executeCommand('vscode.openWith', fileUri, 'markdownLive.editor');
  }
}
