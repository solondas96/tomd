/** DrawingML namespace, used by text in PPTX slides (`<a:p>`, `<a:t>`). */
export const DRAWINGML_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

/**
 * Parses XML text into a DOM document.
 *
 * Params: xml - XML source; label - what is being parsed, for the error message.
 * Returns: the parsed document.
 * Throws: Error when the XML is malformed (browsers report this as a `<parsererror>` element, not an exception).
 */
export function parseXml(xml: string, label = 'XML part'): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error(`${label} is not valid XML.`);
  return doc;
}

/**
 * Extracts the text of a slide, one string per paragraph.
 *
 * Purpose: reads text through namespaces rather than a regex, so entities decode (`&amp;` becomes `&`),
 * attributes such as `xml:space` are fine, and runs split by formatting rejoin into one paragraph.
 * Params: xml - the slide's XML source.
 * Returns: non-empty paragraphs in document order.
 * Throws: Error if the XML is malformed.
 */
export function extractSlideParagraphs(xml: string): string[] {
  const doc = parseXml(xml, 'Slide');
  const paragraphs: string[] = [];
  for (const paragraph of Array.from(doc.getElementsByTagNameNS(DRAWINGML_NS, 'p'))) {
    const text = Array.from(paragraph.getElementsByTagNameNS(DRAWINGML_NS, 't'))
      .map((run) => run.textContent ?? '')
      .join('');
    if (text.trim()) paragraphs.push(text);
  }
  return paragraphs;
}
