import { expect, test, type Page } from '@playwright/test';
import { openWithConverted } from './helpers';

const headerBackground = (page: Page) =>
  page
    .locator('header')
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);

async function expectToggleChangesHeader(page: Page): Promise<void> {
  await openWithConverted(page, 'text/markdown.md');
  const before = await headerBackground(page);
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect.poll(() => headerBackground(page)).not.toBe(before);
  const after = await headerBackground(page);
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect.poll(() => headerBackground(page)).toBe(before);
  expect(after).not.toBe(before);
}

test.describe('theme toggle (B-01)', () => {
  test('flips the header background both ways under a light OS theme', async ({ page }) => {
    await expectToggleChangesHeader(page);
  });

  test('flips the header background both ways under a dark OS theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await expectToggleChangesHeader(page);
  });

  test('defaults to following the OS setting', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('Settings offers system, light and dark and persists the choice', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Theme', { exact: true }).selectOption('dark');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Theme', { exact: true }).selectOption('system');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('upgrades a legacy darkMode:true setting', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('tomd_settings_v2', JSON.stringify({ darkMode: true })));
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
