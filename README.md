<div align="center">

# toMD

### Any Document → Clean Markdown

Convert PDF, DOCX, PPTX, XLSX, HTML, EPUB, images, and 10+ other formats to structured, LLM-ready Markdown — entirely in your browser.

**No server. No uploads. No sign-up. Zero data leaves your device.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-solondas96.github.io/tomd-22c55e?style=for-the-badge&logo=github)](https://solondas96.github.io/tomd/)
[![GitLab Mirror](https://img.shields.io/badge/Mirror-solondas96.gitlab.io/tomd-6366f1?style=for-the-badge&logo=gitlab)](https://solondas96.gitlab.io/tomd/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-224_passing-brightgreen?style=for-the-badge)](#testing)

</div>

---

## Why toMD?

Most document-to-markdown tools require uploading files to a server, installing desktop apps, or running Python scripts. **toMD** takes a different approach:

> Drop a file in the browser. Get clean Markdown out. Nothing else happens.

Every conversion runs locally using JavaScript and WebAssembly — your documents never leave your machine. This makes it ideal for sensitive documents, air-gapped environments, or anyone who values privacy.

---

## Supported Formats

| Category | Formats |
|:---------|:--------|
| Documents | `.pdf` `.docx` `.pptx` `.rtf` `.epub` |
| Spreadsheets | `.xlsx` `.xls` `.csv` `.tsv` |
| Web | `.html` `.htm` `.xml` `.json` |
| Images (OCR) | `.png` `.jpg` `.jpeg` `.webp` `.gif` `.bmp` `.tiff` |
| Text & Code | `.txt` `.md` `.tex` `.latex` |

---

## Features

| | Feature | Description |
|:--|:--------|:------------|
| 📄 | **Smart Heading Detection** | Classifies H1–H4 by analyzing font-size ratios across the document |
| 🔍 | **OCR Engine** | Extracts text from scanned/image-only PDFs using Tesseract.js 5 |
| 📦 | **Batch Processing** | Convert multiple files at once, download results as a ZIP archive |
| ✏️ | **Live Editor** | Split-pane markdown editor with syntax highlighting, find & replace |
| 🌐 | **URL Import** | Paste any URL to fetch and convert remote pages to Markdown |
| 📋 | **Clipboard Paste** | Paste images or HTML directly from clipboard for instant conversion |
| 🕒 | **Conversion History** | Auto-saves recent conversions with localStorage persistence |
| 🌙 | **Dark Mode** | System-aware theme toggle |
| 📡 | **Offline-Capable** | Service worker caches all assets for full offline use |
| ⌨️ | **Keyboard Shortcuts** | `Ctrl+S` save, `Ctrl+F` find, `Ctrl+Z/Y` undo/redo, and more |

---

## Architecture

toMD is a zero-dependency, zero-build static web app. No bundlers, no frameworks, no transpilation — just ES modules served directly to the browser.

```
┌─────────────────────────────────────────────────────────┐
│                       Browser                           │
├─────────────────────────────────────────────────────────┤
│  index.html                                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  main.js (entry point)                            │  │
│  │  ┌─────────┐ ┌─────────┐ ┌────────────────────┐  │  │
│  │  │ state.js│ │  ui.js  │ │  file-handler.js   │  │  │
│  │  │ reactive│ │ toasts  │ │ validation, batch  │  │  │
│  │  │ store   │ │ history │ │ ZIP export         │  │  │
│  │  └─────────┘ └─────────┘ └────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │           converters/                        │ │  │
│  │  │  index.js ─── format router                  │ │  │
│  │  │  pdf.js ───── PDF.js + Tesseract OCR         │ │  │
│  │  │  formats.js ─ DOCX, PPTX, XLSX, EPUB, etc.  │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  sw.js — Service Worker (offline asset caching)   │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  CDN Libraries (loaded on demand):                      │
│  PDF.js · Tesseract.js · Marked · DOMPurify ·           │
│  Turndown · Mammoth · JSZip · SheetJS                   │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

- **Privacy First** — All processing happens client-side. Files are read with `FileReader`, processed in-memory, and never transmitted.
- **No Build Step** — Clone and serve. No `npm install`, no webpack, no compilation.
- **Progressive Enhancement** — Works without JavaScript libraries (graceful error messages). OCR loads only when needed.
- **Resilient Loading** — CDN scripts retry on failure. Service worker uses `Promise.allSettled` to survive individual CDN outages.

---

## Quick Start

### Use Online

Visit **[solondas96.github.io/tomd](https://solondas96.github.io/tomd/)** (or GitLab mirror at **[solondas96.gitlab.io/tomd](https://solondas96.gitlab.io/tomd/)**) — no installation needed.

### Run Locally

```bash
# Clone the repo
git clone https://github.com/solondas96/tomd.git
cd tomd

# Serve with any static HTTP server (needed for clipboard API / service worker)
python -m http.server 3000
# → Open http://localhost:3000
```

Alternative servers:
```bash
npx serve .                    # Node.js
php -S localhost:3000           # PHP
```

Or use the **VS Code Live Server** extension — right-click `index.html` → *Open with Live Server*.

---

## Project Structure

```
tomd/
├── index.html                  UI layout + CDN script tags
├── css/style.css               Responsive indigo theme (breakpoint: 600px)
├── sw.js                       Service worker — offline caching
├── js/
│   ├── main.js                 Entry point, keyboard shortcuts
│   ├── config.js               Constants, format map, thresholds
│   ├── state.js                Reactive state + localStorage sync
│   ├── utils.js                Shared helpers (escape, slugify, wordCount)
│   ├── ui.js                   Toasts, undo/redo, tabs, history panel
│   ├── dom.js                  Cached DOM references
│   ├── features.js             URL fetch, clipboard paste, proxy rotation
│   ├── file-handler.js         Validation, batch queue, ZIP export
│   └── converters/
│       ├── index.js            Format router (getConverter, isSupported)
│       ├── pdf.js              PDF.js text extraction + Tesseract OCR
│       └── formats.js          DOCX, PPTX, XLSX, EPUB, CSV, LaTeX, etc.
└── tests/
    ├── index.html              Browser test runner
    ├── framework.js            Custom describe/it/expect framework
    ├── run-cdp.py              Headless runner via Chrome DevTools Protocol
    └── test-*.js               12 test suites
```

---

## Dependencies

All dependencies are loaded from CDNs at runtime — **nothing to install**.

| Library | Purpose |
|:--------|:--------|
| [PDF.js](https://mozilla.github.io/pdf.js/) 3.11 | PDF text layer extraction |
| [Tesseract.js](https://tesseract.projectnaptha.com/) 5 | OCR for scanned documents & images |
| [Marked](https://marked.js.org/) 12 | Markdown → HTML preview rendering |
| [DOMPurify](https://github.com/cure53/DOMPurify) 3.1 | XSS-safe HTML sanitization |
| [Turndown](https://github.com/mixmark-io/turndown) 7 | HTML → Markdown conversion |
| [Mammoth](https://github.com/mwilliamson/mammoth.js) 1 | DOCX → HTML extraction |
| [JSZip](https://stuk.github.io/jszip/) 3.10 | ZIP creation + EPUB/PPTX parsing |
| [SheetJS](https://sheetjs.com/) 0.20 | Excel/CSV spreadsheet parsing |

---

## Testing

**224 tests** across 12 suites covering converters, state management, UI, security (XSS/injection), and edge cases.

```bash
# Browser — open the test runner
python -m http.server 3001
# → http://localhost:3001/tests/index.html

# Headless — via Chrome DevTools Protocol
msedge --headless --remote-debugging-port=9222 \
  --remote-allow-origins=* http://localhost:3001/tests/index.html
python tests/run-cdp.py
```

---

## Security & Error Handling

| Layer | Protection |
|:------|:-----------|
| Input | 100 MB file size limit, format whitelist, password-protected PDF detection |
| Rendering | DOMPurify sanitizes all HTML before preview |
| Network | `AbortSignal.timeout(30s)` on all fetches, CDN retry with fallback |
| Storage | localStorage quota detection with graceful eviction |
| Runtime | Global `unhandledrejection` handler, try/catch on all async paths |
| Offline | Service worker with `Promise.allSettled` for resilient caching |

---

## Known Limitations

- **Multi-column PDFs** — columns may interleave (PDF.js lacks column-awareness)
- **PDF tables** — rendered as plain text lines, not markdown tables
- **OCR accuracy** — depends on scan quality; best results at 300+ DPI

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Ensure all 224 tests pass
4. Submit a merge request

No build tools needed — just edit and serve.

---

## License

[MIT](LICENSE) — free for personal and commercial use.

---

<div align="center">

**Built with vanilla JavaScript. No frameworks. No servers. Just the web platform.**

</div>
