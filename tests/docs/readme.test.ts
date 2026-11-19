// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { friendlyError } from '../../src/lib/utils';

const ROOT = join(__dirname, '..', '..');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const featuresTable = readme.slice(readme.indexOf('## Features'), readme.indexOf('## Privacy'));
const featureRows = featuresTable.split('\n').filter((line) => /^\| [^|\s]+ \| \*\*/.test(line));

describe('README features table (B-11)', () => {
  it('has feature rows', () => {
    expect(featureRows.length).toBeGreaterThanOrEqual(15);
  });

  it.each(featureRows.map((row) => [row.split('|')[2].trim().replace(/\*/g, ''), row] as const))(
    '%s names the tests that verify it, and they exist',
    (_feature, row) => {
      const verifiedBy = row.split('|')[4] ?? '';
      const e2e = [...verifiedBy.matchAll(/E2E ((?:`[a-z-]+`(?:, )?)+)/g)].flatMap((m) =>
        [...m[1].matchAll(/`([a-z-]+)`/g)].map((n) => n[1]),
      );
      const golden = [...verifiedBy.matchAll(/golden `([a-z]+\/[a-z*-]+)/g)].map((m) => m[1]);
      expect(e2e.length + golden.length, `row has no verification reference: ${row}`).toBeGreaterThan(0);
      for (const name of e2e) expect(existsSync(join(ROOT, 'tests/e2e', `${name}.spec.ts`)), name).toBe(true);
      for (const name of golden) {
        const [format, stem] = name.split('/');
        const dir = join(ROOT, 'tests/golden', format);
        const exists = stem.includes('*') || existsSync(dir);
        expect(exists, name).toBe(true);
      }
    },
  );

  it('does not make claims the app cannot back up', () => {
    expect(readme).not.toMatch(/concurrent/i);
    expect(readme).not.toMatch(/syntax overlay/i);
    expect(readme).not.toMatch(/Zero data leaves/i);
    expect(readme).not.toMatch(/sw\.js|manifest\.json/);
  });

  it('discloses the third parties it can contact', () => {
    for (const host of ['corsproxy.io', 'api.allorigins.win', 'api.codetabs.com', 'cdn.jsdelivr.net']) {
      expect(readme).toContain(host);
    }
  });
});

describe('password-protected PDF message', () => {
  it('maps PDF.js PasswordException to a clear message', () => {
    const error = new Error('No password given');
    error.name = 'PasswordException';
    expect(friendlyError(error)).toBe('PDF is password-protected.');
  });
});
