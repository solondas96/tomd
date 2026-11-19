// Regenerates tests/fixtures/pdf/*.pdf from tests/fixtures/build/pdf-src/*.html using headless Chrome.
// Usage: node tests/fixtures/build/build-pdfs.mjs   (set CHROME_PATH to override the browser binary)
//
// The committed PDFs are the fixtures; golden tests never run Chrome. Re-run this only when adding
// or editing a source page, and review the resulting golden diff.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(here, 'pdf-src');
const outputDir = join(here, '..', 'pdf');
const chrome =
  process.env.CHROME_PATH ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(
    existsSync,
  );
if (!chrome) throw new Error('Chrome not found. Set CHROME_PATH.');

const SCAN_WIDTH = 600;
const SCAN_HEIGHT = 300;

/** Writes a deterministic grayscale PNG with no text layer, standing in for a scanned page. */
function writeScanPng(path) {
  const rows = [];
  for (let y = 0; y < SCAN_HEIGHT; y++) {
    const row = Buffer.alloc(1 + SCAN_WIDTH);
    for (let x = 0; x < SCAN_WIDTH; x++) row[1 + x] = (x * 7 + y * 13) % 5 === 0 ? 40 : 235;
    rows.push(row);
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(8 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SCAN_WIDTH, 0);
  header.writeUInt32BE(SCAN_HEIGHT, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // grayscale
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

writeScanPng(join(sourceDir, 'scan.png'));

for (const file of readdirSync(sourceDir).filter((name) => name.endsWith('.html'))) {
  const name = file.replace(/\.html$/, '');
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${join(outputDir, `${name}.pdf`)}`,
      pathToFileURL(join(sourceDir, file)).href,
    ],
    { stdio: 'ignore' },
  );
  console.log(`built pdf/${name}.pdf`);
}
