import { expect, test } from '@playwright/test';
import { rawEditor } from './helpers';

const PAGE_URL = 'https://example.com/article';
const PAGE_HTML =
  '<html><head><title>Example Article</title></head><body><nav>menu</nav><h1>Remote Heading</h1><p>Body of the remote page.</p></body></html>';
const PROXY_HOSTS = ['corsproxy.io', 'api.allorigins.win', 'api.codetabs.com'];

test.describe('URL import (B-11)', () => {
  test('asks for consent, naming every proxy, before anything leaves the device', async ({ page }) => {
    const proxyRequests: string[] = [];
    await page.route(/corsproxy\.io|allorigins\.win|codetabs\.com/, (route) => {
      proxyRequests.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'text/html', body: PAGE_HTML });
    });
    await page.goto('/');
    await page.getByPlaceholder('https://example.com/article').fill(PAGE_URL);
    await page.getByRole('button', { name: 'Fetch' }).click();

    const notice = page.getByRole('alertdialog');
    await expect(notice).toBeVisible();
    for (const host of PROXY_HOSTS) await expect(notice).toContainText(host);
    await expect(notice).toContainText(PAGE_URL);
    expect(proxyRequests).toEqual([]);

    await notice.getByRole('button', { name: 'Cancel' }).click();
    await expect(notice).toHaveCount(0);
    expect(proxyRequests).toEqual([]);
  });

  test('fetches through the proxy only after the user confirms, and converts the page', async ({ page }) => {
    const proxyRequests: string[] = [];
    await page.route(/corsproxy\.io|allorigins\.win|codetabs\.com/, (route) => {
      proxyRequests.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'text/html', body: PAGE_HTML });
    });
    await page.goto('/');
    await page.getByPlaceholder('https://example.com/article').fill(PAGE_URL);
    await page.getByRole('button', { name: 'Fetch' }).click();
    await page.getByRole('button', { name: 'Fetch via proxy' }).click();

    await expect(rawEditor(page)).toHaveValue(/# Remote Heading/);
    await expect(rawEditor(page)).not.toHaveValue(/menu/);
    expect(proxyRequests).toHaveLength(1);
    expect(proxyRequests[0]).toContain(encodeURIComponent(PAGE_URL));
  });

  test('falls back to the next proxy when the first fails', async ({ page }) => {
    await page.route(/corsproxy\.io/, (route) => route.fulfill({ status: 502, body: 'bad gateway' }));
    await page.route(/api\.allorigins\.win/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: PAGE_HTML }),
    );
    await page.goto('/');
    await page.getByPlaceholder('https://example.com/article').fill(PAGE_URL);
    await page.getByRole('button', { name: 'Fetch' }).click();
    await page.getByRole('button', { name: 'Fetch via proxy' }).click();
    await expect(rawEditor(page)).toHaveValue(/# Remote Heading/);
  });

  test('shows an error when every proxy fails', async ({ page }) => {
    await page.route(/corsproxy\.io|allorigins\.win|codetabs\.com/, (route) =>
      route.fulfill({ status: 500, body: 'nope' }),
    );
    await page.goto('/');
    await page.getByPlaceholder('https://example.com/article').fill(PAGE_URL);
    await page.getByRole('button', { name: 'Fetch' }).click();
    await page.getByRole('button', { name: 'Fetch via proxy' }).click();
    await expect(page.getByText(/Could not fetch URL/)).toBeVisible();
  });
});
