<div align="center">

# toMD

### Any Document → Clean Markdown

Convert PDF, DOCX, PPTX, XLSX, HTML, EPUB, images, and 10+ other formats to structured, LLM-ready Markdown — entirely in your browser.

**No server. No uploads. No sign-up. Your files never leave your device.**

Two optional features contact third parties, and the app tells you before each one: [URL import](#privacy-what-does-and-does-not-leave-your-device) and the first use of an [OCR](#privacy-what-does-and-does-not-leave-your-device) language.

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

Every conversion executes locally using JavaScript, WebAssembly, and standard Web APIs — your documents never leave your machine. All libraries and fonts are bundled with the app (nothing is loaded from a CDN apart from the optional OCR language model), and once the app has loaded once it works offline. The two exceptions are listed under [Privacy](#privacy-what-does-and-does-not-leave-your-device).

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
| | `.xml` `.json` | Fenced code blocks (JSON is pretty-printed) |
| **Images (OCR)** | `.png` `.jpg` `.jpeg` `.webp` `.gif` `.bmp` `.tiff` `.tif` | Tesseract.js 5 (WASM worker; language model downloaded on first use) |
| **Text & Code** | `.txt` `.md` `.tex` `.latex` | Native text / LaTeX macro parser |

---

## Features

Every row below is backed by an automated test (E2E in `tests/e2e/`, or a golden file in `tests/golden/`). Limits are stated in the row; see [`tests/golden/KNOWN_ISSUES.md`](tests/golden/KNOWN_ISSUES.md) for the open conversion-quality issues.

| | Feature | Description | Verified by |
|:--|:--------|:------------|:------------|
| 📄 | **Heading Detection** | Classifies PDF headings by font size relative to the body text, page by page (`#`–`####`). Levels can be off by one; document-wide ranking is planned. | golden `pdf/headings` |
| 📰 | **Multi-Column Detection** | *Experimental.* Tries to split 2-column PDF pages; columns can still interleave. | golden `pdf/two-column` (known issue) |
| 📊 | **PDF Table Reconstruction** | *Heuristic.* Aligned text blocks become GFM tables; bordered and borderless tables work, but ordinary text and lists are sometimes mistaken for tables. | golden `pdf/table-*`, `pdf/lists` (known issues) |
| 🔍 | **OCR Engine** | Extracts text from images and from image-only PDFs with Tesseract.js (12 languages). The first use of a language downloads its model; see [Privacy](#privacy-what-does-and-does-not-leave-your-device). | E2E `ocr`, golden `pdf/scanned` |
| 📦 | **Batch Processing & Merging** | Converts several files **one after another** (with a Cancel button), merges them into one document with a linked table of contents, or exports a ZIP. | E2E `export-batch-history-paste`, `toc`, `cancel` |
| 📁 | **Folder Drag & Drop** | Recursively scans dropped folders for supported files. | E2E `features` |
| ✏️ | **Live Split Editor** | Editor and rendered preview side by side, with live line/word/character counts. | E2E `features`, `convert-and-views` |
| ↩️ | **Undo / Redo** | 50-step history while editing (`Ctrl+Z`, `Ctrl+Y`). | E2E `features` |
| 🔎 | **Find & Replace** | Plain-text or regular-expression search with a match counter, case toggle, next/previous (`Enter` / `Shift+Enter`), and the editor scrolls to each match. | E2E `find` |
| 🧭 | **Table of Contents** | Click a heading to jump to it in Raw, Preview or Split view. | E2E `toc` |
| 💾 | **Multi-Format Export** | Download `.md`, `.html`, `.txt` or `.docx`. The `.docx` is generated in the browser with basic structure. | E2E `export-batch-history-paste`, `features` |
| 👁️ | **Source PDF Viewer** | Page-by-page view of the original PDF with zoom. | E2E `convert-and-views`, `features` |
| 🌐 | **URL Import** | Converts a web page. Because browsers block most cross-site fetches, the request goes through public proxy services; you must confirm each time. See [Privacy](#privacy-what-does-and-does-not-leave-your-device). | E2E `url-import` |
| 📋 | **Clipboard Ingestion** | Paste HTML or an image (`Ctrl+V`) for instant conversion; images are OCR'd. | E2E `export-batch-history-paste`, `ocr` |
| 🕒 | **Conversion History** | Keeps the last 12 conversions in the browser (large documents are truncated in history) and restores them, also after a reload. | E2E `export-batch-history-paste`, `features` |
| 🌙 | **Dark Mode** | System / light / dark, following the OS by default; the header button flips what you see. | E2E `theme` |
| 📱 | **Installable PWA** | Web app manifest and a generated service worker: installable, and after the first load it works offline. OCR needs a connection to download its language model. | E2E `pwa` |
| ⌨️ | **Keyboard Shortcuts** | `Ctrl+S` save, `Ctrl+F` find, `Ctrl+E` edit mode, `Ctrl+D` theme, `?` shortcuts dialog. | E2E `features` |

---

## Privacy: what does and does not leave your device

| What | Leaves the device? |
|:-----|:-------------------|
| Files you drop, pick or paste | **Never.** Conversion runs entirely in your browser. |
| App code, libraries and fonts | Loaded from the same origin as the app, not from a CDN. |
| **URL import** | **Yes, only if you use it.** The page address is sent to a public proxy service (`corsproxy.io`, `api.allorigins.win` or `api.codetabs.com`) and the page comes back through it. The app shows exactly which hosts and asks you to confirm each time. |
| **OCR language model** | **Yes, only if you use OCR.** The first time you recognise a language, its model is downloaded from `cdn.jsdelivr.net`. Only that download request is made; your document is not uploaded. The Settings panel says so when you switch OCR on. |
| Analytics / telemetry | None. |

Automated tests enforce this: no CDN hosts in the source, and no third-party requests while converting PDF, DOCX, XLSX or CSV files.

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

### Test

```bash
npm run lint && npm run format:check && npm run typecheck
npm test                  # unit tests + golden-file converter tests
npm run test:e2e          # Playwright; build first (npm run build)
npm run golden:update     # rewrite golden files after an intended converter change (review the diff!)
```

The first `npm run test:e2e` needs a browser: `npx playwright install chromium` (or set `PW_CHANNEL=chrome` to use an installed Chrome).

---

## Project Structure

```
tomd/
├── .github/workflows/deploy.yml   CI (lint, format, typecheck, tests, build, e2e) then GitHub Pages deploy
├── docs/                          PLAN.md (roadmap) and MASTER_PROMPT.md
├── public/icons/                  PWA icons (PNG + maskable)
├── src/
│   ├── core/                      UI-free conversion engine (no React): registry, converters, types
│   │   ├── registry.ts            Extension → converter lookup, convertFile()
│   │   └── converters/            pdf.ts (layout analysis, OCR) and formats.ts (everything else)
│   ├── lib/                       Pure helpers: find, headings, merge, batch, theme, vendor loaders
│   ├── context/AppContext.tsx     Global state, ingestion, history, batch
│   ├── components/                UI components
│   ├── hooks/                     Keyboard shortcuts, clipboard paste, theme class
│   ├── config/ · types/           Constants and shared types
│   └── main.tsx · App.tsx · index.css
├── tests/
│   ├── fixtures/                  Input files per format (+ build/ scripts that regenerate them)
│   ├── golden/                    Expected Markdown per fixture, and KNOWN_ISSUES.md
│   ├── e2e/                       Playwright specs
│   └── lib/ · core/ · privacy/    Vitest unit tests
└── vite.config.ts · vitest.config.ts · playwright.config.ts · eslint.config.js
```

---

## Security Model

| Layer | Protection Mechanism |
|:------|:---------------------|
| **Input Validation** | 100 MB file size limit and a format whitelist. Password-protected PDFs are detected (PDF.js reports them) and the app shows "PDF is password-protected." |
| **XSS Prevention** | `DOMPurify` sanitizes all converted HTML before it is rendered. |
| **Network** | Converters make no network requests (enforced by a test). URL import uses `AbortSignal.timeout(30s)` and needs your confirmation each time. |
| **Local Storage** | History keeps at most 12 entries, each truncated to 80,000 characters. If the browser refuses a write (quota), the failure is logged to the console. |
| **Offline** | A generated Workbox service worker precaches the app shell and converters. Updates are applied only when you accept the "new version" prompt. |

---

## Contributing

Contributions, bug reports, and format additions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run the checks (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`)
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a **Pull Request**

---

## License

Distributed under the [MIT](LICENSE) License. Free for personal and commercial use.

<div align="center">

**Built with React 19, Vite 6, Tailwind CSS 4, and Motion. Client-side conversion.**

</div>
