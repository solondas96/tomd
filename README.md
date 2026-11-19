<div align="center">

# toMD

### Any Document → Clean Markdown

Convert PDF, DOCX, PPTX, XLSX, HTML, EPUB, images, and 10+ other formats to structured, LLM-ready Markdown — entirely in your browser.

**No server. No uploads. No sign-up. Zero data leaves your device.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-solondas96.github.io/tomd-22c55e?style=for-the-badge&logo=github)](https://solondas96.github.io/tomd/)
[![Deploy](https://github.com/solondas96/tomd/actions/workflows/deploy.yml/badge.svg)](https://github.com/solondas96/tomd/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-224_passing-brightgreen?style=for-the-badge)](#testing)

</div>

---

## Why toMD?

Most document-to-markdown tools require uploading files to a remote server, installing desktop applications, or running heavy Python environments. **toMD** runs entirely in the browser:

> Drop a file in the browser. Get clean Markdown out. Nothing else happens.

Every conversion executes locally using JavaScript, WebAssembly, and standard Web APIs — your documents never leave your machine. This makes it safe for confidential documents, air-gapped environments, and security-conscious workflows.

---

## Supported Formats

| Category | Formats | Processing Engine |
|:---------|:--------|:------------------|
| **Documents** | `.pdf` | PDF.js (text layer + layout analysis) |
| | `.docx` | Mammoth.js → HTML → Turndown |
| | `.pptx` | JSZip (XML slide text extraction) |
| | `.epub` | JSZip + Turndown (XHTML chapter extraction) |
| | `.rtf` | Pure JS RTF control word stripping |
| **Spreadsheets** | `.xlsx` `.xls` | SheetJS (multi-sheet GFM tables) |
| | `.csv` `.tsv` | Native RFC 4180 stateful parser |
| **Web & Data** | `.html` `.htm` | Turndown with GFM table support |
| | `.xml` `.json` | Formatted code blocks with syntax styling |
| **Images (OCR)** | `.png` `.jpg` `.jpeg` `.webp` `.gif` `.bmp` `.tiff` | Tesseract.js 5 (WASM worker) |
| **Text & Code** | `.txt` `.md` `.tex` `.latex` | Native text / LaTeX macro parser |

---

## Features

| | Feature | Description |
|:--|:--------|:------------|
| 📄 | **Smart Heading Detection** | Classifies H1–H4 by computing statistical font-size histograms and body-text modes |
| 📰 | **Multi-Column Detection** | Identifies 2-column PDF layouts via X-coordinate clustering to prevent interleaved text |
| 📊 | **PDF Table Reconstruction** | Clusters horizontally and vertically aligned text blocks into GitHub Flavored Markdown (GFM) tables |
| 🔍 | **OCR Engine** | Extracts text from scanned/image-only PDFs and standalone images using Tesseract.js in 12+ languages |
| 📦 | **Batch Processing & Merging** | Convert multiple files concurrently, merge into one document with auto-generated TOC, or export as ZIP |
| 📁 | **Folder Drag & Drop** | Recursively scans dropped directories for supported files |
| ✏️ | **Live Split Editor** | Dual-pane markdown editor with synchronized HTML preview, live word/char counters, and syntax overlay |
| ↩️ | **Undo / Redo History** | Debounced 50-step snapshot stack (`Ctrl+Z`, `Ctrl+Y`) for confident editing |
| 🔎 | **Find & Replace** | Fast full-text and RegEx search with match counter and selection scrolling |
| 💾 | **Multi-Format Export** | Download as `.md`, `.html`, `.txt`, or compile client-side to OpenXML `.docx` without server dependencies |
| 👁️ | **Source PDF Viewer** | Embedded multi-page PDF canvas inspection tab |
| 🌐 | **URL Import** | Convert remote web pages directly to Markdown via resilient CORS proxies |
| 📋 | **Clipboard Ingestion** | Paste images (`image/*`) or HTML directly from the clipboard (`Ctrl+V`) for instant conversion |
| 🕒 | **Conversion History** | Auto-saves recent conversions with localStorage persistence and instant restore |
| 🌙 | **Dark Mode** | System-aware theme toggle with persistent preferences |
| 📱 | **Installable PWA** | Web app manifest (`manifest.json`) and service worker (`sw.js`) for full offline desktop/mobile installation |
| ⌨️ | **Keyboard Shortcuts** | `Ctrl+S` save, `Ctrl+F` find, `Ctrl+E` edit mode, `Ctrl+D` theme, `?` shortcuts dialog |

---

## Architecture

toMD is a zero-dependency, zero-build static web application. No bundlers, no frameworks, no transpilation — standard ES modules served directly to the browser.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                 Browser                                   │
├───────────────────────────────────────────────────────────────────────────┤
│  index.html (UI layout & script tags)                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  main.js (Entry point & event listeners)                            │  │
│  │  ┌─────────┐ ┌─────────┐ ┌────────────────────┐ ┌────────────────┐  │  │
│  │  │ state.js│ │  ui.js  │ │  file-handler.js   │ │  features.js   │  │  │
│  │  │ reactive│ │ editor  │ │ validation, batch  │ │ clipboard, URL │  │  │
│  │  │ store   │ │ history │ │ ZIP export, folder │ │ frontmatter    │  │  │
│  │  └─────────┘ └─────────┘ └────────────────────┘ └────────────────┘  │  │
│  │  ┌───────────────────────────────────────────────────────────────┐  │  │
│  │  │                       converters/                             │  │  │
│  │  │  index.js ─── Format router & option resolver                 │  │  │
│  │  │  pdf.js ───── PDF.js text layer + layout heuristics + OCR    │  │  │
│  │  │  formats.js ─ DOCX, PPTX, XLSX, EPUB, CSV, LaTeX, RTF, etc.   │  │  │
│  │  └───────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  sw.js — Service Worker (resilient offline caching via Cache API)   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────────────────┤
│  Dynamic CDN Libraries (loaded on-demand with exponential retry):          │
│  PDF.js · Tesseract.js · Marked · DOMPurify · Turndown · Mammoth · SheetJS│
└───────────────────────────────────────────────────────────────────────────┘
```

### Design Principles

- **Privacy by Design** — All parsing and transformations occur strictly in-memory client-side. Zero server uploads.
- **Zero Build Tooling** — Clone and serve. No `npm install`, no webpack, no Vite, no Node.js build step required.
- **Progressive Enhancement** — Heavy libraries (Tesseract.js, Mammoth, SheetJS, JSZip) load dynamically only when their corresponding format is processed.
- **Resilient Offline Architecture** — Service worker precaches the application shell and core CDN libraries, utilizing `Promise.allSettled` to prevent network faults during install.

---

## Quick Start

### Use Online

Visit **[solondas96.github.io/tomd](https://solondas96.github.io/tomd/)** — no installation required.

### Run Locally

Clone the repository and serve with any local HTTP static server:

```bash
# Clone the repository
git clone https://github.com/solondas96/tomd.git
cd tomd

# Python 3
python -m http.server 3000
# → Open http://localhost:3000
```

Alternative static servers:

```bash
# Node.js
npx serve .

# PHP
php -S localhost:3000
```

Or open `index.html` via the **VS Code Live Server** extension.

---

## Project Structure

```
tomd/
├── .github/
│   └── workflows/
│       └── deploy.yml          GitHub Pages deployment workflow
├── .nojekyll                   Bypasses Jekyll processing on GitHub Pages
├── index.html                  Application markup and CDN references
├── manifest.json               PWA manifest for desktop/mobile install
├── sw.js                       Service Worker for offline caching
├── css/
│   └── style.css               Responsive theme (indigo palette, light/dark variables)
├── js/
│   ├── main.js                 Entry point, keyboard shortcuts, module wiring
│   ├── config.js               Application constants, format map, threshold ratios
│   ├── state.js                Reactive state model & localStorage sync
│   ├── dom.js                  Cached DOM element references
│   ├── utils.js                Pure utilities (escaping, slugify, wordCount, loadScript)
│   ├── ui.js                   Toasts, live editor, undo/redo, find/replace, exports
│   ├── features.js             Clipboard paste, CORS proxy URL fetch, frontmatter
│   ├── file-handler.js         Drop zone, folder recursion, batch queue, ZIP generation
│   └── converters/
│       ├── index.js            Format router (isSupported, getConversionOptions)
│       ├── pdf.js              PDF.js extraction, column/heading analysis, OCR fallback
│       └── formats.js          DOCX, PPTX, XLSX, EPUB, CSV, LaTeX, RTF, XML, JSON
└── tests/
    ├── index.html              In-browser test runner
    ├── framework.js            Lightweight describe/it/expect test harness
    ├── run-cdp.py              Headless test runner via Chrome DevTools Protocol
    └── test-*.js               12 test suites (224 automated unit & security tests)
```

---

## Dependencies

All third-party libraries load dynamically from verified CDNs on demand:

| Library | Version | Purpose |
|:--------|:--------|:--------|
| [PDF.js](https://mozilla.github.io/pdf.js/) | 3.11 | High-fidelity PDF text layer and canvas rendering |
| [Tesseract.js](https://tesseract.projectnaptha.com/) | 5 | In-browser WebAssembly OCR engine |
| [Marked](https://marked.js.org/) | 12 | Markdown to HTML preview rendering |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3.1 | XSS sanitization of rendered preview HTML |
| [Turndown](https://github.com/mixmark-io/turndown) | 7 | HTML to Markdown conversion with GFM rules |
| [Mammoth](https://github.com/mwilliamson/mammoth.js) | 1 | Client-side Word (.docx) to HTML extraction |
| [JSZip](https://stuk.github.io/jszip/) | 3.10 | ZIP export creation and PPTX/EPUB archive decompression |
| [SheetJS](https://sheetjs.com/) | 0.20 | Excel (.xlsx, .xls) workbook parsing |

---

## Testing

The project includes an in-house browser test suite (**224 tests across 12 suites**) covering parser correctness, state synchronization, UI interactions, edge cases, and security vulnerabilities (XSS and script injection).

```bash
# 1. Run in browser
python -m http.server 3001
# → Navigate to http://localhost:3001/tests/index.html

# 2. Run headless via Chrome DevTools Protocol
google-chrome --headless --remote-debugging-port=9222 --remote-allow-origins=* http://localhost:3001/tests/index.html
python tests/run-cdp.py
```

---

## Security & Privacy Model

| Layer | Protection Mechanism |
|:------|:---------------------|
| **Data Privacy** | All document parsing is performed locally in browser memory. No telemetry or file contents are sent over the network. |
| **Input Validation** | 100 MB file size limit, format whitelisting, and password-protected PDF detection. |
| **XSS Prevention** | `DOMPurify` sanitizes all parsed HTML before rendering into the DOM. Attribute-based and script injections are neutralized. |
| **Network Security** | `AbortSignal.timeout(30s)` applied to all remote URL fetches. Dynamic script loader includes retry limits and failure cleanup. |
| **Storage Safety** | LocalStorage quota guards with automatic oldest-entry truncation to prevent quota exceptions. |
| **Offline Isolation** | Service Worker operates offline-first with strict origin checks to prevent opaque response bloat. |

---

## Known Considerations

- **Complex PDF Layouts**: Highly irregular multi-column text with non-standard gutters or borderless layered graphics may require manual layout adjustment in the live editor.
- **OCR Throughput**: OCR processing speed is hardware-dependent; multi-page scanned PDFs process sequentially on dedicated worker threads.
- **URL Fetching**: Remote website importing relies on CORS proxies; websites blocking proxy gateways or using Cloudflare/anti-bot protection cannot be imported directly via URL.

---

## Contributing

Contributions, bug reports, and format additions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Ensure all 224 unit tests pass (`http://localhost:3001/tests/index.html`)
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a **Pull Request**

---

## License

Distributed under the [MIT](LICENSE) License. Free for personal and commercial use.

<div align="center">

**Built with vanilla JavaScript and WebAssembly. No frameworks. No servers. Just the web platform.**

</div>
