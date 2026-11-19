# toMD Improvement Plan

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done
Size: `S` < ½ day · `M` 1–2 days · `L` 3–5 days

This plan comes from a full code read plus a headless-Chrome audit of the production build (2026-11-19).
Each item has a stable ID. Commits, PRs and the master prompt ([MASTER_PROMPT.md](MASTER_PROMPT.md)) refer to these IDs.

---

## Goals

1. **Trustworthy output.** PDF and Office conversions should give Markdown a person would accept without hand-fixing it.
2. **Claims match reality.** Every feature in the README works. "Private and offline" is literally true.
3. **Safe to change.** Golden-file tests guard converter quality, and CI blocks regressions.
4. **Differentiate on "LLM-ready".** Offer token-aware chunking, source traceability and confidence signals that other browser tools don't.

## Success metrics

| Metric | Today | Target |
|---|---|---|
| Golden fixtures passing | 0 (no tests) | 100% of ≥ 25 fixtures |
| False-positive tables on the prose fixtures | ≥ 2 per page | 0 |
| Advertised features verified by E2E | 0 | All README features |
| Third-party network hosts during conversion | 4+ (CDNs, fonts) | 0 (OCR language data is opt-in and disclosed) |
| Main-thread blocking during a 50-page PDF | Entire conversion | < 50 ms per frame (work runs in a Worker) |

## Milestones

| Milestone | Items | Outcome |
|---|---|---|
| **M0 Foundations** | F-01 → F-06 | Tests, lint, local deps, converter core |
| **M1 Nothing broken** | B-01 → B-11 | Every verified bug fixed; README is honest |
| **M2 Conversion quality** | Q-01 → Q-13 | PDF/EPUB/PPTX/RTF output is trustworthy |
| **M3 Architecture** | A-01 → A-04 | Workers, split state, IndexedDB, real DOCX export |
| **M4 LLM-ready** | L-01 → L-06 | Tokens, chunks, source mapping, confidence |
| **M5 Reach** | R-01 → R-03 | OS integration, CLI, extension |

Work the milestones in order. Within a milestone, any item whose dependencies are done can start.

---

## M0 · Foundations

### [x] F-01 · Unit test runner `S` · deps: —
- **Change:** Add Vitest and jsdom. Add `npm test` and `npm run test:watch`. Put tests in `tests/` (mirroring `src/`).
- **Done when:** `npm test` runs locally and in CI, with at least one passing test (`parseCsv`, `arrayToMdTable`).

### [x] F-02 · Lint & format `S` · deps: —
- **Change:** ESLint flat config (typescript-eslint, react-hooks, jsx-a11y) and Prettier. Add `npm run lint` and `npm run typecheck`.
- **Done when:** The repo lints clean. The rule set is committed and any suppressions are justified inline.

### [x] F-03 · Local dependencies instead of CDN globals `M` · deps: —
- **Problem:** PDF.js, Mammoth, SheetJS and Tesseract load from CDNs into `window.*` with hand-written types. This breaks offline use, pinning and the privacy claim.
- **Change:**
  - Use `pdfjs-dist` (worker via Vite `?url`), `mammoth`, `xlsx` (pinned tarball from SheetJS) and `tesseract.js`, all as npm imports with dynamic `import()` per format.
  - Remove the PDF.js `<script>` tags from `index.html`.
  - Self-host fonts via `@fontsource/*`.
  - Delete `loadScript` and the `declare global` blocks.
- **Files:** `index.html`, `src/lib/converters/*`, `src/lib/utils.ts`, `src/components/SourcePdfViewer.tsx`, `package.json`.
- **Done when:** Converting PDF, DOCX, XLSX and CSV makes zero requests to non-origin hosts, and each format loads as its own lazy chunk.

### [x] F-04 · Converter core + registry `M` · deps: F-03
- **Problem:** The converters are coupled to the DOM and the UI. Batch has no cancellation, and the dispatcher is a hand-written switch.
- **Change:**
  - Create `src/core/` with no React imports. Each converter implements:
    ```ts
    interface Converter {
      id: FormatId;                // enum, replaces string FORMAT_MAP values
      extensions: readonly string[];
      convert(input: ConverterInput, ctx: ConversionContext): Promise<ConversionResult>;
    }
    interface ConversionContext { options: ConversionOptions; signal: AbortSignal; onProgress(p: Progress): void; }
    ```
  - A registry maps extensions to converters.
  - Converters must call `signal.throwIfAborted()` at every page, slide or chapter boundary.
