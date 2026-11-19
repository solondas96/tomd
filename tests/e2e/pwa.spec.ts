import { expect, test } from '@playwright/test';
import { fixturePath, rawEditor } from './helpers';

interface WebManifest {
  display: string;
  start_url: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
}

test.describe('PWA (B-03)', () => {
  test('exposes an installable manifest with PNG icons', async ({ page, request }) => {
    await page.goto('/');
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();
    const manifestUrl = new URL(manifestHref as string, page.url()).href;
    const manifest = (await (await request.get(manifestUrl)).json()) as WebManifest;

    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBeTruthy();
    const sizes = manifest.icons.filter((icon) => icon.type === 'image/png').map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      const response = await request.get(new URL(icon.src, manifestUrl).href);
      expect(response.status(), icon.src).toBe(200);
    }
  });

  test('registers a service worker', async ({ page }) => {
    await page.goto('/');
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toContain('/');
  });

  test('a second load with the network off still converts a PDF', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // First reload so the service worker controls the page and everything is in the cache.
    await page.reload();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          if (navigator.serviceWorker.controller) resolve();
          else navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
        }),
    );

    await context.setOffline(true);
    await page.reload();
    await page.setInputFiles('input[type=file]', fixturePath('pdf/headings.pdf'));
    await expect(rawEditor(page)).toHaveValue(/# Annual Report/);
  });
});
