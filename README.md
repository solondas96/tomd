# PDF to Markdown

A fully client-side browser app that converts PDF and 10+ other file formats into clean, LLM-readable Markdown — no server, no uploads, no frameworks.

![screenshot](https://placehold.co/800x420?text=PDF+to+Markdown)

## Features

- **Drag-and-drop or click** to upload files (PDF, DOCX, PPTX, XLSX, EPUB, images, and more)
- **Heading detection** — classifies H1–H4 from font size ratios
- **Bullet and numbered lists** preserved
- **Multi-page** PDFs joined with horizontal rules
- **OCR support** — extracts text from scanned/image-only PDFs via Tesseract.js
- **Batch processing** — convert multiple files at once, download as ZIP
- **Live preview** with split-pane editor, syntax highlighting, and find/replace
- **Copy to clipboard** and **download as `.md`**
- **URL fetch** — paste a URL to convert remote pages to Markdown
- **Conversion history** with localStorage persistence
- **Dark mode** toggle
- **Offline-capable** via service worker with full asset caching
- **100 MB file size limit** with clear error messaging
- Password-protected and corrupt files are caught with clear error messages
- Zero data leaves the device — all processing runs in the browser

## Quick Start

You need a local HTTP server (clipboard API requires a secure context).

**Python (built-in):**
```bash
python -m http.server 3000
```
Then open `http://localhost:3000`.

**Node / npx:**
```bash
npx serve .
```

**VS Code:** install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html` → *Open with Live Server*.

## Project Structure

```
pdf-to-markdown/
├── index.html               # UI layout and CDN script tags
├── css/style.css            # Indigo-themed styling, responsive at 600 px
├── sw.js                    # Service worker (offline caching)
├── js/
│   ├── main.js              # Entry point, global error handlers
│   ├── config.js            # Constants (file limits, CDN URLs)
│   ├── state.js             # Reactive state management with localStorage
│   ├── utils.js             # Shared helpers (escHtml, slugify, wordCount, etc.)
│   ├── ui.js                # DOM interactions, toast, undo/redo, history
│   ├── features.js          # URL fetch, proxy rotation, clipboard paste
│   ├── file-handler.js      # File validation, batch processing, ZIP export
│   ├── dom.js               # DOM element references
│   └── converters/
│       ├── index.js         # Format router (getConverter, isSupported)
│       ├── pdf.js           # PDF.js + Tesseract OCR pipeline
│       └── formats.js       # DOCX, PPTX, XLSX, EPUB, CSV, LaTeX, etc.
└── tests/
    ├── index.html           # Browser-based test runner
    ├── framework.js         # Lightweight describe/it/expect framework
    ├── run-cdp.py           # Headless test runner via Chrome DevTools Protocol
    └── test-*.js            # 12 test suites (224 tests)
```

## Dependencies (CDN, no install)

| Library | Version | Purpose |
|---|---|---|
| [PDF.js](https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js) | 3.11.174 | PDF text extraction |
| [Tesseract.js](https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js) | 5 | OCR for scanned PDFs/images |
| [marked](https://cdn.jsdelivr.net/npm/marked@12/marked.min.js) | 12 | Markdown → HTML for preview |
| [DOMPurify](https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js) | 3.1.6 | Sanitize rendered HTML |
| [Turndown](https://cdn.jsdelivr.net/npm/turndown@7/dist/turndown.js) | 7 | HTML → Markdown conversion |
| [Mammoth](https://cdn.jsdelivr.net/npm/mammoth@1/mammoth.browser.min.js) | 1 | DOCX conversion |
| [JSZip](https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js) | 3.10.1 | ZIP export & EPUB/PPTX parsing |
| [SheetJS](https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js) | 0.20.3 | Spreadsheet parsing |

## Testing

The project includes 224 tests covering utilities, state, converters, file handling, UI interactions, security (XSS/injection), and edge cases.

**Run in browser:**
```bash
python -m http.server 3001
# Open http://localhost:3001/tests/index.html
```

**Run headlessly (Edge/Chrome):**
```bash
# Start browser with remote debugging
msedge --headless --remote-debugging-port=9222 --remote-allow-origins=* http://localhost:3001/tests/index.html

# Execute tests via CDP
python tests/run-cdp.py
```

## Error Handling

- All async operations wrapped with try/catch and user-facing toast notifications
- Global `unhandledrejection` safety net
- CDN script loading with automatic retry (2 attempts)
- localStorage quota exceeded handling with graceful eviction
- `AbortSignal.timeout(30000)` on network requests
- Service worker uses `Promise.allSettled` to survive individual CDN failures
- DOMPurify fallback to `textContent` when unavailable

## Known Limitations

- **Multi-column layouts** — columns may interleave; PDF.js returns raw text positions without column awareness
- **Tables** — not detected; table cells are output as plain lines
- **OCR accuracy** — depends on scan quality; best results with 300+ DPI

## License

MIT
