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
            description: vscode.workspace.asRelativePath(file),
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
        case 'promptForLink': {
          const url = await vscode.window.showInputBox({ prompt: 'Enter link URL:' });
          if (url !== undefined) {
            webviewPanel.webview.postMessage({ type: 'insertLinkWithUrl', url });
          }
          break;
        }
        case 'promptForImage': {
          const url = await vscode.window.showInputBox({ prompt: 'Enter image URL:' });
          if (url !== undefined) {
            webviewPanel.webview.postMessage({ type: 'insertImage', url });
          }
          break;
        }
        case 'logError':
          console.error('Webview Error:', e);
          vscode.window.showErrorMessage(`Webview Error: ${e.message}`);
          break;
        case 'showInfo':
          vscode.window.showInformationMessage(e.message);
          break;
        case 'renameImage': {
          if (!e.src) break;

          if (e.src.startsWith('data:image/')) {
            const config = vscode.workspace.getConfiguration('markdownLive');
            const lang = config.get<string>('language', 'en');
            const msg = lang === 'vi' 
              ? 'Không thể đổi tên ảnh được nhúng (base64).' 
              : 'Cannot rename embedded (base64) images.';
            vscode.window.showErrorMessage(msg);
            break;
          }

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
          const lastDotIndex = oldFileName.lastIndexOf('.');
          const baseName = lastDotIndex !== -1 ? oldFileName.substring(0, lastDotIndex) : oldFileName;
          const extension = lastDotIndex !== -1 ? oldFileName.substring(lastDotIndex) : '';

          const promptMsg =
            lang === 'vi'
              ? 'Nhập tên mới cho ảnh'
              : 'Enter new name for the image';

          const newBaseName = await vscode.window.showInputBox({
            prompt: promptMsg,
            value: baseName,
            ignoreFocusOut: true,
          });

          if (newBaseName && newBaseName !== baseName) {
            const newFileName = newBaseName.trim() + extension;
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
        case 'insertTOC': {
          const text = document.getText();
          const lines = text.split('\n');
          let toc = ['## Table of Contents'];
          let inYaml = false;
          let codeBlockCount = 0;
          for (const line of lines) {
            if (line.trim() === '---') {
               inYaml = !inYaml;
               continue;
            }
            if (inYaml) continue;
            
            if (line.startsWith('```')) {
               codeBlockCount++;
               continue;
            }
            if (codeBlockCount % 2 !== 0) continue;
            
            const match = line.match(/^(#{1,3})\s+(.+)$/);
            if (match) {
              const level = match[1].length;
              const title = match[2];
              const slug = title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
              const indent = '  '.repeat(level - 1);
              toc.push(`${indent}- [${title}](#${slug})`);
            }
          }
          
          if (toc.length > 1) {
            webviewPanel.webview.postMessage({
              type: 'insertText',
              text: toc.join('\n') + '\n\n',
              replaceLastBracket: false
            });
          } else {
             vscode.window.showInformationMessage('No headings (H1-H3) found to generate Table of Contents.');
          }
          break;
        }
        case 'exportPdf': {
          try {
            const config = vscode.workspace.getConfiguration('markdownLive');
            const docText = document.getText();
            
            // 1. Parse YAML frontmatter
            let frontmatter: Record<string, string> = {};
            const yamlMatch = docText.match(/^---\n([\s\S]+?)\n---/);
            if (yamlMatch) {
              const yamlText = yamlMatch[1];
              const lines = yamlText.split('\n');
              for (const line of lines) {
                const colonIdx = line.indexOf(':');
                if (colonIdx > 0) {
                  const key = line.slice(0, colonIdx).trim();
                  let value = line.slice(colonIdx + 1).trim();
                  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                  if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                  frontmatter[key] = value;
                }
              }
            }

            // 2. Format Variables
            const replaceVars = (str: string) => {
              if (!str) return '';
              let res = str;
              for (const key in frontmatter) {
                res = res.replace(new RegExp(`{${key}}`, 'g'), frontmatter[key]);
              }
              return res.replace(/{[^}]+}/g, ''); // Clear unmatched vars
            };

            const formatCssContent = (str: string) => {
               if (!str.trim()) return '""';
               const parts = str.split(/({page}|{pages})/g).filter(p => p.length > 0);
               const cssParts = parts.map(p => {
                 if (p === '{page}') return 'counter(page)';
                 if (p === '{pages}') return 'counter(pages)';
                 return `"${p.replace(/"/g, '\\"')}"`;
               });
               return cssParts.join(' ');
            };

            const headerFormat = config.get<string>('printHeaderFormat', '{title}');
            const footerFormat = config.get<string>('printFooterFormat', '{signature}');
            const pageNumFormat = config.get<string>('printPageNumberFormat', '{page}');
            const printFontFamily = config.get<string>('printFontFamily', '');
            const printAutoTOC = config.get<boolean>('printAutoTOC', false);

            const headerCssContent = formatCssContent(replaceVars(headerFormat));
            const footerCssContent = formatCssContent(replaceVars(footerFormat));
            const pageNumCssContent = formatCssContent(replaceVars(pageNumFormat));

            // 3. Inject TOC if enabled
            let modifiedHtml = e.html;

            // Fix base href for local print preview to load local images correctly
            const docDirUri = vscode.Uri.joinPath(document.uri, '..').toString() + '/';
            modifiedHtml = modifiedHtml.replace(/<base\s+href="[^"]*"/i, `<base href="${docDirUri}"`);
            if (printAutoTOC) {
              const lang = config.get<string>('language', 'en');
              const tocTitle = lang === 'vi' ? 'Mục lục' : 'Table of Contents';
              let tocHtml = `<div class="print-toc" style="page-break-after: always; font-family: ${printFontFamily};"><h2 style="text-align: center; margin-bottom: 20px;">${tocTitle}</h2><ul style="list-style-type: none; padding: 0;">`;
              const headingRegex = /<(h[1-3])[^>]*>(.*?)<\/\1>/gi;
              let match;
              let hasHeadings = false;
              while ((match = headingRegex.exec(modifiedHtml)) !== null) {
                hasHeadings = true;
                const tag = match[1].toLowerCase();
                const level = parseInt(tag[1], 10);
                const title = match[2].replace(/<[^>]+>/g, '').trim();
                const indent = (level - 1) * 30;
                tocHtml += `<li style="margin-left: ${indent}px; margin-bottom: 8px; border-bottom: 1px dotted #ccc; display: flex; justify-content: space-between;"><span>${title}</span></li>`;
              }
              tocHtml += '</ul></div>';
              
              if (hasHeadings) {
                // Insert after opening body or wrapper
                modifiedHtml = modifiedHtml.replace('<div class="milkdown">', '<div class="milkdown">' + tocHtml);
              }
            }

            // 4. Inline CSS to fix Paged.js CORS on file://
            try {
              const cssUri = vscode.Uri.joinPath(provider.extensionUri, 'dist', 'webview.css');
              const cssData = await vscode.workspace.fs.readFile(cssUri);
              const cssString = new TextDecoder().decode(cssData);
              // Replace the external link with inline style
              modifiedHtml = modifiedHtml.replace(/<link[^>]+href="[^"]+webview\.css"[^>]*>/i, `<style>${cssString}</style>`);
            } catch (err) {
              console.error('Failed to inline CSS for PDF export', err);
            }

            // 5. Inject Paged.js and dynamic CSS
            const fontRule = printFontFamily ? `font-family: ${printFontFamily} !important;` : '';
            const injection = `
              <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
              <style>
                @page {
                  size: A4;
                  margin: 20mm;
                  @top-center { content: ${headerCssContent}; font-family: sans-serif; font-size: 11px; color: #888; }
                  @bottom-left { content: ${footerCssContent}; font-family: sans-serif; font-size: 11px; color: #888; }
                  @bottom-right { content: ${pageNumCssContent}; font-family: sans-serif; font-size: 11px; color: #888; }
                }
                .toolbar, .flyout-outline, #metadata-container, #source-editor, .context-menu, #table-modal { display: none !important; }
                html, body, .milkdown, .editor, .ProseMirror { 
                    height: auto !important; 
                    min-height: auto !important;
                    overflow: visible !important; 
                    position: static !important; 
                    display: block !important;
                }
                body { background: #e0e0e0 !important; margin: 0; padding: 20px 0; ${fontRule} }
                .pagedjs_page { background: white !important; box-shadow: 0 0 10px rgba(0,0,0,0.2); margin: 0 auto 20px auto; }
                .pagedjs_page .pagedjs_margin-top-center, .pagedjs_page .pagedjs_margin-bottom-left, .pagedjs_page .pagedjs_margin-bottom-right {
                    /* ensure margin content is visible */
                    opacity: 1 !important; display: block !important;
                }
              </style>
            `;
            
            modifiedHtml = modifiedHtml.replace('</head>', injection + '\n</head>');

            const encoder = new TextEncoder();
            const htmlData = encoder.encode(modifiedHtml);
            
            let targetDir = vscode.Uri.joinPath(document.uri, '..');
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
              targetDir = vscode.Uri.joinPath(workspaceFolders[0].uri, '.vscode');
              try {
                await vscode.workspace.fs.createDirectory(targetDir);
              } catch (err) {}
            }
            
            const tempFileUri = vscode.Uri.joinPath(targetDir, 'print-preview.html');
            await vscode.workspace.fs.writeFile(tempFileUri, htmlData);
            
            await vscode.env.openExternal(tempFileUri);
            
            const lang = config.get<string>('language', 'en');
            const msg = lang === 'vi' 
              ? 'Đã mở bản xem trước trên trình duyệt. Vui lòng nhấn Cmd+P / Ctrl+P để In hoặc Lưu PDF.' 
              : 'Preview opened in browser. Please press Cmd+P / Ctrl+P to Print or Save as PDF.';
            vscode.window.showInformationMessage(msg);
          } catch (err: any) {
            vscode.window.showErrorMessage('Export PDF Error: ' + err.message);
          }
          break;
        }
        case 'save':
          await document.save();
          break;
        case 'revealImage': {
          if (!e.src) break;
          
          if (e.src.startsWith('data:image/')) {
            const config = vscode.workspace.getConfiguration('markdownLive');
            const lang = config.get<string>('language', 'en');
            const msg = lang === 'vi' 
              ? 'Không thể hiển thị ảnh base64 trong File Explorer.' 
              : 'Cannot reveal embedded (base64) images in Explorer.';
            vscode.window.showErrorMessage(msg);
            break;
          }

          let fileUri: vscode.Uri;
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const rootUri = workspaceFolders ? workspaceFolders[0].uri : undefined;
          const config = vscode.workspace.getConfiguration('markdownLive');
          const imagePublicPath = config.get<string>('imagePublicPath', '');

          if (e.src.startsWith('/')) {
            if (!rootUri) {
              const lang = config.get<string>('language', 'en');
              const msg = lang === 'vi' 
                ? 'Cần mở Workspace để định vị ảnh gốc "/".' 
                : 'A Workspace must be open to locate absolute "/" images.';
              vscode.window.showErrorMessage(msg);
              break;
            }
            let resolvedPath = e.src.slice(1);
            if (imagePublicPath && e.src.startsWith('/' + imagePublicPath)) {
              // Already has prefix
            } else if (imagePublicPath) {
              const prefix = imagePublicPath.startsWith('/') ? imagePublicPath.slice(1) : imagePublicPath;
              resolvedPath = prefix + '/' + resolvedPath;
            }
            fileUri = vscode.Uri.joinPath(rootUri, resolvedPath);
          } else if (e.src.startsWith('http://') || e.src.startsWith('https://')) {
             const lang = config.get<string>('language', 'en');
             const msg = lang === 'vi' 
               ? 'Không thể mở ảnh từ đường dẫn web ngoài trong File Explorer.' 
               : 'Cannot reveal external web images in Explorer.';
             vscode.window.showInformationMessage(msg);
             break;
          } else {
            fileUri = vscode.Uri.joinPath(document.uri, '..', e.src);
          }

          try {
            await vscode.commands.executeCommand('revealInExplorer', fileUri);
          } catch (err: any) {
            console.error('Failed to reveal image in explorer:', err);
            vscode.window.showErrorMessage(`Error revealing image: ${err.message}`);
          }
          break;
        }
      }
}
