// Regenerates the zip-based fixtures (docx, pptx, epub, xlsx) with fixed timestamps so output is stable.
// Usage: node tests/fixtures/build/build-office.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXED_DATE = new Date('2020-01-01T00:00:00Z');

async function writeZip(relativePath, files) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content, { date: FIXED_DATE });
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  writeFileSync(join(fixturesDir, relativePath), bytes);
  console.log(`built ${relativePath}`);
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

// ── DOCX ──────────────────────────────────────────────────────
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docxStyles = `${XML}<w:styles ${W}>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
</w:styles>`;
const para = (text, { style, bold, italic } = {}) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r>${
    bold || italic ? `<w:rPr>${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}</w:rPr>` : ''
  }<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const cell = (text) => `<w:tc><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`;
const row = (...cells) => `<w:tr>${cells.map(cell).join('')}</w:tr>`;

async function buildDocx(name, bodyXml) {
  await writeZip(`docx/${name}.docx`, {
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'word/styles.xml': docxStyles,
    'word/document.xml': `${XML}<w:document ${W}><w:body>${bodyXml}</w:body></w:document>`,
  });
}

await buildDocx(
  'basic',
  para('Project Plan', { style: 'Heading1' }) +
    para('This plan has a normal sentence, then bold text and italic text.') +
    para('Bold line', { bold: true }) +
    para('Italic line', { italic: true }) +
    para('Milestones', { style: 'Heading2' }) +
    `<w:tbl>${row('Phase', 'Owner')}${row('Design', 'Ana')}${row('Build', 'Raj')}</w:tbl>` +
    para('Closing paragraph.'),
);
await buildDocx(
  'unicode',
  para('Résumé — Ünïcödé', { style: 'Heading1' }) +
    para('日本語のテキスト, Ελληνικά, and “quotes” with R&amp;D &lt;tags&gt;.'),
);

// ── PPTX ──────────────────────────────────────────────────────
const A =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const slideXml = (title, ...bullets) =>
  `${XML}<p:sld ${A}><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>${title}</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:txBody>${bullets
    .map((b) => `<a:p><a:r><a:t>${b}</a:t></a:r></a:p>`)
    .join('')}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
const notesXml = (text) =>
  `${XML}<p:notes ${A}><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>`;
const presentationXml = (rIds) =>
  `${XML}<p:presentation ${A} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>${rIds
    .map((id, i) => `<p:sldId id="${256 + i}" r:id="${id}"/>`)
    .join('')}</p:sldIdLst></p:presentation>`;
const presentationRels = (targets) =>
  `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${targets
    .map(
      ([id, file]) =>
        `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${file}"/>`,
    )
    .join('')}</Relationships>`;
const pptxTypes = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>`;

await writeZip('pptx/basic.pptx', {
  '[Content_Types].xml': pptxTypes,
  'ppt/presentation.xml': presentationXml(['rId1', 'rId2']),
  'ppt/_rels/presentation.xml.rels': presentationRels([
    ['rId1', 'slide1.xml'],
    ['rId2', 'slide2.xml'],
  ]),
  'ppt/slides/slide1.xml': slideXml('R&amp;D Roadmap', 'Ship the v3 release', 'Hire two engineers'),
  'ppt/slides/slide2.xml': slideXml('Budget &lt;draft&gt;', 'Q1 &amp; Q2 totals'),
  'ppt/notesSlides/notesSlide1.xml': notesXml('Remember to thank the team.'),
});
// Slide order in presentation.xml differs from the file numbering: reading order is slide2 then slide1.
await writeZip('pptx/reordered.pptx', {
  '[Content_Types].xml': pptxTypes,
  'ppt/presentation.xml': presentationXml(['rId1', 'rId2']),
  'ppt/_rels/presentation.xml.rels': presentationRels([
    ['rId1', 'slide2.xml'],
    ['rId2', 'slide1.xml'],
  ]),
  'ppt/slides/slide1.xml': slideXml('Closing', 'Thank you'),
  'ppt/slides/slide2.xml': slideXml('Opening', 'Welcome'),
});

// ── EPUB ──────────────────────────────────────────────────────
const xhtml = (title, body) =>
  `${XML}<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1><p>${body}</p></body></html>`;
const epubBase = {
  mimetype: 'application/epub+zip',
  'META-INF/container.xml': `${XML}<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
};
const opf = (spine, manifestIds) =>
  `${XML}<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>The Test Book</dc:title><dc:creator>Jane Author</dc:creator><dc:identifier id="id">urn:uuid:fixture</dc:identifier></metadata><manifest>${manifestIds
    .map((id) => `<item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`)
    .join('')}</manifest><spine>${spine.map((id) => `<itemref idref="${id}"/>`).join('')}</spine></package>`;

await writeZip('epub/basic.epub', {
  ...epubBase,
  'OEBPS/content.opf': opf(['chapter1', 'chapter2'], ['chapter1', 'chapter2']),
  'OEBPS/chapter1.xhtml': xhtml('First Chapter', 'It begins here.'),
  'OEBPS/chapter2.xhtml': xhtml('Second Chapter', 'It ends here.'),
});
// Reading order (spine) is the reverse of alphabetical file order.
await writeZip('epub/spine-order.epub', {
  ...epubBase,
  'OEBPS/content.opf': opf(['b-intro', 'a-appendix'], ['a-appendix', 'b-intro']),
  'OEBPS/a-appendix.xhtml': xhtml('Appendix', 'Read this last.'),
  'OEBPS/b-intro.xhtml': xhtml('Introduction', 'Read this first.'),
});

// ── XLSX ──────────────────────────────────────────────────────
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.aoa_to_sheet([
    ['Item', 'Qty', 'Price'],
    ['Widget', 3, 9.5],
    ['Gadget | Pro', 1, 20],
  ]),
  'Sales',
);
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Name'], ['Zoë'], ['日本']]), 'People');
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), 'Empty');
writeFileSync(join(fixturesDir, 'xlsx/multisheet.xlsx'), XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
console.log('built xlsx/multisheet.xlsx');
