import { expect, test } from '@playwright/test';
import { openWithConverted, rawEditor, uploadFixtures } from './helpers';

test.describe('upload, convert and view tabs', () => {
  test('converts a PDF and shows it in Raw, Preview, Split and Source tabs', async ({ page }) => {
    await openWithConverted(page, 'pdf/headings.pdf');
    await expect(rawEditor(page)).toHaveValue(/# Annual Report/);

    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByRole('heading', { name: 'Annual Report', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Split View' }).click();
    await expect(rawEditor(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Annual Report', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Source PDF' }).click();
    await expect(page.locator('canvas').first()).toBeVisible();

    await page.getByRole('button', { name: 'Raw Editor' }).click();
    await expect(rawEditor(page)).toBeVisible();
  });

  test('converts a CSV to a Markdown table and hides the Source tab', async ({ page }) => {
    await openWithConverted(page, 'csv/basic.csv');
    await expect(rawEditor(page)).toHaveValue(/\| name \| qty \| price \|/);
    await expect(page.getByRole('button', { name: 'Source PDF' })).toHaveCount(0);
  });

  test('shows an error toast for an unsupported file', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', {
      name: 'photo.heic',
      mimeType: 'image/heic',
      buffer: Buffer.from('not supported'),
    });
    await expect(page.getByText('No supported files found.')).toBeVisible();
  });

  test('"New File" returns to the drop zone', async ({ page }) => {
    await openWithConverted(page, 'text/plain.txt');
    await page.getByRole('button', { name: 'New File' }).click();
    await expect(page.getByRole('button', { name: /Choose files to convert/ })).toBeVisible();
  });

  test('renders Preview as styled Markdown (tables)', async ({ page }) => {
    await openWithConverted(page, 'csv/basic.csv');
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByRole('cell', { name: 'widget' })).toBeVisible();
  });

  test('keeps working after a second conversion', async ({ page }) => {
    await openWithConverted(page, 'text/plain.txt');
    await page.getByRole('button', { name: 'New File' }).click();
    await uploadFixtures(page, 'csv/basic.csv');
    await expect(rawEditor(page)).toHaveValue(/\| name \|/);
  });
});
