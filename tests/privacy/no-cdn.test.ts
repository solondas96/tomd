import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const CDN_HOSTS =
  /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|cdn\.sheetjs\.com|unpkg\.com|fonts\.(googleapis|gstatic)\.com/;

/** Hosts that source files may *name* (to disclose them to the user) although the app never loads code from them. */
const DISCLOSED_HOSTS: Record<string, string> = { '/src/config/index.ts': 'cdn.jsdelivr.net' };

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx|css)$/.test(name) ? [path] : [];
  });
}

describe('privacy: no third-party code or font CDNs (F-03)', () => {
  const files = [join(ROOT, 'index.html'), ...listSourceFiles(join(ROOT, 'src'))];

  it.each(files.map((file) => [file.replace(ROOT, '')]))('%s references no CDN host', (relativePath) => {
    let contents = readFileSync(join(ROOT, relativePath), 'utf8');
    const disclosed = DISCLOSED_HOSTS[relativePath];
    if (disclosed) contents = contents.replaceAll(disclosed, '');
    expect(contents).not.toMatch(CDN_HOSTS);
  });
});
