import * as vscode from 'vscode';

export function registerFileDeletionHandler(context: vscode.ExtensionContext) {
  // Store the deleted files mapped to their asset URIs
  const pendingDeletions = new Map<string, vscode.Uri[]>();

  const onWillDelete = vscode.workspace.onWillDeleteFiles((e) => {
    const mdFiles = e.files.filter((f) => f.path.endsWith('.md'));
    if (mdFiles.length === 0) return;

    const promise = async () => {
      for (const file of mdFiles) {
        try {
          const data = await vscode.workspace.fs.readFile(file);
          const content = new TextDecoder().decode(data);

          const assetUris = await extractLocalAssets(content, file);
          if (assetUris.length > 0) {
            pendingDeletions.set(file.toString(), assetUris);
          }
        } catch (error) {
          console.error(`Error processing deleted markdown file ${file.toString()}`, error);
        }
      }
    };
    e.waitUntil(promise());
  });

  const onDidDelete = vscode.workspace.onDidDeleteFiles(async (e) => {
    for (const file of e.files) {
      const fileKey = file.toString();
      if (pendingDeletions.has(fileKey)) {
        const assetUris = pendingDeletions.get(fileKey)!;
        pendingDeletions.delete(fileKey);

        await promptAndDeleteAssets(assetUris);
      }
    }
  });

  context.subscriptions.push(onWillDelete, onDidDelete);
}

async function extractLocalAssets(content: string, mdUri: vscode.Uri): Promise<vscode.Uri[]> {
  const assetUris: vscode.Uri[] = [];

  // Matches ![alt](path) and <img src="path">
  const mdImgRegex = /!\[.*?\]\((.*?)\)/g;
  const htmlImgRegex = /<img[^>]+src=["'](.*?)["']/g;

  const paths = new Set<string>();

  let match;
  while ((match = mdImgRegex.exec(content)) !== null) {
    if (match[1]) paths.add(match[1].trim());
  }
  while ((match = htmlImgRegex.exec(content)) !== null) {
    if (match[1]) paths.add(match[1].trim());
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  const rootUri = workspaceFolders ? workspaceFolders[0].uri : undefined;

  const config = vscode.workspace.getConfiguration('markdownLive');
  const imagePublicPath = config.get<string>('imagePublicPath', '');

  for (const rawPath of paths) {
    // Ignore external URLs
    if (
      rawPath.startsWith('http://') ||
      rawPath.startsWith('https://') ||
      rawPath.startsWith('data:')
    ) {
      continue;
    }

    // Ignore empty paths or purely hash paths (e.g. #header)
    if (!rawPath || rawPath.startsWith('#')) continue;

    // Clean up title from markdown if exists (e.g. `path/to/img.png "Title"`)
    const cleanedPath = rawPath.split(' ')[0];

    try {
      let resolvedUri: vscode.Uri;
      if (cleanedPath.startsWith('/')) {
        if (!rootUri) continue;

        let absolutePath = cleanedPath.slice(1);
        if (imagePublicPath && !cleanedPath.startsWith('/' + imagePublicPath)) {
          const prefix = imagePublicPath.startsWith('/')
            ? imagePublicPath.slice(1)
            : imagePublicPath;
          absolutePath = prefix ? prefix + '/' + absolutePath : absolutePath;
        }
        resolvedUri = vscode.Uri.joinPath(rootUri, absolutePath);
      } else {
        // Relative to the markdown file
        // mdUri is the path to the .md file, so we join with '..' and the relative path
        resolvedUri = vscode.Uri.joinPath(mdUri, '..', cleanedPath);
      }

      // Check if file exists
      try {
        const stat = await vscode.workspace.fs.stat(resolvedUri);
        if (stat.type === vscode.FileType.File) {
          assetUris.push(resolvedUri);
        }
      } catch (e) {
        // File does not exist, ignore
      }
    } catch (e) {
      console.error('Error resolving asset path:', e);
    }
  }

  // Remove duplicates by stringified URI
  const uniqueUris = new Map<string, vscode.Uri>();
  for (const uri of assetUris) {
    uniqueUris.set(uri.toString(), uri);
  }

  return Array.from(uniqueUris.values());
}

async function promptAndDeleteAssets(assetUris: vscode.Uri[]) {
  if (assetUris.length === 0) return;

  const items: vscode.QuickPickItem[] = assetUris.map((uri) => {
    // Get just the filename for the label, and path for description
    const pathParts = uri.path.split('/');
    const fileName = pathParts[pathParts.length - 1];

    // Create a relative path if possible for a nicer display
    let displayPath = uri.fsPath;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
      displayPath = uri.fsPath.replace(workspaceFolder.uri.fsPath, '').slice(1);
    }

    return {
      label: fileName,
      description: displayPath,
      picked: true, // Default to checked
      uri: uri, // Store the original URI
    } as vscode.QuickPickItem & { uri: vscode.Uri };
  });

  const result = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    title: 'Delete Attached Files',
    placeHolder: 'Select attachments to move to trash',
    ignoreFocusOut: true,
  });

  if (result && result.length > 0) {
    for (const item of result as (vscode.QuickPickItem & { uri: vscode.Uri })[]) {
      try {
        await vscode.workspace.fs.delete(item.uri, { useTrash: true });
      } catch (err) {
        console.error(`Failed to delete ${item.uri.toString()}`, err);
        vscode.window.showErrorMessage(`Failed to delete ${item.label}`);
      }
    }
  }
}
