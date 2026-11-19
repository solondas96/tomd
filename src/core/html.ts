import TurndownService from 'turndown';

/** Adds GitHub-flavoured table rules to a Turndown instance. */
export function addTableRule(td: TurndownService): TurndownService {
  td.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement(content) {
      return ' ' + content.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim() + ' |';
    },
  });
  td.addRule('tableRow', {
    filter: 'tr',
    replacement(content) {
      return '|' + content.trim() + '\n';
    },
  });
  td.addRule('table', {
    filter: 'table',
    replacement(content) {
      const rows = content.trim().split('\n').filter(Boolean);
      if (!rows.length) return content;
      const colCount = (rows[0].match(/\|/g) || []).length - 1;
      const sep = '|' + ' --- |'.repeat(Math.max(1, colCount));
      return '\n\n' + rows[0] + '\n' + sep + '\n' + rows.slice(1).join('\n') + '\n\n';
    },
  });
  td.addRule('thead', { filter: ['thead', 'tbody', 'tfoot'], replacement: (c) => c });
  return td;
}

export function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
  });
  return addTableRule(td);
}

/** Result of converting a fetched web page. */
export interface HtmlPageResult {
  markdown: string;
  title: string;
}

/** Elements whose content is page chrome rather than article text. */
const CHROME_ELEMENTS = /<(script|style|nav|header|footer)[^>]*>[\s\S]*?<\/\1>/gi;

/**
 * Converts a full HTML page (for example fetched from a URL) to Markdown.
 *
 * Purpose: shared by URL import; strips scripts, styles and page chrome first.
 * Params: html - the raw page source.
 * Returns: the Markdown body and the trimmed `<title>` text (empty if absent).
 */
export function htmlPageToMarkdown(html: string): HtmlPageResult {
  const cleaned = html.replace(CHROME_ELEMENTS, '');
  const body = cleaned.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '') || cleaned;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return { markdown: createTurndown().turndown(body), title: titleMatch ? titleMatch[1].trim() : '' };
}
