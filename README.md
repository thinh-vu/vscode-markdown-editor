# Markdown Live Editor

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=vnstock.obsidian-markdown-live-editor)
[![Open VSX](https://img.shields.io/open-vsx/v/vnstock/obsidian-markdown-live-editor.svg?label=Open%20VSX)](https://open-vsx.org/extension/vnstock/obsidian-markdown-live-editor)
[![GitHub issues](https://img.shields.io/github/issues/thinh-vu/vscode-markdown-editor.svg)](https://github.com/thinh-vu/vscode-markdown-editor/issues)
[![GitHub stars](https://img.shields.io/github/stars/thinh-vu/vscode-markdown-editor.svg)](https://github.com/thinh-vu/vscode-markdown-editor/stargazers)

A seamless, Obsidian-like Markdown WYSIWYG editor built natively for VS Code / Antigravity IDE. Experience the perfect blend of a frictionless writing environment with the power of modern developer tools.

![First Impression](https://vnstocks.com/images/markdown-live-editor/vs-code-markdown-live-editor-web.png)

## ✨ Features

### 🌟 Killer Features

* **Obsidian Experience Without the Vault Overhead**: Enjoy the frictionless, elegant writing experience of Obsidian directly inside VS Code. No need to create heavy vaults or complex setups just to edit a project README or documentation. One editor to rule your code and docs!
* **True WYSIWYG & Blazing Fast Performance**: Experience lightning-fast, buttery-smooth Markdown editing without the clunky split-screen. Thanks to a highly optimized, web-first architecture, the extension loads instantly and performs flawlessly even in pure web environments like `vscode.dev`.
* **Zero-Lag Dual-Mode Synchronization**: Switch instantly between the rich Live Editor and a robust Source Mode powered by CodeMirror 6. Unlike other editors that claim to sync but suffer from intense lag or erratic cursor jumps, our editor delivers a rock-solid, buttery-smooth sync that accurately preserves your precise cursor position during real-time typing and DOM updates.

  <details>
  <summary>📸 View Source Mode Editing</summary>

  ![Source Mode Editing](https://vnstocks.com/images/markdown-live-editor/code-view.png)

  </details>
* **Slash Commands & Dynamic Templates**: Type `/` to instantly access a sleek quick-insert menu enriched with premium Lucide icons. Ditch clunky JSON snippets by configuring a local folder of your own Markdown templates and seamlessly inserting them into your current document using the Slash command or keyboard shortcuts (`Cmd/Ctrl + Shift + E`).

  <details>
  <summary>📸 View Slash Commands</summary>

  ![Slash Commands](https://vnstocks.com/images/markdown-live-editor/slash-commands.png)

  </details>
* **Smart Asset & Media Management**:

  * **Auto-Paste**: Automatically save attached images to a customizable local directory when pasting directly into the editor.
  * **Smart Deletion**: When you delete a markdown file, the editor intelligently asks if you want to clean up its attached images and assets to prevent system junk!
  * **Auto-resolve**: Effortlessly resolves absolute image paths by prefixing them in the preview (e.g. for a Next.js `public` directory), keeping your raw Markdown code clean and portable. You can also rename images effortlessly via the context menu.

  <details>
  <summary>📸 View Media Management</summary>

  ![Image Pasting Configuration](https://vnstocks.com/images/markdown-live-editor/public-image-path.png)
  ![Image Rename Context Menu](https://vnstocks.com/images/markdown-live-editor/trigger-image-file-rename.png)

  </details>
* **Workspace Sidebar Explorer**:
  * A dedicated native Sidebar panel for managing your Markdown notes, separating your writing vault from your code explorer.
  * Beautiful note cards featuring automatic **Image Thumbnail Extraction** and text previews.
  * Smart organization with two dedicated tabs: **Recent Files** (for quick access to active work) and **Vault Files** (for alphabetical browsing).
  * Filter the noise: Configure a specific `markdownLive.sidebarScanDirectory` so the sidebar only shows your actual notes, ignoring `node_modules` or build folders.
  * Consolidated quick-actions to create empty notes or spawn notes directly from your templates.
* **Seamless AI Agent Integration (Send to AI Context)**:
  * Highlight any excerpt in the live editor, right-click to select **"Send to AI Context"**, or use keyboard shortcut `Cmd + Shift + L` (`Ctrl + Shift + L` on Windows/Linux).
  * Effortlessly tags and injects the selected context directly into your active **Antigravity AI Agent** / VS Code Chat panel, attaching direct file references with pinpoint precision.
* **Beautiful PDF Export**:
  * Export your Markdown documents into professional, beautifully styled PDFs with a single click.
  * Powered by Paged.js for true print pagination, complete with automatic Table of Contents generation and customizable print styles.

### ✨ Quality of Life & Extended Syntax

**Navigation & Organization**

* **Dynamic Flyout Outline**: A beautifully animated hierarchical outline navigation on the right edge. It expands gracefully to reveal full text when hovered, keeping your workspace clean.

  <details>
  <summary>📸 View Flyout Outline</summary>

  ![Article Outline Navigation](https://vnstocks.com/images/markdown-live-editor/article-outline.png)
  ![Flyout Outline Interface](https://vnstocks.com/images/markdown-live-editor/flyout-outline.png)

  </details>
* **YAML Frontmatter & Metadata**: Built-in parsing for YAML metadata (like Obsidian). Offers an elegant, collapsible UI to edit document properties without cluttering your writing.

  <details>
  <summary>📸 View Metadata & Footnotes</summary>

  ![Features Overview](https://vnstocks.com/images/markdown-live-editor/document-features.png)

  </details>
* **Smart Wikilinks**: Type `[[` to trigger a file search dialog, instantly converting selections into standard relative Markdown links or image embeds.

  <details>
  <summary>📸 View Smart Wikilinks</summary>

  ![Wikilink Support](https://vnstocks.com/images/markdown-live-editor/wikilink.png)

  </details>

**Extended Markdown Syntax**

* **Advanced Tables**: Manage Markdown tables effortlessly via an intuitive right-click context menu to add/remove rows/columns, or insert custom dimensions directly from the toolbar.

<details>
  <summary>📸 View Context Menu for Table Editting</summary>

![Table Context Menu](https://vnstocks.com/images/markdown-live-editor/table-context-menu.png)

  </details>

* **Mermaid & HTML Rendering**: Natively render complex Mermaid charts/diagrams on the fly and support custom inline HTML blocks for ultimate flexibility.
* **GitHub-Flavored Elements**: Native support for GFM, admonitions (beautiful rich-text alerts for Notes, Tips, Warnings, Cautions, and Important callouts), footnotes, and elegant hashtag rendering (`#tag`).

**Frictionless UX**

* **Comprehensive Interactive Toolbar**: A sleek, sticky toolbar packed with essential formatting tools. Instantly apply formatting with a single click.

  <details>
  <summary>📸 View Toolbar</summary>

  ![Interactive Toolbar](https://vnstocks.com/images/markdown-live-editor/toolbar.png)

  </details>
  
* **Auto-Save & Auto-Refresh**: Your notes are reliably saved as you write. The live editor also updates on the fly whenever you tweak fonts, UI languages, or image paths—no manual reloads required.
* **Configurable Typography**: Switch between a modern `sans-serif` default or an immersive `serif` (Substack-style) font via VS Code settings.

## 🚀 Getting Started

There are 3 ways to launch the Live Editor:

1. Use the keyboard shortcut `Cmd + Option + Shift + M` (or `Ctrl + Alt + Shift + M` on Windows/Linux).
2. Right-click any `.md` file in the Explorer and select **"Open in Markdown Live Editor"**.
3. Click the **Edit** (pencil) icon in the top right corner of the active raw text view.

![3 Ways to Open Live Editor](https://vnstocks.com/images/markdown-live-editor/3-ways-to-open-live-editor.png)

## ⚙️ Configuration

The extension comes with several customization options available in your VS Code settings, such as UI language, typography fonts, image paths, and Slash Command toggles.

![Settings UI](https://vnstocks.com/images/markdown-live-editor/settings.png)
![Settings Dialog](https://vnstocks.com/images/markdown-live-editor/settings-dialog.png)

## ⌨️ Keyboard Shortcuts

| Command                | Mac                      | Windows/Linux            |
| ---------------------- | ------------------------ | ------------------------ |
| **Open Live Editor**   | `Cmd + Ctrl + Shift + M` | `Ctrl + Alt + Shift + M` |
| **Send to AI Context** | `Cmd + Shift + L`        | `Ctrl + Shift + L`       |
| **Insert Link**        | `Cmd + K`                | `Ctrl + K`               |
| **Insert Table**       | `Cmd + Option + T`       | `Ctrl + Shift + T`       |
| **Insert Code Block**  | `Cmd + Option + C`       | `Ctrl + Shift + C`       |
| **Toggle Bold**        | `Cmd + Option + B`       | `Ctrl + Shift + B`       |
| **Toggle Italic**      | `Cmd + I`                | `Ctrl + I`               |
| **Insert Heading 1-6** | `Cmd + Option + 1-6`     | `Ctrl + Shift + 1-6`     |

## 🤝 Credits & Acknowledgements

* **Author**: [Thinh Vu](https://github.com/thinh-vu)
* **Project Ecosystem**: Brought to you by [Vnstocks](https://vnstocks.com/).
* **Open Source Foundations**: Built on top of the amazing [Milkdown](https://milkdown.dev/) and [CodeMirror 6](https://codemirror.net/).

***

*Crafted for developers, researchers, and writers who demand an elegant, unified workspace.*
