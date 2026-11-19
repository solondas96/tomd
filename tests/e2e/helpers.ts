import { expect, type Page } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export const fixturePath = (relativePath: string): string => join(FIXTURES_DIR, relativePath);

/** Uploads fixture files through the drop zone's hidden file input. */
export async function uploadFixtures(page: Page, ...relativePaths: string[]): Promise<void> {
  await page.setInputFiles('input[type=file]', relativePaths.map(fixturePath));
}

/** Opens the app, converts one fixture and waits for the Raw editor to hold its Markdown. */
export async function openWithConverted(page: Page, relativePath: string): Promise<void> {
  await page.goto('/');
  await uploadFixtures(page, relativePath);
  await expect(page.getByRole('textbox')).not.toHaveValue('');
}

export const rawEditor = (page: Page) => page.locator('textarea');
