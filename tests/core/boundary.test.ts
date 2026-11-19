import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CORE_DIR = join(__dirname, '..', '..', 'src', 'core');
const FORBIDDEN_IMPORT =
  /from\s+['"](react|react-dom|motion|lucide-react)(\/[^'"]*)?['"]|from\s+['"](\.\.\/)+(components|context|hooks)\b/;

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

describe('separation: src/core is UI-free', () => {
  it.each(listFiles(CORE_DIR).map((file) => [file.replace(CORE_DIR, 'src/core')]))(
    '%s imports no React or UI modules',
    (relativePath) => {
      const contents = readFileSync(join(CORE_DIR, relativePath.replace('src/core', '')), 'utf8');
      expect(contents).not.toMatch(FORBIDDEN_IMPORT);
    },
  );
});