- **Done when:** `src/lib/converters/index.ts` switch is gone; the UI only talks to the registry; converters are importable in Node tests.

### [x] F-05 · Golden-file test harness `M` · deps: F-01, F-04
- **Change:**
  - Add `tests/fixtures/<format>/<name>.<ext>` and `tests/golden/<format>/<name>.md`, plus a test that converts every fixture and diffs the output against its golden file.
  - `npm run golden:update` rewrites the golden files. Golden diffs must be reviewed in PRs.
  - Seed with ≥ 25 fixtures. Cover:
    - Prose with inline bold, italic and links
    - Bordered and borderless tables, 2-column layouts, headers/footers with page numbers
    - Numbered lines that aren't lists ("2024 was…"), hyphenation, ligatures
    - Scanned pages
    - DOCX, PPTX (entities, notes, order), EPUB (spine ≠ alphabetical), RTF (unicode), CSV edge cases
- **Note:** The audit fixtures (`doc.html`→PDF, `deck.pptx`, `data.csv`) are a starting set. Generate PDFs from HTML deterministically with a script in `tests/fixtures/build/`.
- **Done when:** CI fails on any golden diff. Golden files reflect today's behaviour, and the known-bad outputs are marked in `tests/golden/KNOWN_ISSUES.md` with the Q-item that fixes each one.

### [x] F-06 · E2E smoke suite + CI gate `M` · deps: F-01
- **Change:** Playwright tests for:
  - Upload → convert → Raw/Preview/Split/Source tabs
  - Dark-mode toggle, TOC navigation, find/next
  - Export .md and .docx, batch → merge, history restore, paste HTML
- CI order: `lint → typecheck → test → build → e2e`. The deploy job depends on all of them.
- **Done when:** A PR with a failing check can't deploy.

---

## M1 · Nothing broken (verified bugs)

### [x] B-01 · Dark-mode toggle has no effect `S`
- **Cause:** Tailwind 4 `dark:` follows `prefers-color-scheme`, while the app toggles `.dark` on `<html>`.
- **Change:** Add `@custom-variant dark (&:where(.dark, .dark *));` to `src/index.css`. Make the setting a three-way choice, `system | light | dark` (enum), with system as the default.
- **Done when:** An E2E test asserts the header background changes in both directions under both OS schemes.

### [x] B-02 · Preview has no Markdown typography `S`
- **Cause:** `prose` classes are used but `@tailwindcss/typography` isn't installed.
- **Change:** Install it, add `@plugin "@tailwindcss/typography";`, and check the long `prose-*` modifier list still renders correctly.
- **Done when:** In Preview, an H1 is larger than body text and bold, and tables have borders (E2E computed-style assertion).

### [x] B-03 · PWA / offline is non-functional `S` · deps: F-03
- **Cause:** `public/sw.js` is never registered and caches leftover `./js/*.js` paths.
- **Change:** Replace it with `vite-plugin-pwa` (generated precache manifest, PNG icons, update prompt toast). Delete `public/sw.js`.
- **Done when:** The site is installable (Lighthouse PWA checks pass), and a second load with the network off converts a PDF.

### [x] B-04 · TOC entries are not clickable `S`
- **Change:** Clicking an entry should:
  - In Raw view: set the selection to the heading's line and scroll it into view.
  - In Preview: scroll to the heading by slug id (add ids via a `marked` heading renderer).
  - In Split view: do both.
- **Done when:** An E2E test clicks a TOC entry and the target heading is in the viewport.

### [ ] B-05 · Merged document anchors broken `S`
- **Cause:** `## name {#slug}` isn't supported by `marked`, so it renders literally.
- **Change:** Emit a plain `## name` and rely on the B-04 slug ids. Use the same `slugify` for the TOC links and the heading ids, and de-duplicate repeated slugs.
- **Done when:** Merge output has no `{#`, and the TOC links scroll to their sections.

### [ ] B-06 · PPTX outputs XML entities `S` · deps: F-04
- **Change:** Parse slide XML with `DOMParser` and read text via `getElementsByTagNameNS` instead of a regex, so entities decode and `<a:t xml:space>` variants are handled.
- **Done when:** The golden output for `R&amp;D` is `R&D`.

### [ ] B-07 · Find doesn't navigate to matches `S`
- **Change:** On match change, call `textarea.setSelectionRange` and scroll the match into view. Enter goes to the next match and Shift+Enter to the previous one. Add a case-sensitive toggle. Show an invalid-regex state inline rather than silently returning 0.
- **Done when:** An E2E test pressing "next" moves the selection.

