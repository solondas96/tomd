import { expect, test } from '@playwright/test';
import { openWithConverted } from './helpers';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.use({ viewport: MOBILE_VIEWPORT });

test.describe('390px mobile width', () => {
  test('landing page does not scroll horizontally', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('converted document does not scroll horizontally', async ({ page }) => {
    await openWithConverted(page, 'csv/basic.csv');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
