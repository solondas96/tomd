# Known issues captured by the golden files

The golden files record what the converters produce **today**. Entries below are outputs that are
known to be wrong or weak. Each names the plan item that fixes it (see `docs/PLAN.md`); when that item
lands, the golden diff must show the improvement and the entry is deleted here.

`golden:update` (`npm run golden:update`) rewrites every golden file. Review the diff before committing:
a diff that is not explained by the plan item being worked on is a regression.

IDs marked **(proposed)** are not in `docs/PLAN.md` yet.

## PDF

| Fixture | Problem | Fix |
|---|---|---|
| `pdf/prose-inline.pdf` | A normal paragraph is emitted as a 6-column **false table**; bold, italic and link formatting is lost. | Q-01, Q-02, Q-05 |
| `pdf/lists.pdf` | Bullet glyphs are lost and both bullets run together on one line; the numbered list becomes a **false 2-column table**. | Q-02, Q-07, Q-08 |
| `pdf/headings.pdf` | An `<h2>` is emitted as `###`, and the first body line of a page can be promoted to a heading. | Q-04 |
| `pdf/header-footer.pdf` | The running title and `Page N` are kept on every page. | Q-03 |
| `pdf/hyphenation-ligatures.pdf` | `re-` / `flow` and `hyphen-` / `ation` stay split across lines (`re- flow`). Ligatures are already normalised by PDF.js. | Q-06 |
| `pdf/unicode.pdf` | The first CJK character comes out as the Kangxi radical `⽇` (U+2F47) instead of `日`. | Q-06 (NFKC normalisation) |
| `pdf/numbered-lines.pdf` | A wrapped paragraph whose every line starts with a digit keeps its line breaks (`/^[-\d]/` rule); the ordered list becomes a **false table**. | B-10, Q-02, Q-08 |
| `pdf/two-column.pdf` | Columns are interleaved line by line, so the left and right columns are mixed together. | Q-14 (proposed: column detection and reading order) |
| `pdf/scanned.pdf` | Image-only page: the output is the "no extractable text" notice. OCR cannot run in the Node test environment, so this fixture only pins the OCR-off behaviour. | Not a defect; OCR is covered by E2E (F-06) |

## Office, ebook and text formats

| Fixture | Problem | Fix |
|---|---|---|
| `pptx/basic.pptx` | The title is plain text rather than `## Title`; speaker notes are dropped. | Q-11 |
| `pptx/reordered.pptx` | Slides come out in file-name order, not presentation order (Opening must come first). | Q-11 |
| `epub/spine-order.epub` | Chapters come out in alphabetical file order, not spine order; title and author metadata are dropped. | Q-10 |
| `rtf/basic.rtf` | The font table leaks into the text (`Arial;;;Hello`); a stray leading space remains on paragraph two; `\b`/`\i` are discarded rather than emitted as emphasis. | Q-12 |
| `rtf/unicode.rtf` | `\'e9` is not decoded and `\uN?` becomes `?`. | Q-12 |
| `docx/basic.docx` | Table rows lack the space after the leading pipe (`\|Phase \| Owner \|`). The Markdown is still valid. | Q-13 |
| `csv/quotes-and-pipes.csv` | A newline inside a cell splits the table row in two. | B-12 (proposed: escape or convert newlines in table cells) |
| `html/basic.html` | The `<title>` and `<script>` text leak into the output (`Samplealert(1)`). | B-13 (proposed: strip `head`, `script` and `style` in the HTML converter) |
| `latex/basic.tex` | No blank line after a heading, so text sticks to it. The Markdown still renders. | Q-15 (proposed: LaTeX output polish) |
