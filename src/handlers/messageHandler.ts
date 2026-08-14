import * as vscode from 'vscode';
import { MarkdownLiveProvider } from '../editorProvider';

export async function handleWebviewMessage(
  e: any,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel,
  provider: MarkdownLiveProvider
) {
  switch (e.type) {
        case 'edit':
          provider.isUpdatingFromWebview = true;
          await provider.updateTextDocument(document, e.text);
          // Reset flag after a tiny delay to ensure VS Code events have fired
          setTimeout(() => {
            provider.isUpdatingFromWebview = false;
          }, 10);
          break;
        case 'sendToAI':
          try {
            const fileName = document.uri.path.split('/').pop() || 'markdown_context.md';
            const richContext = {
              uri: document.uri,
              name: fileName,
              label: 'Selection from ' + fileName,
              text: e.text,
              content: e.text,
              value: e.text,
              type: 'file',
              kind: 'file'
            };
            await vscode.commands.executeCommand('antigravity.addContext', richContext);
          } catch (err) {
            // Fallback if Antigravity API is not available
            vscode.env.clipboard.writeText(e.text);
            vscode.commands.executeCommand('workbench.action.chat.open', e.text);
          }
          break;

        case 'toggleEditor':
          vscode.commands.executeCommand('workbench.action.toggleCustomEditor');
          break;
        case 'searchWikilink': {
          const files = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**');
          const items = files.map((file) => ({
            label: vscode.workspace.asRelativePath(file),
            description: file.fsPath,
            uri: file,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a file to link',
          });

          if (selected) {
            const fromPath = document.uri.path;
            const toPath = selected.uri.path;
            const fromParts = fromPath.split('/').filter((p) => p);
            const toParts = toPath.split('/').filter((p) => p);
            fromParts.pop(); // remove current filename

            let common = 0;
            while (
              common < fromParts.length &&
              common < toParts.length &&
              fromParts[common] === toParts[common]
            ) {
              common++;
            }

            const upCount = fromParts.length - common;
            let relParts = [];
            for (let i = 0; i < upCount; i++) {
              relParts.push('..');
            }
            relParts = relParts.concat(toParts.slice(common));
            let relativePath = relParts.join('/');
            if (!relativePath) relativePath = '.';

            const fileName = toParts[toParts.length - 1] || 'untitled';
            const dotIndex = fileName.lastIndexOf('.');
            const baseName = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
            const isImage = /\.(png|jpe?g|gif|svg|webp)$/i.test(fileName);

            let insertTextStr = `[${baseName}](${relativePath})`;
            if (isImage) {
              insertTextStr = `![${baseName}](${relativePath})\n*${baseName}*\n`;
            }

            webviewPanel.webview.postMessage({
              type: 'insertText',
              text: insertTextStr,
              replaceLastBracket: true,
            });
          }
          break;
        }
        case 'saveImage': {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            try {
              const rootUri = workspaceFolders[0].uri;

              // Read custom image directory from config
              const config = vscode.workspace.getConfiguration('markdownLive');
              const imageDirSetting = config.get<string>('imageDirectory', 'assets/images');
              const imageDirParts = imageDirSetting.split('/').filter((p) => p.length > 0);

              const imagesUri = vscode.Uri.joinPath(rootUri, ...imageDirParts);
              try {
                await vscode.workspace.fs.createDirectory(imagesUri);
              } catch (err) {
                /* ignore */
              }

              if (!e.data) {
                const config = vscode.workspace.getConfiguration('markdownLive');
                const lang = config.get<string>('language', 'en');
                const msg =
                  lang === 'vi'
                    ? 'Lỗi: Dữ liệu ảnh từ clipboard rỗng!'
                    : 'Error: Image data from clipboard is empty!';
                vscode.window.showErrorMessage(msg);
                break;
              }

              const fileName = `image-${Date.now()}.${e.ext}`;
              const fileUri = vscode.Uri.joinPath(imagesUri, fileName);

              // Thay vì dùng Buffer (không có sẵn trong môi trường Web Extension), dùng atob
              const binaryString = atob(e.data);
              const buffer = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                buffer[i] = binaryString.charCodeAt(i);
              }

              await vscode.workspace.fs.writeFile(fileUri, buffer);

              // Generate relative path from document to image
              const relativePath = `${imageDirSetting}/${fileName}`;

              webviewPanel.webview.postMessage({
                type: 'insertImage',
                url: relativePath,
                pastePos: e.pastePos,
              });
            } catch (err: any) {
              const config = vscode.workspace.getConfiguration('markdownLive');
              const lang = config.get<string>('language', 'en');
              const msgPrefix = lang === 'vi' ? 'Lỗi lưu ảnh: ' : 'Error saving image: ';
              vscode.window.showErrorMessage(`${msgPrefix}${err.message}`);
              console.error(err);
            }
          } else {
            const config = vscode.workspace.getConfiguration('markdownLive');
            const lang = config.get<string>('language', 'en');
            const msg =
              lang === 'vi'
                ? 'Vui lòng mở một thư mục (workspace) để lưu ảnh tự động.'
                : 'Please open a folder (workspace) to save images automatically.';
            vscode.window.showErrorMessage(msg);
          }
          break;
        }
        case 'logError':
          console.error('Webview Error:', e);
          vscode.window.showErrorMessage(`Webview Error: ${e.message}`);
          break;
        case 'renameImage': {
          if (!e.src) break;

          let oldFileUri: vscode.Uri;
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const rootUri = workspaceFolders ? workspaceFolders[0].uri : undefined;

          // Support mapping public path prefix if needed when resolving physical file
          const config = vscode.workspace.getConfiguration('markdownLive');
          const imagePublicPath = config.get<string>('imagePublicPath', '');
          const lang = config.get<string>('language', 'en');

          if (e.src.startsWith('/')) {
            if (!rootUri) {
              const msg =
                lang === 'vi'
                  ? 'Cần mở Workspace để đổi tên ảnh gốc "/"'
                  : 'A Workspace must be open to rename absolute "/" images.';
              vscode.window.showErrorMessage(msg);
              break;
            }

            // Nếu src là /public/images/... (đã có prefix) thì lấy luôn, nếu chưa có thì thêm vào
            let resolvedPath = e.src.slice(1);
            if (imagePublicPath && e.src.startsWith('/' + imagePublicPath)) {
              // Already has prefix in raw src? That shouldn't happen based on our webview logic, but just in case
            } else if (imagePublicPath) {
              // Bổ sung prefix để ánh xạ tới file vật lý (ví dụ: markdown dùng /images/... nhưng file nằm ở public/images/...)
              const prefix = imagePublicPath.startsWith('/')
                ? imagePublicPath.slice(1)
                : imagePublicPath;
              resolvedPath = prefix + '/' + resolvedPath;
            }

            oldFileUri = vscode.Uri.joinPath(rootUri, resolvedPath);
          } else {
            oldFileUri = vscode.Uri.joinPath(document.uri, '..', e.src);
          }

          const oldFileName = oldFileUri.path.split('/').pop() || '';

          const promptMsg =
            lang === 'vi'
              ? 'Nhập tên mới cho ảnh (bao gồm đuôi file)'
              : 'Enter new name for the image (including extension)';

          const newFileName = await vscode.window.showInputBox({
            prompt: promptMsg,
            value: oldFileName,
            ignoreFocusOut: true,
          });

          if (newFileName && newFileName !== oldFileName) {
            try {
              const newFileUri = vscode.Uri.joinPath(oldFileUri, '..', newFileName);
              await vscode.workspace.fs.rename(oldFileUri, newFileUri, { overwrite: false });

              const newSrc = e.src.replace(oldFileName, newFileName);
              const text = document.getText();
              const newText = text.split(e.src).join(newSrc);

              const edit = new vscode.WorkspaceEdit();
              edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
              await vscode.workspace.applyEdit(edit);
            } catch (err: any) {
              const msgPrefix = lang === 'vi' ? 'Lỗi đổi tên ảnh: ' : 'Error renaming image: ';
              vscode.window.showErrorMessage(`${msgPrefix}${err.message}`);
            }
          }
          break;
        }
        case 'save':
          await document.save();
          break;
      }
}
