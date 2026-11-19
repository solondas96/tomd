import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawEditor } from './helpers';

const SAMPLE = join(dirname(fileURLToPath(import.meta.url)), 'assets', 'ocr-sample.png');
const LANGUAGE_DATA_URL = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz';
const OCR_TIMEOUT_MS = 90_000;

// OCR needs the English language model from the CDN. Skip (rather than fail) when it is unreachable
// so an offline run does not report a false regression.
test.beforeAll(async () => {
  const reachable = await fetch(LANGUAGE_DATA_URL, { method: 'HEAD' })
    .then((response) => response.ok)
    .catch(() => false);
  test.skip(!reachable, 'OCR language data is unreachable (offline)');
});

test.describe('OCR (B-11)', () => {
  test.setTimeout(OCR_TIMEOUT_MS);

  test('Settings discloses the language-data download before OCR is used', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('OCR for Scanned Documents').click();
    await expect(page.locator('#ocr-disclosure')).toContainText('cdn.jsdelivr.net');
    await expect(page.locator('#ocr-disclosure')).toContainText('never uploaded');
  });

  test('recognises text in an uploaded image', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', SAMPLE);
    await expect(rawEditor(page)).toHaveValue(/Invoice number 4821/, { timeout: OCR_TIMEOUT_MS });
  });

  test('recognises text in an image pasted from the clipboard', async ({ page }) => {
    const bytes = (await readFile(SAMPLE)).toString('base64');
    await page.goto('/');
    await page.evaluate(async (base64) => {
      const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
      const data = new DataTransfer();
      data.items.add(new File([blob], 'shot.png', { type: 'image/png' }));
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, bytes);
    await expect(rawEditor(page)).toHaveValue(/Invoice number 4821/, { timeout: OCR_TIMEOUT_MS });
  });
});
