<div align="center">

# toMD

### Any Document → Clean Markdown

Convert PDF, DOCX, PPTX, XLSX, HTML, EPUB, images, and 10+ other formats to structured, LLM-ready Markdown — entirely in your browser.

**No server. No uploads. No sign-up. Zero data leaves your device.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-solondas96.github.io/tomd-22c55e?style=for-the-badge&logo=github)](https://solondas96.github.io/tomd/)
[![Deploy](https://github.com/solondas96/tomd/actions/workflows/deploy.yml/badge.svg)](https://github.com/solondas96/tomd/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite 6](https://img.shields.io/badge/Vite-6-646cff?style=for-the-badge&logo=vite)](https://vite.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## Why toMD?

Most document-to-markdown tools require uploading files to a remote server, installing desktop applications, or running heavy Python environments. **toMD** runs entirely in the browser:

> Drop a file in the browser. Get clean Markdown out. Nothing else happens.

Every conversion executes locally using JavaScript, WebAssembly, and standard Web APIs — your documents never leave your machine. This makes it safe for confidential documents, air-gapped environments, and security-conscious workflows.

---

## Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vite.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)

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
| 👁️ | **Source PDF Viewer** | Embedded multi-page PDF canvas inspection tab with zoom controls |
| 🌐 | **URL Import** | Convert remote web pages directly to Markdown via resilient CORS proxies |
| 📋 | **Clipboard Ingestion** | Paste images (`image/*`) or HTML directly from the clipboard (`Ctrl+V`) for instant conversion |
| 🕒 | **Conversion History** | Auto-saves recent conversions with localStorage persistence and instant restore |
| 🌙 | **Dark Mode** | System-aware theme toggle with persistent preferences |
| 📱 | **Installable PWA** | Web app manifest (`manifest.json`) and service worker (`sw.js`) for full offline desktop/mobile installation |
| ⌨️ | **Keyboard Shortcuts** | `Ctrl+S` save, `Ctrl+F` find, `Ctrl+E` edit mode, `Ctrl+D` theme, `?` shortcuts dialog |

---

## Quick Start

### Use Online

Visit **[solondas96.github.io/tomd](https://solondas96.github.io/tomd/)** — no installation required.

### Run Locally

```bash
# Clone the repository
git clone https://github.com/solondas96/tomd.git
cd tomd

# Install dependencies
npm install

# Start development server
npm run dev
# → Local server at http://localhost:5173
```

### Build for Production

```bash
# Typecheck and bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Project Structure

```
tomd/
├── .github/
│   └── workflows/
│       └── deploy.yml          GitHub Pages deployment workflow (Vite build)
├── public/
│   ├── .nojekyll               Bypasses Jekyll processing on GitHub Pages
│   ├── manifest.json           PWA manifest for desktop/mobile install
│   └── sw.js                   Service Worker for offline caching
├── src/
│   ├── main.tsx                React 19 application entry point
│   ├── App.tsx                 Root layout, view tabs, and modals
│   ├── index.css               Tailwind CSS 4 setup & custom scrollbars
│   ├── types/
│   │   └── index.ts            Core TypeScript definitions & schemas
│   ├── config/
│   │   └── index.ts            App constants, thresholds, and format map
│   ├── context/
│   │   └── AppContext.tsx      Global state, undo/redo, batch & storage sync
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts   Global keybindings
│   │   └── useClipboardPaste.ts      Clipboard image/HTML listener
│   ├── lib/
│   │   ├── utils.ts            Pure helpers (formatting, escaping, downloads)
│   │   └── converters/
│   │       ├── index.ts        Format dispatcher
│   │       ├── pdf.ts          PDF layout heuristics & OCR fallback
│   │       └── formats.ts      DOCX, XLSX, PPTX, EPUB, CSV, LaTeX, RTF
│   └── components/
│       ├── Header.tsx          Top brand bar, status pills & quick actions
│       ├── DropZone.tsx        Motion-animated drag/drop, folder & URL import
│       ├── BatchProcessor.tsx  Queue status, ZIP exporter & document merger
│       ├── ActionBar.tsx       Tab switcher, stats & multi-format export dropdown
│       ├── Editor.tsx          Monospaced markdown editor with tab support
│       ├── Preview.tsx         Sanitized GitHub-flavored markdown preview
│       ├── SplitView.tsx       Side-by-side synchronized editor & preview
│       ├── SourcePdfViewer.tsx Page-by-page PDF canvas inspection tab
│       ├── FindReplaceBar.tsx  Slide-down RegEx search & replace bar
│       ├── TableOfContents.tsx Headings outline drawer
│       ├── DocumentMetadata.tsx Extracted metadata viewer
│       ├── SettingsModal.tsx   Extraction heuristics & OCR language modal
│       ├── ShortcutsModal.tsx  Keyboard shortcuts guide
│       ├── HistoryDrawer.tsx   Slide-out recent conversions panel
│       └── ToastContainer.tsx  Animated notifications via Motion
├── index.html                  Vite HTML template
├── package.json                Dependencies & scripts
├── tsconfig.json               TypeScript configuration
├── tsconfig.node.json          TypeScript Node configuration
└── vite.config.ts              Vite 6 build configuration & code chunking
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

## Contributing

Contributions, bug reports, and format additions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Test locally (`npm run dev` and `npm run build`)
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a **Pull Request**

---

## License

Distributed under the [MIT](LICENSE) License. Free for personal and commercial use.

<div align="center">

**Built with React 19, Vite 6, Tailwind CSS 4, and Motion. 100% Client-Side.**

</div>