### [ ] B-08 · Cancel doesn't work for batch / OCR `S` · deps: F-04
- **Change:** Thread the `AbortSignal` through `ConversionContext`. Batch shares one controller and shows a cancel button. Terminate the Tesseract worker when the signal aborts.
- **Done when:** Cancelling a 10-file batch stops within one file, and cancelling OCR stops within one page.

### [ ] B-09 · Blank band under header in document view `S`
- **Change:** Fix the `sticky top-16` / `h-[calc(100vh-4rem)]` stacking in `App.tsx` and `ActionBar.tsx`.
- **Done when:** The action bar sits directly under the header at 390 px, 1024 px and 1440 px widths (screenshot test).

### [ ] B-10 · Lines starting with digits treated as lists `S`
- **Cause:** `/^[-\d]/` in `formatParagraph`.
- **Change:** Only treat a line as a list item when it matches `^\d{1,3}[.)]\s` or a bullet pattern.
- **Done when:** The "2024 was a record year…" fixture stays a paragraph.

### [ ] B-11 · README truthfulness pass `S` · deps: B-01…B-10, F-03
- **Change:** Remove or qualify any claim that isn't true:
  - "concurrent" batch (until A-01)
  - "syntax overlay"
  - URL import goes through third-party proxies: say so and show a notice in the UI before fetching
- Make sure the "No data leaves device" wording matches F-03.
- **Done when:** Every row of the README features table maps to an E2E test or a golden fixture.

---

## M2 · Conversion quality

All Q-items must land with new or updated golden fixtures that demonstrate the fix.

### [ ] Q-01 · PDF: merge style runs into inline Markdown `M` · deps: F-05
- **Problem:** PDF.js splits a line into separate runs at every font change. This is the main cause of false tables, and bold/italic is detected but discarded.
- **Change:** Within a line, merge adjacent runs whose horizontal gap is less than about 0.3× the font size into one text span. Wrap bold and italic runs in `**`/`*` (from font name or family), and normalise whitespace at the boundaries.
- **Done when:** The prose fixture with inline bold/italic produces one paragraph containing `**bold phrase**` and `*italic word*`.

### [ ] Q-02 · PDF: table detection rewrite `L` · deps: Q-01
- **Change:** A table candidate needs **all** of these:
  1. ≥ 2 consecutive rows with ≥ 2 merged spans
  2. Column x-positions consistent across rows
  3. Gaps between columns > 2× the average gap between words
  4. Optionally, ruling lines from `page.getOperatorList()` (`constructPath`/`rectangle`), which raise confidence
- Handle header-row detection and empty cells, and escape `|`.
- **Done when:** There are zero false tables across the prose fixtures, and bordered and borderless table fixtures come out correct.

### [ ] Q-03 · PDF: repeated header/footer removal `M` · deps: F-05
- **Change:** Replace the blanket 4% margin cut. Find lines in the top or bottom band whose text, with digits normalised, repeats on ≥ 50% of pages, and remove only those. Keep the setting.
- **Done when:** Page numbers and running titles are removed, and body text near the margins is kept.

### [ ] Q-04 · PDF: document-wide heading levels `M` · deps: F-05
- **Change:**
  - First pass: build a font-size histogram for the whole document, and take the body size as the most common size weighted by character count.
  - Rank the distinct larger sizes into H1–H4, with the threshold coming from the heading-sensitivity setting.
  - Second pass: emit the Markdown.
  - Bold, short lines at body size may become H4 only if they're followed by body text.
- **Done when:** In the fixture, an `<h2>` becomes `##` consistently across pages.

### [ ] Q-05 · PDF: hyperlinks `S` · deps: Q-01
- **Change:** Use `page.getAnnotations()` (subtype `Link`, with `url`) and wrap the spans whose bounding boxes intersect the link rectangle in `[text](url)`.
- **Done when:** The fixture link survives.

### [ ] Q-06 · PDF: hyphenation & ligatures `S` · deps: F-05
- **Change:**
  - Join `word-\nword` when the line ends in a hyphen and the next line starts with a lowercase letter.
  - NFKC-normalise text (ﬁ → fi, ﬂ → fl).
  - Fix the space-insertion heuristic so it scales with font size instead of a fixed `> 2`.
- **Done when:** "re-flow" and "hyphenation" render correctly in the fixture.

