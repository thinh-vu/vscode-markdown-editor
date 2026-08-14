# Changelog

All notable changes to the "obsidian-markdown-live-editor" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v0.0.4

This release brings a massive architectural overhaul and introduces a suite of premium features designed to make writing in VS Code a truly frictionless, Obsidian-like experience.

### ✨ Highlights & New Features
* **Modular Architecture**: Completely refactored webview communication and editor orchestration, deeply integrating Milkdown (WYSIWYG) and CodeMirror 6 (Source Mode) into robust, performant modules.
* **Smart Asset & Media Management**:
  * **Auto-Cleanup**: Intelligently detects when a markdown file is deleted and prompts to clean up orphaned image assets to prevent system junk.
  * **Image Renaming**: Added the ability to rename local image assets directly from the editor's right-click context menu.
  * **Path Prefixing**: Added support for configurable public path prefixes, enabling seamless compatibility with frameworks like Next.js and Vite.
* **Dynamic Template System**: Introduced local Markdown template insertion, accessible via a filtering Slash command menu (`/`) or direct VS Code keyboard shortcuts.
* **Rich Markdown Extensions**:
  * Added native **LaTeX math** support for rendering formulas.
  * Added beautiful, GitHub-flavored **Admonition styling** (Notes, Warnings, Tips, etc.).
  * Added real-time **Hashtag highlighting** (`#tag`) synced across both editors.
  * Introduced a dynamic **Document Outline** (Table of Contents) and **Metadata UI** embedded directly within the editor.
* **Refined Typography & UI**:
  * **Dynamic Fonts**: Switch between modern sans-serif and immersive serif fonts in settings, with the Live Editor refreshing instantly without reloading.
  * **Polished Toolbar**: Overhauled the interactive toolbar, adding an organized history dropdown.
  * **Premium Icons**: Replaced plain text with crisp, modern SVG icons in the quick-insert Slash menu.
  * Re-ordered User Settings to improve logical configuration flow.

### 🐛 Bug Fixes
* **Interactive HTML**: Fixed native HTML `<details>` and `<summary>` (collapsible) tags so they can be toggled smoothly directly inside the WYSIWYG editor.
* **Infinite Dirty-Dot Loop**: Resolved an issue where the file tab would constantly show an unsaved indicator due to `CRLF` / `LF` line-ending mismatches during Auto-Save.
* **Live Editor Sync**: Fixed a critical regression where text changes made inside the Live Editor were failing to emit edit events back to the VS Code document.

### 🛠 Chore & Miscellaneous
* Added **Internationalization (i18n)** support for the extension UI.
* Configured full project linting, formatting, and unit testing infrastructure.
* Updated project license to **GPL-3.0**.
* Improved the repository's `README.md` layout, adding categorized features and collapsible screenshot previews.

## v0.0.2

### Added

* Initial project setup with Milkdown editor.
* Basic bi-directional synchronization between extension host and webview.
* VS Code `markdownLive.language` configuration for i18n support.
* Configurable image public path via `markdownLive.imagePublicPath`.
