/**
 * Turning an uploaded file into rows.
 *
 * The point of this feature is that someone with a list of words in a
 * spreadsheet should not have to retype it one entry at a time, so the parser
 * is deliberately forgiving: every column is optional, headers are matched
 * loosely and in both languages, and a file with no header at all is still
 * read as "first column English, second column 中文". What it will not do is
 * guess silently — anything it drops comes back as a message.
 */

export type Bucket = 'base' | 'singapore' | 'china';

export interface ImportedRow {
  category?: string;
  en?: string;
  zh?: string;
  /** Raw text from a region column, resolved to a bucket later. */
  region?: string;
}

export interface ParseResult {
  rows: ImportedRow[];
  errors: string[];
  /** Set when the file was a whole exported bank rather than a list of rows. */
  bank?: unknown;
}

export const ACCEPTED_EXTENSIONS = '.csv,.tsv,.txt,.xlsx,.xls,.json';

/** Ten thousand topics is far past useful and well past what localStorage holds. */
const MAX_ROWS = 10000;

const HEADER_ALIASES: Record<keyof ImportedRow, string[]> = {
  category: ['category', 'categories', 'group', 'topic group', '类别', '分类', '类型'],
  en: ['en', 'english', 'topic', 'word', 'prompt', 'term', '英文', '话题', '英语'],
  zh: ['zh', 'chinese', 'cn', 'mandarin', 'translation', '中文', '中文话题', '翻译'],
  region: ['region', 'locale', 'bucket', 'pool', '地区', '区域'],
};

const normalizeHeader = (value: string): string =>
  value.trim().toLowerCase().replace(/[_\-\s]+/g, ' ');

/**
 * A row-of-cells table into rows, using the first row as a header when it
 * looks like one. "Looks like one" means at least one cell matches a known
 * column name — otherwise the first line is data and would be lost.
 */
function tableToRows(table: string[][]): ParseResult {
  const errors: string[] = [];
  const cleaned = table.filter((row) => row.some((cell) => cell.trim() !== ''));
  if (cleaned.length === 0) return { rows: [], errors: ['That file has no rows in it.'] };

  const headerRow = cleaned[0].map(normalizeHeader);
  const columns: Partial<Record<keyof ImportedRow, number>> = {};

  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [
    keyof ImportedRow,
    string[],
  ][]) {
    const index = headerRow.findIndex((cell) => aliases.includes(cell));
    if (index >= 0) columns[key] = index;
  }

  const hasHeader = Object.keys(columns).length > 0;
  const body = hasHeader ? cleaned.slice(1) : cleaned;

  // No header: fall back to position. One column is a plain word list; a
  // second column is taken as the translation, which is what a two-column
  // spreadsheet almost always means.
  if (!hasHeader) {
    columns.en = 0;
    if (cleaned.some((row) => row.length > 1)) columns.zh = 1;
  }

  const rows: ImportedRow[] = [];
  const at = (row: string[], index?: number): string | undefined => {
    if (index === undefined) return undefined;
    const cell = row[index];
    return cell === undefined || cell.trim() === '' ? undefined : cell.trim();
  };

  for (const row of body) {
    if (rows.length >= MAX_ROWS) {
      errors.push(`Stopped at ${MAX_ROWS} topics — that is more than the bank can hold.`);
      break;
    }
    const parsed: ImportedRow = {
      category: at(row, columns.category),
      en: at(row, columns.en),
      zh: at(row, columns.zh),
      region: at(row, columns.region),
    };
    // A row with no topic text at all is blank padding from a spreadsheet, not
    // a mistake worth reporting.
    if (parsed.en || parsed.zh) rows.push(parsed);
  }

  if (rows.length === 0) errors.push('No topics found — every row was empty.');
  return { rows, errors };
}

/**
 * Delimited text, quotes and all. Hand-rolled rather than pulled from npm: the
 * whole grammar is quoted fields, doubled quotes, and CRLF.
 */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      // Swallow the second half of a CRLF so it doesn't open a blank row.
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);
  return rows;
}

/** Commas or tabs, whichever the first line actually uses. */
const sniffDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  return firstLine.split('\t').length > firstLine.split(',').length ? '\t' : ',';
};

/** Excel and Numbers both write a UTF-8 BOM; it would poison the first header. */
const stripBom = (text: string): string => text.replace(/^\uFEFF/, '');

export async function parseTopicFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      /*
       * Loaded on demand. It is by far the largest thing this app depends on,
       * and most visitors will upload a CSV or a text file and never pay for
       * it — so it stays out of the main bundle.
       */
      const { readSheet } = await import('read-excel-file/browser');
      // The first sheet only. A workbook with several tabs is far more often
      // one list plus notes than several lists worth merging blindly.
      const sheet = await readSheet(file);
      const table = sheet.map((row) => row.map((cell) => (cell == null ? '' : String(cell))));
      return tableToRows(table);
    }

    const text = stripBom(await file.text());

    if (name.endsWith('.json')) {
      // A whole exported bank, not a row list — handed back for the caller to
      // validate against the real schema.
      return { rows: [], errors: [], bank: JSON.parse(text) };
    }

    if (name.endsWith('.txt')) {
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_ROWS)
        .map((line) => ({ en: line }));
      return rows.length > 0
        ? { rows, errors: [] }
        : { rows: [], errors: ['That file has no lines in it.'] };
    }

    return tableToRows(parseDelimited(text, sniffDelimiter(text)));
  } catch (error) {
    return {
      rows: [],
      errors: [
        error instanceof Error
          ? `Could not read that file: ${error.message}`
          : 'Could not read that file.',
      ],
    };
  }
}
