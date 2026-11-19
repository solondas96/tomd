import { expect, test, type Page } from '@playwright/test';
import { openWithConverted, rawEditor, uploadFixtures } from './helpers';

const DUPLICATE_HEADINGS_MD = Buffer.from(
  [
    '# Doc',
    '',
    '## Part',
    'first',
    ...Array(60).fill('filler line'),
    '## Part',
    'second',
    ...Array(60).fill('more filler'),
  ].join('\n'),
);

async function openToc(page: Page): Promise<void> {
  await page.getByTitle('Table of Contents').click();
}

async function selectedText(page: Page): Promise<string> {
  return rawEditor(page).evaluate((el: HTMLTextAreaElement) => el.value.slice(el.selectionStart, el.selectionEnd));
}

test.describe('table of contents (B-04)', () => {
  test('Preview: clicking an entry scrolls its heading into view', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    await page.getByRole('button', { name: 'Preview' }).click();
    await openToc(page);
    // Precondition: the target starts off-screen, otherwise the assertion below proves nothing.
    await expect(page.getByRole('heading', { name: 'Conclusion' })).not.toBeInViewport();
    await page.getByRole('button', { name: 'Conclusion' }).click();
    await expect(page.getByRole('heading', { name: 'Conclusion' })).toBeInViewport();
  });

  test('Raw: clicking an entry selects the heading line and scrolls it into view', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    await openToc(page);
    const scrollBefore = await rawEditor(page).evaluate((el) => el.scrollTop);
    await page.getByRole('button', { name: 'Conclusion' }).click();
    await expect.poll(() => selectedText(page)).toBe('## Conclusion');
    expect(await rawEditor(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(scrollBefore);
  });

  test('Split: clicking an entry updates both panes', async ({ page }) => {
    await openWithConverted(page, 'text/long-document.md');
    await page.getByRole('button', { name: 'Split View' }).click();
    await openToc(page);
    await page.getByRole('button', { name: 'Conclusion' }).click();
    await expect.poll(() => selectedText(page)).toBe('## Conclusion');
    await expect(page.getByRole('heading', { name: 'Conclusion' })).toBeInViewport();
  });

  test('repeated heading text (even one that is a DOM property name) gets unique ids, so the second entry reaches the second heading', async ({
    page,
  }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', {
      name: 'dup.md',
      mimeType: 'text/markdown',
      buffer: DUPLICATE_HEADINGS_MD,
    });
    await page.getByRole('button', { name: 'Preview' }).click();
    const ids = await page.locator('h2').evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(ids).toEqual(['md-part', 'md-part-1']);
    await openToc(page);
    await page.getByRole('button', { name: 'Part' }).nth(1).click();
    await expect(page.locator('h2#md-part-1')).toBeInViewport();
  });
});

test.describe('merged document anchors (B-05)', () => {
  test('merge output has no "{#" and TOC links scroll to their sections', async ({ page }) => {
    await page.goto('/');
    await uploadFixtures(page, 'text/long-document.md', 'csv/basic.csv');
    await page.getByRole('button', { name: 'Merge All' }).click();
    await expect(rawEditor(page)).toHaveValue(/# Merged Documents/);
    expect(await rawEditor(page).inputValue()).not.toContain('{#');

    await page.getByRole('button', { name: 'Preview' }).click();
    const section = page.getByRole('heading', { name: 'basic.csv', level: 2 });
    await expect(section).not.toBeInViewport();
    await page.getByRole('link', { name: 'basic.csv' }).click();
    await expect(section).toBeInViewport();
  });
});
