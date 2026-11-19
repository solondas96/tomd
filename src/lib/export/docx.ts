import JSZip from 'jszip';

// ── DOCX Generator ────────────────────────────────────────────

export async function createDocxBlob(html: string): Promise<Blob> {
  const zip = new JSZip();
  const div = document.createElement('div');
  div.innerHTML = html;
  const paragraphs: string[] = [];

  const escXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  for (const node of Array.from(div.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim();
      if (!text && !['table', 'ul', 'ol'].includes(tag)) continue;

      if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag[1], 10);
        const sz = [52, 40, 32, 28, 26, 24][level - 1];
        paragraphs.push(
          `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r></w:p>`,
        );
      } else if (tag === 'li' || tag === 'ul' || tag === 'ol') {
        const items = tag === 'li' ? [el] : Array.from(el.querySelectorAll('li'));
        for (const li of items) {
          paragraphs.push(
            `<w:p><w:r><w:t xml:space="preserve">\u2022 ${escXml(li.textContent?.trim() || '')}</w:t></w:r></w:p>`,
          );
        }
      } else {
        paragraphs.push(`<w:p><w:r><w:t xml:space="preserve">${escXml(text)}</w:t></w:r></w:p>`);
      }
    }
  }

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rels);
  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels', wordRels);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
