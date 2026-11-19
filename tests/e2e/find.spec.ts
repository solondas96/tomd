import { expect, test, type Page } from '@playwright/test';
import { openWithConverted, rawEditor } from './helpers';

const selection = (page: Page) =>
  rawEditor(page).evaluate((el: HTMLTextAreaElement) => ({
    text: el.value.slice(el.selectionStart, el.selectionEnd),
    start: el.selectionStart,
  }));

async function openFind(page: Page, query: string): Promise<void> {
  await page.keyboard.press('Control+f');
  await page.getByPlaceholder('Find text...').fill(query);
}

test.describe('find (B-07)', () => {
  test('"next" moves the editor selection to the next match', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    await openFind(page, 'Paragraph for section');
    const first = await selection(page);
    expect(first.text).toBe('Paragraph for section');
    await page.getByRole('button', { name: 'Next match' }).click();
    await expect.poll(async () => (await selection(page)).start).toBeGreaterThan(first.start);
    expect((await selection(page)).text).toBe('Paragraph for section');
    await page.getByRole('button', { name: 'Previous match' }).click();
    await expect.poll(async () => (await selection(page)).start).toBe(first.start);
  });

  test('scrolls a far-away match into view', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    await openFind(page, 'final section');
    await expect.poll(() => rawEditor(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
  });

  test('Enter goes to the next match and Shift+Enter to the previous, keeping focus in the find box', async ({
    page,
  }) => {
    await openWithConverted(page, 'text/long-document.md');
    await openFind(page, 'Paragraph for section');
    const first = (await selection(page)).start;
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await selection(page)).start).toBeGreaterThan(first);
    await page.keyboard.press('Shift+Enter');
    await expect.poll(async () => (await selection(page)).start).toBe(first);
    await expect(page.getByPlaceholder('Find text...')).toBeFocused();
  });

  test('wraps from the last match to the first', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    await openFind(page, 'final section');
    await expect(page.locator('#find-status')).toHaveText('1/1');
    const only = (await selection(page)).start;
    await page.keyboard.press('Enter');
    await expect(page.locator('#find-status')).toHaveText('1/1');
    expect((await selection(page)).start).toBe(only);
  });

  test('case-sensitive toggle changes what matches', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    await openFind(page, 'CONCLUSION');
    await expect(page.locator('#find-status')).toHaveText('1/1');
    await page.getByRole('button', { name: 'Match case' }).click();
    await expect(page.locator('#find-status')).toHaveText('0 matches');
  });

  test('shows an invalid regular expression inline', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    await page.keyboard.press('Control+f');
    await page.getByRole('button', { name: 'Regular expression' }).click();
    await page.getByPlaceholder('Find text...').fill('(');
    await expect(page.locator('#find-status')).toHaveText('Invalid regular expression');
    await expect(page.getByPlaceholder('Find text...')).toHaveAttribute('aria-invalid', 'true');
    await page.getByPlaceholder('Find text...').fill('Sec.ion 3\\b');
    await expect(page.getByPlaceholder('Find text...')).toHaveAttribute('aria-invalid', 'false');
    await expect(page.locator('#find-status')).not.toHaveText('Invalid regular expression');
  });

  test('replace all replaces literally in plain mode', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    await page.getByTitle('Enable Live Edit Mode (Ctrl+E)').click();
    await openFind(page, 'Conclusion');
    await page.getByPlaceholder('Replace with...').fill('End $&');
    await page.getByRole('button', { name: 'Replace All' }).click();
    await expect(rawEditor(page)).toHaveValue(/## End \$&/);
  });
});
