import { expect, test } from '@playwright/test';
import { openWithConverted, rawEditor } from './helpers';

const LOCAL_SCHEMES = ['data:', 'blob:'];

test.describe('privacy: conversion makes no third-party requests', () => {
  for (const fixture of ['pdf/prose-inline.pdf', 'docx/basic.docx', 'xlsx/multisheet.xlsx', 'csv/basic.csv']) {
    test(`${fixture}`, async ({ page, baseURL }) => {
      const externalRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (!url.startsWith(baseURL ?? '') && !LOCAL_SCHEMES.some((scheme) => url.startsWith(scheme))) {
          externalRequests.push(url);
        }
      });
      await openWithConverted(page, fixture);
      await expect(rawEditor(page)).not.toHaveValue('');
      expect(externalRequests).toEqual([]);
    });
  }
});
