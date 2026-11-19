// @vitest-environment node
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/config';
import {
  convertFile,
  findConverter,
  FormatId,
  getFileExtension,
  isSupported,
  supportedExtensions,
  UnsupportedFormatError,
  type ConversionContext,
} from '../../src/core';

function makeContext(signal: AbortSignal = new AbortController().signal): ConversionContext {
  return { options: DEFAULT_SETTINGS, signal, onProgress: () => {} };
}

describe('registry lookup', () => {
  it.each([
    ['report.PDF', FormatId.Pdf],
    ['a.docx', FormatId.Docx],
    ['deck.pptx', FormatId.Pptx],
    ['book.xls', FormatId.Xlsx],
    ['data.tsv', FormatId.Csv],
    ['page.htm', FormatId.Html],
    ['notes.markdown', FormatId.Text],
    ['paper.latex', FormatId.Latex],
    ['scan.TIF', FormatId.Image],
    ['archive.tar.json', FormatId.Json],
  ])('maps %s to %s', (name, expected) => {
    expect(findConverter({ name })?.id).toBe(expected);
  });

  it('rejects unknown and extension-less names', () => {
    expect(isSupported({ name: 'photo.heic' })).toBe(false);
    expect(isSupported({ name: 'README' })).toBe(false);
    expect(getFileExtension({ name: 'README' })).toBe('');
  });

  it('registers every extension exactly once', () => {
    const extensions = supportedExtensions();
    expect(new Set(extensions).size).toBe(extensions.length);
  });
});

describe('convertFile (runs in a Node environment, no DOM)', () => {
  it('converts CSV, JSON and text through the registry', async () => {
    const csv = await convertFile(new File(['a,b\n1,2'], 'x.csv'), makeContext());
    expect(csv.markdown).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |');

    const json = await convertFile(new File(['{"k":1}'], 'x.json'), makeContext());
    expect(json.markdown).toBe('```json\n{\n  "k": 1\n}\n```');

    const text = await convertFile(new File(['héllo 世界'], 'x.txt'), makeContext());
    expect(text.markdown).toBe('héllo 世界');
  });

  it('reports progress as a 0..1 fraction', async () => {
    const reports: number[] = [];
    await convertFile(new File(['a,b'], 'x.csv'), {
      ...makeContext(),
      onProgress: ({ fraction }) => reports.push(fraction),
    });
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((fraction) => fraction >= 0 && fraction <= 1)).toBe(true);
  });

  it('throws UnsupportedFormatError for unknown extensions', async () => {
    await expect(convertFile(new File(['x'], 'x.heic'), makeContext())).rejects.toBeInstanceOf(UnsupportedFormatError);
  });

  it('empty CSV yields a friendly placeholder instead of throwing', async () => {
    const result = await convertFile(new File([''], 'empty.csv'), makeContext());
    expect(result.markdown).toBe('> Empty file.');
  });
});

describe('cancellation', () => {
  async function makePptx(slideCount: number): Promise<File> {
    const zip = new JSZip();
    for (let slide = 1; slide <= slideCount; slide++) {
      zip.file(`ppt/slides/slide${slide}.xml`, `<p><a:t>Slide ${slide} text</a:t></p>`);
    }
    return new File([await zip.generateAsync({ type: 'arraybuffer' })], 'deck.pptx');
  }

  it('rejects immediately with AbortError when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(convertFile(new File(['a'], 'x.csv'), makeContext(controller.signal))).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('stops PPTX conversion at the next slide boundary', async () => {
    const controller = new AbortController();
    const seen: string[] = [];
    const promise = convertFile(await makePptx(5), {
      ...makeContext(controller.signal),
      onProgress: ({ message }) => {
        seen.push(message);
        if (message === 'Slide 2...') controller.abort();
      },
    });
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(seen).not.toContain('Slide 3...');
  });

  it('stops EPUB conversion at the next chapter boundary', async () => {
    const zip = new JSZip();
    for (let chapter = 1; chapter <= 4; chapter++)
      zip.file(`c${chapter}.xhtml`, `<body><p>Chapter ${chapter}</p></body>`);
    const controller = new AbortController();
    const seen: string[] = [];
    const promise = convertFile(new File([await zip.generateAsync({ type: 'arraybuffer' })], 'b.epub'), {
      ...makeContext(controller.signal),
      onProgress: ({ message }) => {
        seen.push(message);
        if (message.startsWith('Chapter 1/')) controller.abort();
      },
    });
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(seen.some((message) => message.startsWith('Chapter 2/'))).toBe(false);
  });
});
