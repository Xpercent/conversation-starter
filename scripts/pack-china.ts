/**
 * Builds the offline distribution zip, aimed at Baidu Netdisk (百度网盘).
 *
 * GitHub Pages is unreliable-to-blocked on the Chinese mainland, so the way
 * this app actually reaches people there is: someone downloads a zip, unzips
 * it, and double-clicks an HTML file. Everything here serves that one path.
 *
 * The archive is written by hand rather than shelled out to `zip`, because
 * every filename in it is Chinese and the flag that says so has to be set.
 * See writeZip() below — that is the whole reason this file is longer than a
 * couple of copyFileSync calls.
 *
 * Run via `npm run pack:china`, which builds the single-file artifact first.
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDER = '交谈话题-离线版';
const zipPath = resolve(root, `${FOLDER}.zip`);

/* -------------------------------------------------------------------------
 * A minimal zip writer.
 *
 * macOS ships Info-ZIP 3.0 built *without* Unicode support (`zip -v` lists no
 * UTF-8 feature, and `-UN=UTF8` is rejected outright). It happily stores UTF-8
 * filename bytes but never sets general-purpose bit 11, the flag that tells an
 * extractor those bytes are UTF-8. Windows then falls back to the OEM
 * codepage — GBK on a Chinese system — and every name in the archive comes out
 * as 乱码. That is a bad first impression for a download whose entire audience
 * is Chinese, and it is not something the recipient can be told to work around
 * before they have already seen it.
 *
 * Writing the entries ourselves is about eighty lines and lets us set the bit.
 * It also means no `__MACOSX`, no `.DS_Store`, and no external binary.
 * ---------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** MS-DOS packed date/time, the only timestamp a base zip entry carries. */
function dosDateTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

interface Entry {
  /** Path inside the archive. A trailing slash makes it a directory. */
  name: string;
  data?: Buffer;
}

const UTF8_NAMES = 0x0800; // general-purpose bit 11

function writeZip(entries: Entry[], out: string): void {
  const { time, date } = dosDateTime(new Date());
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const isDir = entry.name.endsWith('/');
    const raw = entry.data ?? Buffer.alloc(0);
    const name = Buffer.from(entry.name, 'utf8');

    // Store directories and anything deflate makes bigger; deflate the rest.
    const deflated = isDir || raw.length === 0 ? null : deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated !== null && deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(UTF8_NAMES, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x031e, 4); // made by: UNIX, zip 3.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_NAMES, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attrs
    // External attrs: unix mode in the high word, plus the DOS directory bit
    // so Windows treats the folder entry as a folder.
    // `>>> 0` because 0o100644 << 16 overflows into a negative signed int32.
    central.writeUInt32LE(isDir ? ((0o040755 << 16) | 0x10) >>> 0 : (0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);

    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }

  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // this disk
  end.writeUInt16LE(0, 6); // disk with central directory
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // comment length

  writeFileSync(out, Buffer.concat([...locals, centralBytes, end]));
}

/* ---------------------------------------------------------------------- */

const single = resolve(root, 'Conversation Starter.html');
if (!existsSync(single)) {
  throw new Error(`${single} is missing — run \`npm run build:single\` first.`);
}

/*
 * The BOM is why the readme is rewritten here rather than copied. Windows
 * Notepad guesses a BOM-less file's encoding from its bytes, and guesses GBK
 * for Chinese often enough to matter — the reader's first impression would be
 * a screenful of 乱码 telling them the download is broken. CRLF for the same
 * audience: Notepad on older Windows renders lone newlines as one long line.
 */
const readme = readFileSync(resolve(root, 'packaging/README.txt'), 'utf8');
const readmeBytes = Buffer.from('﻿' + readme.replace(/\r?\n/g, '\r\n'), 'utf8');

rmSync(zipPath, { force: true });

const entries: Entry[] = [
  { name: `${FOLDER}/` },
  { name: `${FOLDER}/交谈话题.html`, data: readFileSync(single) },
  { name: `${FOLDER}/使用说明.html`, data: readFileSync(resolve(root, 'packaging/使用说明.html')) },
  { name: `${FOLDER}/README.txt`, data: readmeBytes },
  { name: `${FOLDER}/OFL.txt`, data: readFileSync(resolve(root, 'public/fonts/OFL.txt')) },
];

writeZip(entries, zipPath);

/*
 * Read the archive back and re-check the one property that is invisible until
 * it fails, on someone else's computer, in another country.
 */
const written = readFileSync(zipPath);

// Walk the central directory rather than scanning for signatures — deflated
// bytes can contain a "PK\x03\x04" sequence and a scan would trip over it.
const eocd = written.length - 22;
if (written.readUInt32LE(eocd) !== 0x06054b50) {
  throw new Error('Malformed archive: no end-of-central-directory record where expected');
}
const count = written.readUInt16LE(eocd + 10);
if (count !== entries.length) {
  throw new Error(`Archive lists ${count} entries, expected ${entries.length}`);
}

let cursor = written.readUInt32LE(eocd + 16);
for (let i = 0; i < count; i++) {
  if (written.readUInt32LE(cursor) !== 0x02014b50) {
    throw new Error(`Malformed central directory entry ${i}`);
  }
  const nameLen = written.readUInt16LE(cursor + 28);
  const name = written.subarray(cursor + 46, cursor + 46 + nameLen).toString('utf8');
  const localAt = written.readUInt32LE(cursor + 42);

  // Both copies of the flag matter: extractors differ over which they read.
  const flagged =
    (written.readUInt16LE(cursor + 8) & UTF8_NAMES) !== 0 &&
    (written.readUInt16LE(localAt + 6) & UTF8_NAMES) !== 0;
  if (!flagged) {
    throw new Error(`"${name}" is missing the UTF-8 filename flag — it would unzip as 乱码.`);
  }

  cursor +=
    46 + nameLen + written.readUInt16LE(cursor + 30) + written.readUInt16LE(cursor + 32);
}

console.log(`Wrote ${zipPath} (${(written.byteLength / 1024 / 1024).toFixed(2)} MB)`);
for (const e of entries) {
  const size = e.data ? `${(e.data.byteLength / 1024).toFixed(0)} KB` : '';
  console.log(`  ${e.name.padEnd(34)} ${size}`);
}
