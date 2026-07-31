import { describe, it, expect } from './framework.js';

// We import the DOM module — tests assume the main app page is NOT loaded,
// so IDs will be null. We test that the module doesn't crash on import.
export default function testDom() {
  describe('dom module', () => {
    it('imports without throwing', async () => {
      // dom.js uses getElementById which returns null for missing elements
      // This just verifies the module loads without crashing
      const mod = await import('../js/dom.js');
      expect(typeof mod.dom).toBe('object');
    });

    it('dom object has expected keys', async () => {
      const { dom } = await import('../js/dom.js');
      const expectedKeys = [
        'dropZone', 'fileInput', 'errorBox', 'errorText',
        'uploadSection', 'batchSection', 'progressSection',
        'outputSection', 'markdownOutput', 'toastContainer',
        'settingsPanel', 'settingsOverlay', 'tocPanel',
      ];
      for (const key of expectedKeys) {
        expect(key in dom).toBe(true);
      }
    });
  });
}
