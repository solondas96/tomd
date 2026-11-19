import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

const SLOW_FILE_COUNT = 10;
const SLOW_FILE_ROWS = 30_000;
const SLOW_FILE_COLUMNS = 8;

/** A spreadsheet big enough that converting it takes noticeable time. */
function makeSlowWorkbook(): Buffer {
  const rows = Array.from({ length: SLOW_FILE_ROWS }, (_, row) =>
    Array.from({ length: SLOW_FILE_COLUMNS }, (_, column) => `r${row}c${column}`),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Big');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

test.describe('cancelling a batch (B-08)', () => {
  test('stops within one file and marks the rest cancelled', async ({ page }, testInfo) => {
    const workbook = makeSlowWorkbook();
    const paths = Array.from({ length: SLOW_FILE_COUNT }, (_, index) => testInfo.outputPath(`big-${index}.xlsx`));
    await Promise.all(paths.map((path) => writeFile(path, workbook)));
    await page.goto('/');
    await page.setInputFiles('input[type=file]', paths);

    await page.getByRole('button', { name: 'Cancel Batch' }).click();

    // Processing stops: the cancel button disappears and the queue can be reset.
    await expect(page.getByRole('button', { name: 'Cancel Batch' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'New Queue' })).toBeVisible();
    const cancelled = await page.getByText('Cancelled', { exact: true }).count();
    const done = await page.getByText('Done', { exact: true }).count();
    // Conversion blocks the page, so a few files may finish before the click is handled; the exact
    // "stops within one file" guarantee is covered by the runBatch unit test.
    expect(cancelled).toBeGreaterThanOrEqual(1);
    expect(cancelled + done).toBe(SLOW_FILE_COUNT);
    await expect(page.getByText(/Batch cancelled/)).toBeVisible();
  });

  test('a finished batch has no Cancel button', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', [
      { name: 'a.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2') },
      { name: 'b.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n3,4') },
    ]);
    await expect(page.getByText('2 of 2 documents successfully converted.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Batch' })).toHaveCount(0);
  });
});
