import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openWithConverted, rawEditor } from './helpers';

const CSV_ROWS = 'a,b\n1,2';

async function dropFolder(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((csv) => {
    const fileEntry = (name: string, content: string) => ({
      isFile: true,
      isDirectory: false,
      file: (resolve: (file: File) => void) => resolve(new File([content], name)),
    });
    const directory = (children: unknown[]) => ({
      isFile: false,
      isDirectory: true,
      createReader: () => {
        let delivered = false;
        return {
          readEntries: (resolve: (entries: unknown[]) => void) => {
            resolve(delivered ? [] : children);
            delivered = true;
          },
        };
      },
    });
    const nested = directory([fileEntry('deep.csv', csv)]);
    const root = directory([fileEntry('top.csv', csv), fileEntry('ignored.heic', 'x'), nested]);
    const transfer = new DataTransfer();
    Object.defineProperty(transfer, 'items', { value: [{ webkitGetAsEntry: () => root }] });
    const dropZone = document.querySelector('[role="button"][aria-label^="Choose files"]');
    dropZone?.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
  }, CSV_ROWS);
}

test.describe('feature coverage for the README features table (B-11)', () => {
  test('folder drop scans recursively and keeps only supported files', async ({ page }) => {
    await dropFolder(page);
    await expect(page.getByRole('heading', { name: 'Batch Processing Queue' })).toBeVisible();
    await expect(page.getByText('2 of 2 documents successfully converted.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'deep.csv' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ignored.heic' })).toHaveCount(0);
  });

  test('live stats count lines, words and characters', async ({ page }) => {
    await openWithConverted(page, 'text/plain.txt');
    await expect(page.getByText(/\d+ lines/)).toBeVisible();
    await expect(page.getByText(/\d+ words/)).toBeVisible();
    await expect(page.getByText(/\d+ chars/)).toBeVisible();
  });

  test('editing updates the preview live in Split view', async ({ page }) => {
    await openWithConverted(page, 'text/markdown.md');
    await page.getByRole('button', { name: 'Split View' }).click();
    await page.getByTitle('Enable Live Edit Mode (Ctrl+E)').click();
    await rawEditor(page).fill('# Typed Heading\n\nTyped body.');
    await expect(page.getByRole('heading', { name: 'Typed Heading', level: 1 })).toBeVisible();
  });

  test('undo and redo step through edits', async ({ page }) => {
    await openWithConverted(page, 'text/markdown.md');
    await page.getByTitle('Enable Live Edit Mode (Ctrl+E)').click();
    const original = await rawEditor(page).inputValue();
    await rawEditor(page).fill('first edit');
    await expect.poll(() => page.getByTitle('Undo (Ctrl+Z)').isEnabled()).toBe(true);
    await page.getByTitle('Undo (Ctrl+Z)').click();
    await expect(rawEditor(page)).toHaveValue(original);
    await page.getByTitle('Redo (Ctrl+Y)').click();
    await expect(rawEditor(page)).toHaveValue('first edit');
  });

  test('exports .html and .txt', async ({ page }) => {
    await openWithConverted(page, 'text/markdown.md');
    for (const [label, filename, expected] of [
      ['Download HTML (.html)', 'markdown.html', '<h1'],
      ['Download Plain Text (.txt)', 'markdown.txt', 'Plain markdown passes straight through.'],
    ] as const) {
      await page.getByRole('button', { name: 'Export' }).click();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: label }).click(),
      ]);
      expect(download.suggestedFilename()).toBe(filename);
      expect(await readFile((await download.path()) as string, 'utf8')).toContain(expected);
    }
  });

  test('Ctrl+S saves the Markdown file', async ({ page }) => {
    await openWithConverted(page, 'csv/basic.csv');
    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
    expect(download.suggestedFilename()).toBe('basic.md');
  });

  test('keyboard shortcuts: ? opens the guide, Escape closes it, Ctrl+E toggles editing', async ({ page }) => {
    await openWithConverted(page, 'text/markdown.md');
    await page.keyboard.press('?');
    await expect(page.getByRole('heading', { name: /shortcuts/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /shortcuts/i })).toHaveCount(0);
    await expect(rawEditor(page)).toHaveJSProperty('readOnly', true);
    await page.keyboard.press('Control+e');
    await expect(rawEditor(page)).toHaveJSProperty('readOnly', false);
  });

  test('Ctrl+D toggles the theme', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.keyboard.press('Control+d');
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('Source PDF viewer renders every page and zooms', async ({ page }) => {
    await openWithConverted(page, 'pdf/multipage-prose.pdf');
    await page.getByRole('button', { name: 'Source PDF' }).click();
    await expect(page.getByText('(3 pages)')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(3);
    const before = await page.getByText(/^\d+%$/).textContent();
    await page.getByTitle('Zoom in').click();
    await expect(page.getByText(/^\d+%$/)).not.toHaveText(before ?? '');
  });

  test('history survives a reload', async ({ page }) => {
    await openWithConverted(page, 'text/plain.txt');
    await page.reload();
    await page.getByRole('button', { name: 'Recent conversions' }).click();
    await expect(page.getByRole('heading', { name: 'plain.txt' })).toBeVisible();
  });
});
