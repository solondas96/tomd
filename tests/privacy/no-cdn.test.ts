import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const CDN_HOSTS =
  /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|cdn\.sheetjs\.com|unpkg\.com|fonts\.(googleapis|gstatic)\.com/;

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
    const contents = readFileSync(join(ROOT, relativePath), 'utf8');
    expect(contents).not.toMatch(CDN_HOSTS);
  });
});
