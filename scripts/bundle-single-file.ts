/**
 * Inlines the built site into one self-contained HTML file.
 *
 * The point is a file a non-technical person can unzip and double-click. A
 * normal build can't do that: browsers block ES modules loaded over file://
 * for CORS reasons, so the page comes up blank. An *inline* module script is
 * never fetched, so it sidesteps the restriction entirely.
 *
 * The fonts get folded in as data URIs too. That is what makes the result
 * usable on the Chinese mainland: no fonts.googleapis.com, no sibling files to
 * lose when someone forwards the HTML on its own, and nothing to request when
 * there is no usable network at all.
 *
 * Run via `npm run build:single`, which builds with `--mode single` first —
 * that mode inlines dynamic imports so there is exactly one JS chunk to embed.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const assets = resolve(dist, 'assets');
const fonts = resolve(dist, 'fonts');

const files = readdirSync(assets);
const jsFiles = files.filter((f) => f.endsWith('.js'));
const cssFiles = files.filter((f) => f.endsWith('.css'));

if (jsFiles.length !== 1) {
  throw new Error(
    `Expected exactly one JS chunk to inline, found ${jsFiles.length}. ` +
      `Build with \`vite build --mode single\` (see vite.config.ts) — without ` +
      `inlineDynamicImports, code splitting needs multiple inline scripts in ` +
      `dependency order, which this script does not do.`,
  );
}

const js = readFileSync(resolve(assets, jsFiles[0]), 'utf8');
let css = cssFiles.map((f) => readFileSync(resolve(assets, f), 'utf8')).join('\n');
const favicon = readFileSync(resolve(dist, 'favicon.svg'), 'utf8');

/*
 * Fold the webfonts into the stylesheet as data URIs.
 *
 * They live in public/, so Vite copies them verbatim to dist/fonts/ and
 * rewrites the @font-face URLs to `../fonts/*.woff2` — correct for the hosted
 * build, but a relative path is exactly what a single detached file cannot
 * have. Resolve against dist/fonts/ by basename rather than trusting the
 * relative prefix, which differs with `base`.
 */
const inlinedFonts: string[] = [];
css = css.replace(/url\(\s*["']?([^)"']+\.woff2)["']?\s*\)/g, (_match, ref: string) => {
  const file = resolve(fonts, basename(ref));
  if (!existsSync(file)) {
    throw new Error(`@font-face references ${ref}, but ${file} does not exist`);
  }
  inlinedFonts.push(basename(ref));
  return `url(data:font/woff2;base64,${readFileSync(file).toString('base64')})`;
});

if (inlinedFonts.length === 0) {
  throw new Error(
    'No webfonts were inlined. src/styles/fonts.css should have produced ' +
      '@font-face rules pointing at dist/fonts/ — refusing to ship a build ' +
      'that silently falls back to system faces.',
  );
}

let html = readFileSync(resolve(dist, 'index.html'), 'utf8');

// Replace the external references with inline equivalents.
html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="\.?\/?assets\/[^"]*"[^>]*>/g, '');
const faviconUri = `data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}`;

/*
 * Every insertion uses a replacer FUNCTION, never a replacement string.
 * String.replace() interprets `$$` in a replacement as an escaped `$`, which
 * silently rewrites React's `$$typeof` to `$typeof` and corrupts the bundle
 * into an unparseable mess. A function replacement disables that substitution.
 */
html = html.replace(/<link[^>]*rel="icon"[^>]*>/, () => `<link rel="icon" href="${faviconUri}" />`);

// `</script>` inside the payload would close the tag early.
const safeJs = js.replace(/<\/script>/gi, '<\\/script>');

html = html.replace('</head>', () => `<style>${css}</style>\n</head>`);
html = html.replace('</body>', () => `<script type="module">${safeJs}</script>\n</body>`);

/*
 * Guard: the inlined code must be byte-identical to what Vite produced, modulo
 * the `</script>` escaping. Corruption here yields a blank page that only
 * shows up when someone actually opens the file, so fail loudly instead.
 */
const embedded = html.match(/<script type="module">([\s\S]*?)<\/script>\s*<\/body>/)?.[1];
if (embedded == null) throw new Error('Could not locate the inlined script for verification');
// Compare against what we meant to embed. Don't try to un-escape and compare
// against `js`: the bundle legitimately contains `<\/script>` of its own, so
// that round-trip isn't symmetric and would report a false mismatch.
if (embedded !== safeJs) {
  throw new Error('Inlined JS does not match the build output — refusing to write a corrupt file');
}

/*
 * Guard: nothing may be fetched at load time.
 *
 * This is the invariant the whole offline/China story rests on, and it is easy
 * to lose by accident — one re-added <link> to Google Fonts, one CSS `url()`
 * pointing at a CDN, and the page silently stalls behind the GFW for everyone
 * it was built for. Checking markup and stylesheet URLs catches that at build
 * time rather than in someone's browser in Shenzhen.
 *
 * Scoped to markup attributes and CSS url() only: the JS payload legitimately
 * contains inert absolute URLs (SVG/OOXML namespaces, React's error-decoder
 * message, the attribution link) that are never requested on load.
 */
const loadBearing = [
  ...html.matchAll(/<[^>]+\s(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi),
  ...css.matchAll(/url\(\s*["']?([^)"']+)["']?\s*\)/g),
].map((m) => m[1]);

const remote = loadBearing.filter((u) => /^(?:https?:)?\/\//i.test(u));
if (remote.length > 0) {
  throw new Error(
    `The single-file build must not fetch anything at load time, but these ` +
      `remain remote:\n  ${[...new Set(remote)].join('\n  ')}\n` +
      `Self-host them (see scripts/build-fonts.sh) or inline them.`,
  );
}

const out = resolve(root, 'Conversation Starter.html');
writeFileSync(out, html, 'utf8');
console.log(
  `Wrote ${out} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB) — ` +
    `payload verified intact, ${inlinedFonts.length} fonts inlined, no remote references`,
);
