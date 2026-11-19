import { expect, test } from '@playwright/test';
import { openWithConverted, rawEditor } from './helpers';

// Each test here asserts the CORRECT behaviour of a feature the audit found broken.
// `test.fail()` makes Playwright expect the failure: the suite stays green today, and the moment a
// fix lands the test reports "expected to fail but passed", forcing whoever fixed it to delete the marker.

const HEADER = 'header';

test.describe('dark mode (B-01)', () => {
  test('toggle changes the header background under a light OS theme', async ({ page }) => {
    test.fail(true, 'B-01: Tailwind dark: follows the OS, not the .dark class');
    await openWithConverted(page, 'text/markdown.md');
    const header = page.locator(HEADER).first();
    const before = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect.poll(() => header.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before);
  });

  test('toggle changes the header background under a dark OS theme', async ({ page }) => {
    test.fail(true, 'B-01: Tailwind dark: follows the OS, not the .dark class');
    await page.emulateMedia({ colorScheme: 'dark' });
    await openWithConverted(page, 'text/markdown.md');
    const header = page.locator(HEADER).first();
    const before = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect.poll(() => header.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before);
  });
});

test.describe('table of contents (B-04)', () => {
  test('clicking an entry scrolls the heading into view in Preview', async ({ page }) => {
    test.fail(true, 'B-04: TOC entries have no click handler');
    await openWithConverted(page, 'text/long-document.md');
    await page.getByRole('button', { name: 'Preview' }).click();
    await page.getByTitle('Table of Contents').click();
    // Precondition: the target starts off-screen, otherwise the assertion below proves nothing.
    await expect(page.getByRole('heading', { name: 'Conclusion' })).not.toBeInViewport();
    await page.getByRole('button', { name: 'Conclusion' }).click();
    await expect(page.getByRole('heading', { name: 'Conclusion' })).toBeInViewport();
  });
});

test.describe('find (B-07)', () => {
  test('"next" moves the editor selection to the next match', async ({ page }) => {
    test.fail(true, 'B-07: find never sets the textarea selection');
    await openWithConverted(page, 'pdf/multipage-prose.pdf');
    await page.keyboard.press('Control+f');
    await page.getByPlaceholder('Find text...').fill('column');
    await page.getByTitle('Next match').click();
    const selected = await rawEditor(page).evaluate((el: HTMLTextAreaElement) =>
      el.value.slice(el.selectionStart, el.selectionEnd),
    );
    expect(selected.toLowerCase()).toBe('column');
  });
});
