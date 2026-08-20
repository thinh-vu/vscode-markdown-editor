import * as vscode from 'vscode';

export function getHtmlForWebview(
  webview: vscode.Webview,
  document: vscode.TextDocument,
  context: vscode.ExtensionContext
): string {
  
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.css'),
    );

    const config = vscode.workspace.getConfiguration('markdownLive');
    const fontFamilySetting = config.get<string>('fontFamily', 'sans-serif');
    const imagePublicPath = config.get<string>('imagePublicPath', '');
    const enableSlashCommand = config.get<boolean>('enableSlashCommand', true);
    const fontFamilyCss =
      fontFamilySetting === 'serif'
        ? "'Merriweather', 'Georgia', serif !important"
        : "'Roboto', sans-serif !important";

    // Base URI for relative images
    const docDir = vscode.Uri.joinPath(document.uri, '..');
    const baseUri = webview.asWebviewUri(docDir).toString() + '/';

    const configLang = vscode.workspace
      .getConfiguration('markdownLive')
      .get<string>('language', 'en');
    const propertiesLabel = configLang === 'vi' ? 'Thuộc tính của ghi chú' : 'Properties';

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceRootUriStr =
      workspaceFolders && workspaceFolders.length > 0
        ? webview.asWebviewUri(workspaceFolders[0].uri).toString()
        : '';

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: https:; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src ${webview.cspSource} 'unsafe-eval';">
                <base href="${baseUri}">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="image-public-path" content="${imagePublicPath}">
                <meta name="workspace-root" content="${workspaceRootUriStr}">
                <meta name="enable-slash-command" content="${enableSlashCommand}">
                <meta name="config-lang" content="${configLang}">
                <title>Markdown Live Editor</title>
                <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
                <link href="${styleUri}" rel="stylesheet" />
                <style>
                    body {
                        padding: 0;
                        margin: 0;
                        height: 100vh;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        font-family: ${fontFamilyCss};
                        display: flex;
                        flex-direction: column;
                    }
                    
                    /* Scrollbar */
                    ::-webkit-scrollbar { width: 8px; height: 8px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
                    ::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }
                    ::-webkit-scrollbar-thumb:active { background: var(--vscode-scrollbarSlider-activeBackground); }
                    
                    /* Toolbar Styles */
                    .toolbar {
                        display: flex;
                        gap: 4px;
                        padding: 8px 16px;
                        background: color-mix(in srgb, var(--vscode-editor-background) 85%, transparent);
                        backdrop-filter: blur(8px);
                        -webkit-backdrop-filter: blur(8px);
                        border-bottom: 1px solid var(--vscode-panel-border);
                        align-items: center;
                        flex-wrap: wrap;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                        position: sticky;
                        top: 0;
                        z-index: 100;
                        transition: all 0.2s ease;
                    }
                    .toolbar button {
                        background: transparent;
                        border: 1px solid transparent;
                        color: var(--vscode-icon-foreground);
                        border-radius: 4px;
                        padding: 6px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .toolbar button:hover {
                        background: var(--vscode-toolbar-hoverBackground);
                    }
                    .toolbar button svg {
                        width: 16px;
                        height: 16px;
                    }
                    .divider {
                        width: 1px;
                        height: 20px;
                        background: var(--vscode-panel-border);
                        margin: 0 4px;
                    }
                    .dropdown {
                        position: relative;
                        display: inline-block;
                    }
                    .dropdown-content {
                        display: none;
                        position: absolute;
                        background-color: var(--vscode-dropdown-background);
                        min-width: 130px;
                        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                        z-index: 1000;
                        border: 1px solid var(--vscode-dropdown-border);
                        border-radius: 4px;
                        top: 100%;
                        left: 0;
                    }
                    .dropdown-content .dropdown-item {
                        color: var(--vscode-dropdown-foreground);
                        padding: 8px 12px;
                        text-decoration: none;
                        display: flex;
                        align-items: center;
                        font-size: 13px;
                        cursor: pointer;
                    }
                    .dropdown-content .dropdown-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .dropdown:hover .dropdown-content,
                    .dropdown:focus-within .dropdown-content {
                        display: block;
                    }
                    .dropdown-content-right {
                        left: auto !important;
                        right: 0;
                    }
                    .context-menu {
                        display: none;
                        position: absolute;
                        background-color: var(--vscode-menu-background, var(--vscode-editorWidget-background, #252526));
                        border: 1px solid var(--vscode-menu-border, var(--vscode-editorWidget-border, #454545));
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
                        z-index: 2000;
                        border-radius: 6px;
                        min-width: 170px;
                        padding: 4px;
                    }
                    .context-menu-item {
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 13px;
                        font-family: var(--vscode-font-family, sans-serif);
                        font-weight: 500;
                        color: var(--vscode-menu-foreground, var(--vscode-editorWidget-foreground, var(--vscode-foreground, #ffffff)));
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        border-radius: 4px;
                        transition: background-color 0.12s ease, color 0.12s ease;
                    }
                    .context-menu-item svg {
                        width: 15px;
                        height: 15px;
                        stroke: currentColor;
                        flex-shrink: 0;
                    }
                    .context-menu-item:hover {
                        background-color: var(--vscode-menu-selectionBackground, var(--vscode-list-activeSelectionBackground, #094771));
                        color: var(--vscode-menu-selectionForeground, var(--vscode-list-activeSelectionForeground, #ffffff)) !important;
                    }
                    .toolbar-select {
                        background: transparent;
                        color: var(--vscode-editor-foreground);
                        border: 1px solid transparent;
                        border-radius: 3px;
                        padding: 2px 4px;
                        font-size: 13px;
                        outline: none;
                        cursor: pointer;
                        margin: 0 4px;
                    }
                    .toolbar-select:hover {
                        background: var(--vscode-toolbar-hoverBackground);
                    }
                    .toolbar-select option {
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .spacer {
                        flex: 1;
                    }
                    
                    /* Metadata Styles */
                    #metadata-container {
                        display: none;
                        padding: 10px 40px;
                        background: var(--vscode-textBlockQuote-background);
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    #metadata-container details {
                        cursor: pointer;
                    }
                    #metadata-container summary {
                        list-style: none;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        font-weight: 500;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 8px;
                        user-select: none;
                        opacity: 0.6;
                        transition: opacity 0.2s;
                    }
                    #metadata-container summary::-webkit-details-marker {
                        display: none;
                    }
                    #metadata-container summary:hover {
                        opacity: 1;
                    }
                    #metadata-container summary .chevron {
                        width: 16px;
                        height: 16px;
                        margin-top: 2px;
                        transition: transform 0.2s;
                    }
                    #metadata-container details[open] summary .chevron {
                        transform: rotate(180deg);
                    }
                    #metadata-content {
                        font-family: var(--vscode-editor-font-family);
                        font-size: 0.9em;
                        white-space: pre-wrap;
                        color: var(--vscode-descriptionForeground);
                        padding-left: 20px;
                        cursor: text;
                    }

                    #editor {
                        flex: 1;
                        padding: 20px 40px;
                        overflow-y: auto;
                        display: flex;
                        justify-content: center;
                        scroll-behavior: smooth;
                    }
                    .milkdown, .ProseMirror { 
                        min-height: 100%;
                        outline: none;
                        font-family: ${fontFamilyCss};
                        max-width: 800px;
                        width: 100%;
                        line-height: 1.7;
                        letter-spacing: 0.2px;
                        font-size: 15px;
                    }
                    
                    /* Admonitions */
                    .admonition {
                        border-left: 4px solid var(--vscode-editorInfo-foreground);
                        padding: 2px 16px;
                        margin: 16px 0;
                        border-radius: 0 4px 4px 0;
                        background: color-mix(in srgb, var(--vscode-editorInfo-foreground) 10%, transparent);
                    }
                    .admonition-note {
                        border-left-color: var(--vscode-editorInfo-foreground);
                        background: color-mix(in srgb, var(--vscode-editorInfo-foreground) 10%, transparent);
                    }
                    .admonition-warning {
                        border-left-color: var(--vscode-editorWarning-foreground);
                        background: color-mix(in srgb, var(--vscode-editorWarning-foreground) 10%, transparent);
                    }
                    .admonition-tip {
                        border-left-color: var(--vscode-testing-iconPassed);
                        background: color-mix(in srgb, var(--vscode-testing-iconPassed) 10%, transparent);
                    }
                    .admonition-important {
                        border-left-color: var(--vscode-editorError-foreground);
                        background: color-mix(in srgb, var(--vscode-editorError-foreground) 10%, transparent);
                    }
                    .admonition-caution {
                        border-left-color: var(--vscode-editorError-foreground);
                        background: color-mix(in srgb, var(--vscode-editorError-foreground) 10%, transparent);
                    }
                    .admonition-title {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-weight: 600;
                        font-size: 15px;
                        margin-bottom: 4px;
                        user-select: none;
                    }
                    .admonition > p:first-child {
                        margin-top: 8px;
                        margin-bottom: 4px;
                    }
                    
                    /* Table Modal */
                    #table-modal-overlay {
                        display: none;
                    }
                    #table-modal {
                        display: none;
                        position: absolute;
                        top: 45px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: var(--vscode-editorWidget-background);
                        border: 1px solid var(--vscode-editorWidget-border);
                        padding: 16px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                        z-index: 100;
                        border-radius: 6px;
                        width: 250px;
                    }
                    /* Milkdown Overrides */
                    .milkdown {
                        padding: 20px 40px !important;
                        font-size: var(--editor-zoom-level, 14px) !important;
                        font-family: ${fontFamilyCss};
                        max-width: 850px;
                        margin: 0 auto;
                        background: var(--vscode-editor-background);
                    }
                    .milkdown .editor {
                        outline: none !important;
                        box-shadow: none !important;
                    }
                    .milkdown p, .milkdown h1, .milkdown h2, .milkdown h3, .milkdown h4, .milkdown h5, .milkdown h6 {
                        color: var(--vscode-editor-foreground) !important;
                        font-family: inherit !important;
                    }
                    .milkdown h1 { font-size: calc(var(--editor-zoom-level, 14px) * 1.8) !important; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; letter-spacing: -0.02em; }
                    .milkdown h2 { font-size: calc(var(--editor-zoom-level, 14px) * 1.5) !important; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.3em; letter-spacing: -0.01em; }
                    .milkdown h3 { font-size: calc(var(--editor-zoom-level, 14px) * 1.3) !important; font-weight: 600; margin-top: 1.2em; margin-bottom: 0.5em; }
                    .milkdown h4 { font-size: calc(var(--editor-zoom-level, 14px) * 1.1) !important; font-weight: 600; }
                    .milkdown h5, .milkdown h6 { font-size: var(--editor-zoom-level, 14px) !important; font-weight: 600; }
                    .milkdown p, .milkdown li {
                        line-height: 1.7;
                        color: var(--vscode-editor-foreground);
                        margin: 8px 0;
                    }
                    .milkdown blockquote {
                        border-left: 4px solid var(--vscode-widget-border) !important;
                        padding: 12px 16px !important;
                        margin: 16px 0 !important;
                        color: color-mix(in srgb, var(--vscode-editor-foreground) 80%, transparent) !important;
                        background: color-mix(in srgb, var(--vscode-textBlockQuote-background) 50%, transparent) !important;
                        border-radius: 0 6px 6px 0 !important;
                        font-style: italic;
                    }
                    .milkdown blockquote p { margin: 0; }
                    .milkdown code {
                        background: var(--vscode-textCodeBlock-background) !important;
                        color: var(--vscode-textPreformat-foreground) !important;
                        padding: 3px 6px !important;
                        border-radius: 4px !important;
                        font-size: 0.9em;
                    }
                    .milkdown pre {
                        background: var(--vscode-textCodeBlock-background) !important;
                        border: 1px solid var(--vscode-panel-border) !important;
                        border-radius: 6px !important;
                        padding: 16px !important;
                        margin: 16px 0 !important;
                    }
                    .milkdown table {
                        border-collapse: collapse;
                        width: max-content;
                        min-width: 100%;
                        margin: 16px 0;
                        display: block;
                        overflow-x: auto;
                        white-space: nowrap;
                    }
                    .milkdown th, .milkdown td {
                        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 40%, transparent);
                        padding: 10px 14px;
                        text-align: left;
                    }
                    .milkdown th {
                        background: color-mix(in srgb, var(--vscode-editor-foreground) 4%, transparent);
                        font-weight: 700;
                        text-transform: uppercase;
                        font-size: 0.9em;
                        letter-spacing: 0.5px;
                    }
                    /* Footnote Styles (paragraphs after the last horizontal rule) */
                    .milkdown hr:last-of-type {
                        margin-top: 40px;
                        opacity: 0.3;
                    }
                    dl[data-type="footnote_definition"]:first-of-type {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid color-mix(in srgb, var(--vscode-panel-border) 40%, transparent);
                    }
                    dl[data-type="footnote_definition"] {
                        display: flex;
                        align-items: baseline;
                        gap: 8px;
                        font-size: 0.85em;
                        font-weight: 300;
                        opacity: 0.7;
                        margin: 8px 0;
                    }
                    dl[data-type="footnote_definition"] dt {
                        font-weight: 500;
                    }
                    dl[data-type="footnote_definition"] dt::before {
                        content: "[";
                    }
                    dl[data-type="footnote_definition"] dt::after {
                        content: "]:";
                    }
                    dl[data-type="footnote_definition"] dd {
                        margin: 0;
                        flex: 1;
                    }
                    dl[data-type="footnote_definition"] dd > p {
                        margin: 0;
                    }
                    .milkdown ul[data-type="taskList"] {
                        padding-left: 0;
                        list-style: none;
                    }
                    .milkdown li[data-item-type="task"] {
                        list-style-type: none;
                        position: relative;
                    }
                    .milkdown li[data-item-type="task"]::before {
                        content: '';
                        position: absolute;
                        left: -24px;
                        top: 6px;
                        width: 16px;
                        height: 16px;
                        border: 1.5px solid var(--vscode-editorWidget-border);
                        border-radius: 4px;
                        background-color: var(--vscode-editorWidget-background);
                        cursor: pointer;
                        box-sizing: border-box;
                    }
                    .milkdown li[data-item-type="task"][data-checked="true"]::before {
                        background-color: var(--vscode-button-background);
                        border-color: var(--vscode-button-background);
                    }
                    .milkdown li[data-item-type="task"][data-checked="true"]::after {
                        content: '';
                        position: absolute;
                        left: -19px;
                        top: 9px;
                        width: 4px;
                        height: 8px;
                        border: solid var(--vscode-button-foreground);
                        border-width: 0 2px 2px 0;
                        transform: rotate(45deg);
                        cursor: pointer;
                    }
                    .milkdown li[data-item-type="task"] > div {
                        flex: 1;
                        margin: 0;
                    }
                    /* Source Editor CodeMirror Styles */
                    #source-editor {
                        width: 100%;
                        height: calc(100vh - 50px);
                        box-sizing: border-box;
                    /* Sleek Admonition Styles */
                    .milkdown .editor .admonition {
                        margin: 16px 0;
                        padding: 12px 16px;
                        border-radius: 8px;
                        border: 1px solid var(--vscode-panel-border);
                        border-left-width: 1px; /* Override milkdown's default blockquote border */
                        background-color: color-mix(in srgb, var(--vscode-editor-background) 95%, var(--vscode-editor-foreground) 5%);
                        box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                        position: relative;
                        overflow: hidden;
                    }
                    .milkdown .editor .admonition::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; bottom: 0; width: 4px;
                    }
                    .milkdown .editor .admonition-note::before { background-color: #448aff; }
                    .milkdown .editor .admonition-tip::before { background-color: #00c853; }
                    .milkdown .editor .admonition-important::before { background-color: #aa00ff; }
                    .milkdown .editor .admonition-warning::before { background-color: #ff9100; }
                    .milkdown .editor .admonition-caution::before { background-color: #ff1744; }
                    
                    .milkdown .editor .admonition-title {
                        display: flex;
                        align-items: center;
                        font-weight: 600;
                        font-size: 0.95em;
                        margin-bottom: 6px;
                    }
                    .milkdown .editor .admonition-icon { margin-right: 8px; font-size: 1.1em; display: inline-flex; }
                    .milkdown .editor .admonition-note .admonition-title { color: #448aff; }
                    .milkdown .editor .admonition-tip .admonition-title { color: #00c853; }
                    .milkdown .editor .admonition-important .admonition-title { color: #aa00ff; }
                    .milkdown .editor .admonition-warning .admonition-title { color: #ff9100; }
                    .milkdown .editor .admonition-caution .admonition-title { color: #ff1744; }
                    .milkdown .editor .admonition p:last-child { margin-bottom: 0; }
                    


                    .cm-editor {
                        height: 100%;
                        width: 100%;
                        font-family: var(--vscode-editor-font-family, 'Fira Code', monospace);
                        font-size: var(--editor-zoom-level, 14px);
                        border-radius: 4px;
                    }
                    .cm-scroller { font-family: inherit; }
                    .cm-content { font-family: inherit; }
                    }
                    #table-modal h3 { margin-top: 0; color: var(--vscode-editorWidget-foreground); }
                    .modal-label { display: block; margin-bottom: 12px; color: var(--vscode-editorWidget-foreground); font-size: 13px; }
                    .modal-input {
                        width: 100%;
                        box-sizing: border-box;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 6px;
                        margin-top: 4px;
                        border-radius: 2px;
                    }
                    .modal-buttons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
                    .modal-btn { padding: 6px 14px; border: none; cursor: pointer; border-radius: 2px; font-size: 13px; }
                    .btn-cancel { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                    .btn-cancel:hover { background: var(--vscode-button-secondaryHoverBackground); }
                    .btn-confirm { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                    .btn-confirm:hover { background: var(--vscode-button-hoverBackground); }
                    
                    /* Flyout Outline */
                    .flyout-outline {
                        position: fixed;
                        top: 100px;
                        right: 0;
                        height: calc(100vh - 100px);
                        width: 40px;
                        z-index: 90;
                        transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        overflow-x: hidden;
                        overflow-y: hidden;
                        padding: 20px 0;
                        box-sizing: border-box;
                    }
                    .flyout-outline:hover {
                        width: 250px;
                        overflow-y: auto;
                        background: color-mix(in srgb, var(--vscode-editor-background) 85%, transparent);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        border-left: 1px solid var(--vscode-panel-border);
                        box-shadow: -4px 0 12px rgba(0,0,0,0.1);
                    }
                    .flyout-container {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        padding-left: 12px;
                        padding-right: 24px;
                    }
                    .outline-item {
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        height: 24px;
                        color: var(--vscode-editor-foreground, #cccccc);
                        text-decoration: none;
                        font-size: 13px;
                        border-radius: 4px;
                        transition: all 0.2s;
                        white-space: nowrap;
                    }
                    .outline-item:hover {
                        color: var(--vscode-textLink-foreground);
                        background: var(--vscode-list-hoverBackground);
                    }
                    .outline-dash {
                        display: inline-block;
                        height: 2px;
                        background-color: var(--vscode-editor-foreground, #cccccc);
                        opacity: 0.5;
                        border-radius: 2px;
                        margin-right: 12px;
                        flex-shrink: 0;
                        transition: background-color 0.2s;
                    }
                    .outline-item:hover .outline-dash {
                        background-color: var(--vscode-textLink-foreground);
                    }
                    .outline-text {
                        opacity: 0;
                        transition: opacity 0.2s;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .flyout-outline:hover .outline-text {
                        opacity: 1;
                    }
                    /* Hierarchy styling - Collapsed (Right Aligned) */
                    .outline-h1 { padding-left: 2px; }
                    .outline-h1 .outline-dash { width: 14px; height: 3px; background-color: var(--vscode-editor-foreground); opacity: 0.8; }
                    
                    .outline-h2 { padding-left: 6px; }
                    .outline-h2 .outline-dash { width: 10px; height: 2px; }
                    
                    .outline-h3 { padding-left: 10px; }
                    .outline-h3 .outline-dash { width: 6px; height: 2px; opacity: 0.4; }
                    
                    .outline-h4 { padding-left: 12px; }
                    .outline-h4 .outline-dash { width: 4px; height: 2px; opacity: 0.3; }

                    /* Hierarchy styling - Hovered (Indented) */
                    .flyout-outline:hover .outline-h1 { padding-left: 0px; }
                    .flyout-outline:hover .outline-h2 { padding-left: 14px; }
                    .flyout-outline:hover .outline-h3 { padding-left: 28px; }
                    .flyout-outline:hover .outline-h4 { padding-left: 42px; }

                    /* Print Pagination and Styles */
                    @media print {
                        body {
                            background: white !important;
                            color: black !important;
                            height: auto !important;
                            overflow: visible !important;
                        }
                        
                        /* Hide non-printable elements */
                        .toolbar,
                        .flyout-outline,
                        #metadata-container,
                        .context-menu,
                        #table-modal-overlay,
                        #table-modal,
                        ::-webkit-scrollbar {
                            display: none !important;
                        }
                        
                        /* Reset editor container constraints for natural pagination */
                        #editor, .milkdown, .ProseMirror, .cm-editor {
                            height: auto !important;
                            overflow: visible !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            max-width: none !important;
                            box-shadow: none !important;
                            background: white !important;
                        }
                        
                        /* Prevent elements from breaking across pages */
                        img, pre, blockquote, table, tr, td, th, .admonition {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                        
                        /* Prevent headings from being orphaned at the bottom of a page */
                        h1, h2, h3, h4, h5, h6 {
                            page-break-after: avoid;
                            break-after: avoid;
                        }
                        
                        /* Orphan and widow control for paragraphs */
                        p, li {
                            orphans: 3;
                            widows: 3;
                        }
                        
                        /* Admonition contrast for printing */
                        .milkdown .editor .admonition {
                            border: 1px solid #ccc !important;
                            border-left-width: 4px !important;
                            background-color: transparent !important;
                            box-shadow: none !important;
                        }
                    }
                    
                    /* Find Widget */
                    .find-widget {
                        display: none;
                        position: fixed;
                        top: 10px;
                        right: 20px;
                        background: var(--vscode-editorWidget-background);
                        border: 1px solid var(--vscode-editorWidget-border);
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
                        z-index: 1000;
                        border-radius: 6px;
                        padding: 8px 12px;
                        flex-direction: column;
                        gap: 8px;
                        width: 320px;
                    }
                    .find-widget.visible {
                        display: flex;
                    }
                    .find-row {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .find-input-container {
                        position: relative;
                        flex: 1;
                        display: flex;
                        align-items: center;
                    }
                    .find-input {
                        width: 100%;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 4px 28px 4px 6px;
                        border-radius: 2px;
                        font-family: inherit;
                        font-size: 13px;
                        outline: none;
                        box-sizing: border-box;
                    }
                    .find-input:focus {
                        border-color: var(--vscode-focusBorder);
                    }
                    .find-btn {
                        background: transparent;
                        border: none;
                        color: var(--vscode-icon-foreground);
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 3px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .find-btn:hover {
                        background: var(--vscode-toolbar-hoverBackground);
                    }
                    .find-btn.active {
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                    }
                    .find-btn svg { width: 14px; height: 14px; }
                    .match-count {
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                        margin: 0 4px;
                        min-width: 55px;
                        text-align: right;
                        white-space: nowrap;
                    }
                    .search-match {
                        background-color: var(--vscode-editor-findMatchHighlightBackground, rgba(234, 92, 0, 0.33));
                        border-radius: 2px;
                    }
                    .search-match-active {
                        background-color: var(--vscode-editor-findMatchBackground, rgba(234, 92, 0, 0.5));
                        outline: 1px solid var(--vscode-editor-findMatchBorder, transparent);
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <div class="dropdown">
                        <button title="History" style="padding-right: 2px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-history"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" style="margin-left: 2px;"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <div class="dropdown-content">
                            <div class="dropdown-item" id="btn-undo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-undo" style="margin-right: 6px;"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg> Undo
                            </div>
                            <div class="dropdown-item" id="btn-redo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-redo" style="margin-right: 6px;"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg> Redo
                            </div>
                        </div>
                    </div>
                    <div class="divider"></div>
                    
                    <select id="heading-select" class="toolbar-select" title="Headings">
                        <option value="0">¶ Paragraph</option>
                        <option value="1">H1 Heading 1</option>
                        <option value="2">H2 Heading 2</option>
                        <option value="3">H3 Heading 3</option>
                        <option value="4">H4 Heading 4</option>
                        <option value="5">H5 Heading 5</option>
                        <option value="6">H6 Heading 6</option>
                    </select>
                    <div class="divider"></div>
                    
                    <button id="btn-bold" title="Bold (Cmd+B)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bold"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>
                    </button>
                    <button id="btn-italic" title="Italic (Cmd+I)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-italic"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>
                    </button>
                    <button id="btn-strike" title="Strikethrough">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-strikethrough"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>
                    </button>
                    <button id="btn-quote" title="Insert Quote (Cmd+Opt+Q)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-quote"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>
                    </button>
                    <button id="btn-footnote" title="Insert Footnote">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-superscript"><path d="m4 19 8-8" /><path d="m12 19-8-8" /><path d="M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06" /></svg>
                    </button>
                    <button id="btn-code" title="Code Block (Cmd+Opt+C)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    </button>
                    <div class="dropdown">
                        <button title="Lists" style="padding-right: 2px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" style="margin-left: 2px;"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <div class="dropdown-content">
                            <div class="dropdown-item" id="btn-bullet">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list" style="margin-right: 6px;"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg> Bullet List
                            </div>
                            <div class="dropdown-item" id="btn-ordered">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-ordered" style="margin-right: 6px;"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg> Ordered List
                            </div>
                            <div class="dropdown-item" id="btn-task">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-todo" style="margin-right: 6px;"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg> Task List
                            </div>
                        </div>
                    </div>
                    <div class="divider"></div>
                    
                    <button id="btn-link" title="Insert Link (Cmd+K)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    </button>
                    <button id="btn-wikilink" title="Insert Wikilink ([ [)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bracket"><path d="M7 4H5v16h2"/><path d="M17 4h2v16h-2"/></svg>
                    </button>
                    <button id="btn-image" title="Insert Image (Cmd+Opt+I)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    </button>
                    <button id="btn-table" title="Insert Table (Cmd+Opt+T)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="3" y2="21"/><line x1="15" x2="15" y1="3" y2="21"/></svg>
                    </button>
                    <button id="btn-toc" title="Insert Table of Contents">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-tree"><path d="M21 12h-8"/><path d="M21 6H8"/><path d="M21 18h-8"/><path d="M12 12h-2"/><path d="M12 18h-2"/><path d="M3 6v4c0 1.1.9 2 2 2h3"/><path d="M3 10v6c0 1.1.9 2 2 2h3"/></svg>
                    </button>
                    <div class="dropdown">
                        <button id="btn-admonition" title="Insert Admonition" style="padding-right: 2px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-warning"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v2"/><path d="M12 13h.01"/></svg>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" style="margin-left: 2px;"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <div class="dropdown-content" id="admonition-menu">
                            <div class="dropdown-item" data-val="NOTE"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-notepad-text" style="margin-right: 6px; color: #448aff;"><path d="M8 2v4" /><path d="M12 2v4" /><path d="M16 2v4" /><rect width="16" height="18" x="4" y="4" rx="2" /><path d="M8 10h6" /><path d="M8 14h8" /><path d="M8 18h5" /></svg>Note</div>
                            <div class="dropdown-item" data-val="TIP"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-big" style="margin-right: 6px; color: #00c853;"><path d="M21.801 10A10 10 0 1 1 17 3.335" /><path d="m9 11 3 3L22 4" /></svg>Tip</div>
                            <div class="dropdown-item" data-val="IMPORTANT"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge-alert" style="margin-right: 6px; color: #aa00ff;"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>Important</div>
                            <div class="dropdown-item" data-val="WARNING"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert" style="margin-right: 6px; color: #ff9100;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>Warning</div>
                            <div class="dropdown-item" data-val="CAUTION"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-warning" style="margin-right: 6px; color: #ff1744;"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /><path d="M12 15h.01" /><path d="M12 7v4" /></svg>Caution</div>
                        </div>
                    </div>
                    
                    <div class="spacer"></div>
                    <button id="btn-search" title="Find & Replace (Cmd+F)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </button>
                    <button id="btn-export-pdf" title="Export PDF">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                    </button>
                    <button id="btn-copy" title="Copy Rich Text">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                    <div class="divider"></div>
                    <div class="dropdown">
                        <button title="Zoom" style="padding-right: 2px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zoom-in"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" style="margin-left: 2px;"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <div class="dropdown-content dropdown-content-right">
                            <div class="dropdown-item" id="btn-zoom-in">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zoom-in" style="margin-right: 6px;"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg> Zoom In
                            </div>
                            <div class="dropdown-item" id="btn-zoom-out">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zoom-out" style="margin-right: 6px;"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg> Zoom Out
                            </div>
                        </div>
                    </div>
                    <div class="divider"></div>
                    <button id="btn-toggle" title="Toggle Source Mode">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code-xml"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
                    </button>
                </div>

                <!-- YAML Metadata UI -->
                <div id="metadata-container">
                    <details>
                        <summary>
                            <span>${propertiesLabel}</span>
                            <svg class="chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </summary>
                        <div id="metadata-content" contenteditable="true"></div>
                    </details>
                </div>

                <div id="editor"></div>
                <div id="source-editor" style="display: none;"></div>
                
                <div id="flyout-outline" class="flyout-outline">
                    <div class="flyout-container" id="flyout-container"></div>
                </div>
                
                <!-- Table Modal -->
                <div id="table-modal-overlay"></div>
                <div id="table-modal">
                    <h3>Insert Table</h3>
                    <label class="modal-label">Rows: <input type="number" id="table-rows" class="modal-input" value="3" min="1" max="20"/></label>
                    <label class="modal-label">Columns: <input type="number" id="table-cols" class="modal-input" value="3" min="1" max="20"/></label>
                    <div class="modal-buttons">
                        <button class="modal-btn btn-cancel" id="btn-table-cancel">Cancel</button>
                        <button class="modal-btn btn-confirm" id="btn-table-confirm">Insert</button>
                    </div>
                </div>
                
                <div id="table-context-menu" class="context-menu">
                    <div class="context-menu-item" id="ctx-add-row">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grid-2x2-plus"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/><path d="M3 12h18"/><path d="M16 19v-4"/><path d="M14 17h4"/></svg>
                        Add Row
                    </div>
                    <div class="context-menu-item" id="ctx-add-col">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-between-vertical-start"><rect width="7" height="13" x="3" y="8" rx="1"/><path d="m15 2-3 3 3 3"/><rect width="7" height="13" x="14" y="8" rx="1"/><path d="M12 5v16"/></svg>
                        Add Column
                    </div>
                    <div class="context-menu-item" id="ctx-del-row" style="color: var(--vscode-errorForeground);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-square"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
                        Delete Row
                    </div>
                    <div class="context-menu-item" id="ctx-del-col" style="color: var(--vscode-errorForeground);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-square"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
                        Delete Column
                    </div>
                    <div class="divider" style="margin: 4px 0; background: var(--vscode-panel-border); height: 1px;"></div>
                    <div class="context-menu-item" id="ctx-del-table" style="color: var(--vscode-errorForeground);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        Delete Table
                    </div>
                </div>

                <div id="text-context-menu" class="context-menu">
                    <div class="context-menu-item" id="ctx-send-to-ai">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                        <span>Send to AI Context</span>
                    </div>
                </div>
                
                <div id="image-context-menu" class="context-menu">
                    <div class="context-menu-item" id="ctx-img-rename">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        Rename Image
                    </div>
                    <div class="context-menu-item" id="ctx-img-reveal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-search"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><circle cx="12" cy="13" r="2"/><path d="m14 15 1.5 1.5"/></svg>
                        Reveal in Explorer
                    </div>
                </div>
                
                <!-- Find & Replace Widget -->
                <div id="find-widget" class="find-widget">
                    <div class="find-row">
                        <button id="btn-find-toggle" class="find-btn" style="margin-right: 4px;" title="Toggle Replace">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="icon-find-toggle"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                        <div class="find-input-container">
                            <input type="text" id="find-input" class="find-input" placeholder="Find">
                            <button id="btn-find-case" class="find-btn" style="position: absolute; right: 2px;" title="Match Case">
                                <span style="font-size: 11px; font-weight: 600; font-family: monospace;">Aa</span>
                            </button>
                        </div>
                        <span id="find-count" class="match-count">No results</span>
                        <button id="btn-find-prev" class="find-btn" title="Previous Match (Shift+Enter)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg></button>
                        <button id="btn-find-next" class="find-btn" title="Next Match (Enter)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></button>
                        <button id="btn-find-close" class="find-btn" title="Close (Escape)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                    </div>
                    <div class="find-row" id="replace-row" style="display: none;">
                        <div class="find-input-container">
                            <input type="text" id="replace-input" class="find-input" placeholder="Replace">
                        </div>
                        <button id="btn-replace" class="find-btn" title="Replace (Enter)" style="font-size: 12px; padding: 4px 8px; border: 1px solid var(--vscode-button-border, transparent); background: var(--vscode-button-background); color: var(--vscode-button-foreground);">Replace</button>
                        <button id="btn-replace-all" class="find-btn" title="Replace All (Cmd+Enter)" style="font-size: 12px; padding: 4px 8px; border: 1px solid var(--vscode-button-border, transparent); background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);">All</button>
                    </div>
                </div>

                <script src="${scriptUri}"></script>
            </body>
            </html>`;
   // remove last brace
}
