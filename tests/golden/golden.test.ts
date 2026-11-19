// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/config';
import { convertFile, isSupported } from '../../src/core';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures');
const GOLDEN_DIR = __dirname;
const BUILD_DIR_NAME = 'build';

interface Fixture {
  format: string;
  filename: string;
  stem: string;
}

function listFixtures(): Fixture[] {
  return readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== BUILD_DIR_NAME)
    .flatMap((formatDir) =>
      readdirSync(join(FIXTURES_DIR, formatDir.name)).map((filename) => ({
        format: formatDir.name,
        filename,
        stem: basename(filename, extname(filename)),
      })),
    );
}

/** Golden path for a fixture. The source extension is kept so `a.csv` and `a.tsv` cannot collide. */
function goldenPath({ format, filename }: Fixture): string {
  return join(GOLDEN_DIR, format, `${filename}.md`);
}

const fixtures = listFixtures();

describe('golden files', () => {
  it('has at least 25 fixtures', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(25);
  });

  it.each(fixtures.map((fixture) => [`${fixture.format}/${fixture.filename}`, fixture] as const))(
    '%s matches its golden output',
    async (_label, fixture) => {
      expect(isSupported({ name: fixture.filename })).toBe(true);
      const bytes = readFileSync(join(FIXTURES_DIR, fixture.format, fixture.filename));
      const result = await convertFile(new File([bytes], fixture.filename), {
        options: DEFAULT_SETTINGS,
        signal: new AbortController().signal,
        onProgress: () => {},
      });
      await expect(`${result.markdown}\n`).toMatchFileSnapshot(goldenPath(fixture));
    },
  );

  it('has no orphaned golden files', () => {
    const expected = new Set(fixtures.map(goldenPath));
    const orphans = readdirSync(GOLDEN_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((dir) => readdirSync(join(GOLDEN_DIR, dir.name)).map((file) => join(GOLDEN_DIR, dir.name, file)))
      .filter((path) => !expected.has(path));
    expect(orphans).toEqual([]);
  });

  it('documents every known-bad output in KNOWN_ISSUES.md', () => {
    const issuesPath = join(GOLDEN_DIR, 'KNOWN_ISSUES.md');
    expect(existsSync(issuesPath)).toBe(true);
    const text = readFileSync(issuesPath, 'utf8');
    for (const fixture of fixtures.filter((f) => text.includes(`${f.format}/${f.filename}`))) {
      expect(text).toMatch(new RegExp(`${fixture.format}/${fixture.filename}[^\\n]*\\b[A-Z]-\\d{2}\\b`));
    }
  });
});