### [ ] Q-07 · PDF: paragraph segmentation `M` · deps: Q-04
- **Change:** Break paragraphs on any of:
  - Vertical gap > 1.2× the median line spacing
  - First-line indent
  - Previous line ending in sentence punctuation and noticeably short
- **Done when:** Separate source paragraphs stay separate in the fixtures.

### [ ] Q-08 · PDF: lists without bullet glyphs `M` · deps: Q-07
- **Change:**
  - Use `getOperatorList` to detect small filled shapes left of the text as bullets.
  - Infer nesting level from indent.
  - Keep ordered lists (`1.`, `a)`, `i.`).
- **Done when:** The `<ul>` fixture yields `- Hire two engineers` / `- Ship the v3 release`.

### [ ] Q-09 · PDF: performance `S` · deps: F-05
- **Change:**
  - Make `groupByY` sort by y and then sweep (O(n log n) instead of O(n²)).
  - Replace `Math.min(...xs)` spreads with loops, which avoids stack overflow on huge pages.
  - Reuse one OCR worker per document.
- **Done when:** A 200-page fixture converts at least 2× faster than the baseline (recorded in the PR).

### [ ] Q-10 · EPUB: spine order, images, metadata `M` · deps: F-04
- **Change:** Parse `META-INF/container.xml` → OPF → spine order. Read title and author into metadata. Rewrite internal links and extract images as assets (L-05).
- **Done when:** The spine-order fixture comes out in reading order.

### [ ] Q-11 · PPTX: order, tables, notes `M` · deps: B-06
- **Change:**
  - Take slide order from `ppt/presentation.xml` plus its rels, not filename numbering.
  - Use the title placeholder as `## Title`.
  - Output bullets with their levels.
  - Convert `a:tbl` into GFM tables.
  - Add speaker notes as a `> Notes:` block (setting).
- **Done when:** The PPTX fixtures pass.

### [ ] Q-12 · RTF: proper decoding `S` · deps: F-04
- **Change:** Handle `\uN?`, `\'hh` (with `\ansicpg`), and skip groups starting with `\*`, fonttbl, colortbl, stylesheet and info. Keep `\b`/`\i` as Markdown emphasis.
- **Done when:** The unicode RTF fixture comes out correct.

### [ ] Q-13 · DOCX: images & fidelity `S` · deps: L-05
- **Change:** Give Mammoth a `convertImage` handler that writes images to the asset store (L-05) instead of embedding base64. Map Word styles (Title, Quote, Code) through Mammoth's `styleMap`.
- **Done when:** DOCX with images produces relative image links, and the Markdown size isn't inflated by base64.

---

## M3 · Architecture

### [ ] A-01 · Conversion in Web Workers + real concurrent batch `L` · deps: F-04
- **Change:**
  - Run `src/core` inside a module Worker via Comlink.
  - The pool size is `min(4, navigator.hardwareConcurrency - 1)`.
  - Batch uses the pool, with per-item progress and cancellation.
  - PDF.js and OCR rendering use `OffscreenCanvas`.
- **Done when:** The UI stays responsive (no long tasks > 50 ms) during a 50-page conversion, and a batch of 8 files runs concurrently.

### [ ] A-02 · Split `AppContext` `M` · deps: F-04
- **Change:**
  - Replace the 621-line God context with focused stores: `conversionStore`, `documentStore` (markdown, undo/redo, filename, metadata), `historyStore` and `uiStore` (panels, modals, tab).
  - Use Zustand or `useReducer` + context, whichever ships smaller. Business logic lives in `src/services/` and is unit-tested.
- **Done when:** No component imports more state than it renders, and services have ≥ 80% line coverage.

### [ ] A-03 · History in IndexedDB `M` · deps: A-02
- **Change:**
  - Store the full Markdown, assets and the source file (opt-in) in IndexedDB (via `idb`).
  - Key entries by id, not filename, so files with the same name don't overwrite each other.
  - Add search and pinning.
  - Migrate existing localStorage entries once.
- **Done when:** Entries > 80 kB restore in full, and two entries with the same filename can both exist.

### [ ] A-04 · Real DOCX export `M` · deps: F-03
- **Change:** Replace the hand-built OpenXML with the `docx` npm library, walking the `marked` token stream to get real Heading 1–6 styles, bold/italic/code runs, numbered and bulleted lists, tables, links and images.
- **Done when:** An exported file opens in Word and LibreOffice with a navigable heading outline, and tables are preserved.

---

## M4 · LLM-ready differentiators

