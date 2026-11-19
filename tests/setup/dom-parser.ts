import { JSDOM } from 'jsdom';

// Node has no DOMParser. Converters use it for XML (PPTX, EPUB), so supply jsdom's in
// Node-environment tests; the jsdom environment already has one.
if (typeof globalThis.DOMParser === 'undefined') {
  globalThis.DOMParser = new JSDOM().window.DOMParser as typeof DOMParser;
}
