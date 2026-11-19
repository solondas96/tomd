import { expect, test, type Page } from '@playwright/test';
import { openWithConverted } from './helpers';

const WIDTHS = [390, 1024, 1440] as const;
const HEIGHT = 800;
const PIXEL_TOLERANCE = 1;

async function box(page: Page, testId: string) {
  const rect = await page.getByTestId(testId).boundingBox();
  if (!rect) throw new Error(`${testId} is not visible`);
  return rect;
}

test.describe('document view layout (B-09)', () => {
  for (const width of WIDTHS) {
    test(`action bar sits directly under the header at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await openWithConverted(page, 'text/long-document.md');
      const header = await box(page, 'app-header');
      const actionBar = await box(page, 'action-bar');
      expect(Math.abs(actionBar.y - (header.y + header.height))).toBeLessThanOrEqual(PIXEL_TOLERANCE);
    });

    test(`the page itself does not scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await openWithConverted(page, 'text/long-document.md');
      const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test(`the table of contents panel does not cover the action bar at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await openWithConverted(page, 'text/long-document.md');
      await page.getByTitle('Table of Contents').click();
      const actionBar = await box(page, 'action-bar');
      const toc = await page.locator('aside').boundingBox();
      if (!toc) throw new Error('table of contents is not visible');
      expect(toc.y).toBeGreaterThanOrEqual(actionBar.y + actionBar.height - PIXEL_TOLERANCE);
      expect(toc.y + toc.height).toBeLessThanOrEqual(HEIGHT + PIXEL_TOLERANCE);
      // The Export button stays clickable while the panel is open.
      await page.getByRole('button', { name: 'Export' }).click({ timeout: 3000 });
    });
  }

  test('the "Click to edit" pill is not covered by the action bar', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    const pill = page.getByRole('button', { name: 'Click to edit' });
    // A real click succeeds only if nothing overlaps the element at its centre.
    await pill.click({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Click to edit' })).toHaveCount(0);
  });
});
