import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openWithConverted, rawEditor, uploadFixtures } from './helpers';

const ZIP_MAGIC = 'PK';

test.describe('export', () => {
  test('downloads Markdown (.md) with the editor content', async ({ page }) => {
    await openWithConverted(page, 'csv/basic.csv');
    await page.getByRole('button', { name: 'Export' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download Markdown (.md)' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('basic.md');
    const content = await readFile((await download.path()) as string, 'utf8');
    expect(content).toContain('| name | qty | price |');
  });

  test('downloads a Word (.docx) file that is a valid zip package', async ({ page }) => {
    await openWithConverted(page, 'docx/basic.docx');
    await page.getByRole('button', { name: 'Export' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download Word (.docx)' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('basic.docx');
    const bytes = await readFile((await download.path()) as string);
    expect(bytes.subarray(0, 2).toString('latin1')).toBe(ZIP_MAGIC);
  });
});

test.describe('batch', () => {
  test('converts several files and merges them into one document', async ({ page }) => {
    await page.goto('/');
    await uploadFixtures(page, 'csv/basic.csv', 'text/plain.txt');
    await expect(page.getByRole('heading', { name: 'Batch Processing Queue' })).toBeVisible();
    await expect(page.getByText('2 of 2 documents successfully converted.')).toBeVisible();

    await page.getByRole('button', { name: 'Merge All' }).click();
    await expect(rawEditor(page)).toHaveValue(/# Merged Documents/);
    await expect(rawEditor(page)).toHaveValue(/Plain text line one/);
    await expect(rawEditor(page)).toHaveValue(/\| widget \| 3 \| 9.50 \|/);
  });

  test('offers a ZIP download of all converted files', async ({ page }) => {
    await page.goto('/');
    await uploadFixtures(page, 'csv/basic.csv', 'text/plain.txt');
    await expect(page.getByText('2 of 2 documents successfully converted.')).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download ZIP' }).click(),
    ]);
    const bytes = await readFile((await download.path()) as string);
    expect(bytes.subarray(0, 2).toString('latin1')).toBe(ZIP_MAGIC);
  });
});

test.describe('history', () => {
  test('restores a previous conversion from the history drawer', async ({ page }) => {
    await openWithConverted(page, 'text/plain.txt');
    await page.getByRole('button', { name: 'New File' }).click();
    await page.getByRole('button', { name: 'Recent conversions' }).click();
    await expect(page.getByRole('heading', { name: 'plain.txt' })).toBeVisible();
    await page.getByTitle('Restore to editor').first().click();
    await expect(rawEditor(page)).toHaveValue(/Plain text line one/);
  });
});

test.describe('paste', () => {
  test('converts pasted HTML to Markdown', async ({ page }) => {
    await page.goto('/');
    const html = '<h1>Pasted Title</h1><p>Some <strong>bold</strong> pasted text for the converter to handle.</p>';
    await page.evaluate((payload) => {
      const data = new DataTransfer();
      data.setData('text/html', payload);
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, html);
    await expect(rawEditor(page)).toHaveValue(/# Pasted Title/);
    await expect(rawEditor(page)).toHaveValue(/\*\*bold\*\*/);
  });
});
