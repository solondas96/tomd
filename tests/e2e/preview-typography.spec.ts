import { expect, test } from '@playwright/test';
import { openWithConverted } from './helpers';

const BOLD_WEIGHT = 600;

test.describe('Preview typography (B-02)', () => {
  test('an H1 is larger and bolder than body text', async ({ page }) => {
    await openWithConverted(page, 'text/markdown.md');
    await page.getByRole('button', { name: 'Preview' }).click();
    const heading = page.getByRole('heading', { name: 'Title', level: 1 });
    const body = page.getByText('Plain markdown passes straight through.');
    const [headingSize, headingWeight, bodySize] = await Promise.all([
      heading.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      heading.evaluate((el) => parseInt(getComputedStyle(el).fontWeight, 10)),
      body.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ]);
    expect(headingSize).toBeGreaterThan(bodySize);
    expect(headingWeight).toBeGreaterThanOrEqual(BOLD_WEIGHT);
  });

  test('tables have visible cell borders', async ({ page }) => {
    await openWithConverted(page, 'csv/basic.csv');
    await page.getByRole('button', { name: 'Preview' }).click();
    const borderWidth = await page
      .getByRole('cell', { name: 'widget' })
      .evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
    expect(borderWidth).toBeGreaterThan(0);
  });

  test('lists render with bullets', async ({ page }) => {
    await openWithConverted(page, 'html/basic.html');
    await page.getByRole('button', { name: 'Preview' }).click();
    const listStyle = await page
      .getByRole('listitem')
      .first()
      .evaluate((el) => getComputedStyle(el).listStyleType);
    expect(listStyle).not.toBe('none');
  });
});

test.describe('Preview code styling (B-02)', () => {
  test('inline code has no literal backticks and block code has no pill background', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', {
      name: 'code.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('Use `inline` here.\n\n```js\nconst x = 1;\n```\n'),
    });
    await page.getByRole('button', { name: 'Preview' }).click();
    const inline = page.locator('p code').first();
    expect(await inline.evaluate((el) => getComputedStyle(el, '::before').content)).toMatch(/none|normal/);
    const blockBackground = await page.locator('pre code').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(blockBackground).toBe('rgba(0, 0, 0, 0)');
  });
});