### [ ] L-01 · Token counter `S` · deps: A-02
- **Change:** Show live token counts in the stats bar using `gpt-tokenizer` (cl100k/o200k) plus a Claude estimate (chars ÷ 3.5, labelled "≈"). Add a model selector and show a context-window fit indicator.
- **Done when:** Counts update with editor changes without janking typing (debounced, or computed in a worker).

### [ ] L-02 · RAG chunk export `M` · deps: L-01
- **Change:** Add an Export → "Chunks (JSONL)" option.
  - Split on the heading hierarchy, then pack chunks to N tokens with M overlap. Never split inside a table or code fence.
  - Each line: `{id, text, heading_path[], page_start, page_end, source, token_count}`.
  - Show a preview panel listing the chunks with token sizes.
- **Done when:** Unit tests cover the boundary rules, and the export is valid JSONL.

### [ ] L-03 · Markdown ↔ PDF source mapping `L` · deps: Q-01, A-01
- **Change:**
  - The PDF converter emits a sidecar map `{blockIndex → {page, bbox}}`.
  - Clicking a block in Split/Raw view scrolls the Source PDF tab to that page and highlights the bbox. Clicking the PDF jumps to the block.
  - Render the Source tab lazily (IntersectionObserver), not every page up front.
- **Done when:** The round trip works on a multi-page fixture, and a 100-page PDF Source tab opens in < 1 s.

### [ ] L-04 · Confidence flags `M` · deps: Q-02, L-03
- **Change:** Converters attach a `warnings[]` list per block (`table-inferred`, `ocr-text`, `column-reflow`, `low-ocr-confidence`). The editor gutter shows markers, and a "Review" panel lists them with jump links.
- **Done when:** Fixtures with inferred tables or OCR show the expected flags.

### [ ] L-05 · Asset extraction & bundle export `M` · deps: F-04
- **Change:**
  - `ConversionResult` gains `assets: Map<path, Blob>`. Applies to PDF images (via operator list), DOCX, EPUB and PPTX media.
  - Markdown links use the relative path `assets/…`.
  - Export → "Markdown bundle (.zip)" writes `doc.md` plus `assets/`, and the preview resolves assets via object URLs.
- **Done when:** No base64 images in output by default, and the bundle opens correctly in Obsidian or VS Code.

### [ ] L-06 · Optional AI cleanup (BYO key, explicit opt-in) `M` · deps: L-04
- **Change:**
  - Add a settings section where users enter their own API key (stored only in the browser; a warning says it is never transmitted elsewhere).
  - Actions: "Fix flagged tables", "Write image alt text", "Summarise".
  - Before every call, a dialog states exactly what text will be sent.
  - The feature is off by default and the privacy banner reflects its state.
- **Done when:** Nothing is sent without per-action confirmation, and E2E tests use a mocked endpoint.

---

## M5 · Reach

### [ ] R-01 · OS integration `S` · deps: B-03
- **Change:** Add `file_handlers` (open PDF/DOCX/… with toMD) and `share_target` (share files or a URL to toMD) to the web manifest, and handle `launchQueue`.
- **Done when:** On Chrome desktop, "Open with toMD" converts the file.

### [ ] R-02 · CLI package `M` · deps: F-04, A-01
- **Change:** Publish `@tomd/core` and a `tomd` CLI (`npx tomd file.pdf -o out.md --chunks`). Node shims for the canvas/DOM pieces; OCR optional.
- **Done when:** The CLI output matches the golden files in CI.

### [ ] R-03 · Browser extension `M` · deps: R-02
- **Change:** An MV3 extension that converts the current page or the open PDF using `@tomd/core`, with no proxy needed.
- **Done when:** Converting the current page and a PDF tab both work, and the extension makes no network requests.

---

## Dependency graph (critical path)

```
F-01 ─┬─ F-05 ─┬─ Q-01 ─ Q-02 ─ L-04 ─ L-06
F-03 ─ F-04 ───┤        └─ Q-05
               ├─ Q-03, Q-04 ─ Q-07 ─ Q-08
               ├─ A-01 ─ L-03
               └─ A-02 ─ A-03, L-01 ─ L-02
B-01, B-02, B-04, B-05, B-07, B-09, B-10 : no deps, do anytime (quick wins)
```

## Working agreements

- One plan item per branch and PR (`feat/Q-02-table-detection`). The PR title starts with the ID.
- Every converter change ships with golden fixtures. Golden updates are explained in the PR body.
- Update this file's checkbox in the same PR that completes an item.
