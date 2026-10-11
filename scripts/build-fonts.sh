#!/usr/bin/env bash
#
# Regenerates the self-hosted webfonts in public/fonts/.
#
# The app used to pull Fraunces, Outfit and Noto Sans SC from Google Fonts.
# fonts.googleapis.com and fonts.gstatic.com are blocked on the Chinese
# mainland, so that was both a blocking request that never resolves and — for
# Noto Sans SC 900, the face the Chinese topic word is set in — a silent
# downgrade. tokens.css sets `font-synthesis: none`, so there is no synthetic
# bold to fall back on and the loss is visible.
#
# Output is committed to the repo. You only need to run this when changing
# weights, or when widening the Chinese subset.
#
# Requires: python3, curl. Installs fonttools into a throwaway venv.
#
#   ./scripts/build-fonts.sh
#
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="$root/public/fonts"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "==> Setting up fonttools in $work"
python3 -m venv "$work/venv"
"$work/venv/bin/pip" install --quiet fonttools brotli
py="$work/venv/bin/python"
subset="$work/venv/bin/pyftsubset"

echo "==> Downloading upstream sources"
base="https://raw.githubusercontent.com/google/fonts/main"
curl -sSLf -o "$work/Fraunces.ttf"   "$base/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
curl -sSLf -o "$work/Outfit.ttf"     "$base/ofl/outfit/Outfit%5Bwght%5D.ttf"
curl -sSLf -o "$work/NotoSansSC.ttf" "$base/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"
curl -sSLf -o "$work/OFL.txt"        "$base/ofl/notosanssc/OFL.txt"

# --- Latin subset -----------------------------------------------------------
# Latin-1, the typographic punctuation the UI actually uses (curly quotes, en/em
# dashes, ellipsis), the arrow and minus sign, and the Latin-Ext characters
# Fraunces' own name table needs.
LATIN='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191-2193,U+2212,U+2215,U+FEFF,U+FFFD'

# --- Chinese subset ---------------------------------------------------------
# GB2312 level 1 (一级汉字, the 3755 most common characters) is the base, which
# covers ordinary written Chinese. Union that with every character actually
# present in the shipped topic bank and Chinese dictionary, so nothing we ship
# can fall back mid-phrase. A user who imports a topic with a rarer character
# still gets a system fallback for that glyph — that is the deliberate cost of
# not shipping all 20k ideographs.
echo "==> Building the Chinese subset character list"
"$py" - "$root" > "$work/zh-chars.txt" <<'PY'
import re, sys, pathlib

root = pathlib.Path(sys.argv[1])
chars = set()

# GB2312 level 1: 区 16-55, 位 1-94, encoded EUC-CN as (0xA0+qu, 0xA0+wei).
for qu in range(16, 56):
    for wei in range(1, 95):
        try:
            chars.add(bytes([0xA0 + qu, 0xA0 + wei]).decode('gb2312'))
        except UnicodeDecodeError:
            pass

# Everything we actually ship. The topic bank is one file per category, so the
# whole folder is scanned rather than the manifest — a glyph in a file nothing
# loads yet still costs nothing to carry, and a missed one flips mid-phrase.
for path in sorted((root / 'src/data/topics').glob('*.json')):
    chars.update(path.read_text(encoding='utf-8'))
for rel in ('src/i18n/zh.ts', 'src/i18n/en.ts'):
    chars.update((root / rel).read_text(encoding='utf-8'))

# CJK punctuation and fullwidth forms, so 。、「」（） never flip face.
for lo, hi in ((0x3000, 0x303F), (0xFF00, 0xFFEF), (0x2018, 0x201D), (0x2026, 0x2026)):
    chars.update(chr(c) for c in range(lo, hi + 1))

# Keep only what a CJK face should carry; the Latin range is Outfit's job.
keep = sorted(c for c in chars if ord(c) > 0x2000 or c.isprintable())
sys.stdout.write(''.join(keep))
print(f"    {len(keep)} characters", file=sys.stderr)
PY

mkdir -p "$out"

# --- Fraunces ---------------------------------------------------------------
# Display face, used at weights 500 and 600. SOFT and WONK are pinned to their
# defaults (we never vary them); opsz is kept as a range because browsers apply
# optical sizing automatically and Fraunces is set at wildly different sizes
# here — the brand mark versus the settings headings.
echo "==> Fraunces"
"$py" -m fontTools.varLib.instancer -q \
  -o "$work/Fraunces-inst.ttf" "$work/Fraunces.ttf" \
  SOFT=drop WONK=drop wght=500:600 opsz=9:144
"$subset" "$work/Fraunces-inst.ttf" \
  --unicodes="$LATIN" --layout-features='*' --flavor=woff2 \
  --output-file="$out/fraunces.woff2"

# --- Outfit -----------------------------------------------------------------
echo "==> Outfit"
"$py" -m fontTools.varLib.instancer -q \
  -o "$work/Outfit-inst.ttf" "$work/Outfit.ttf" wght=400:700
"$subset" "$work/Outfit-inst.ttf" \
  --unicodes="$LATIN" --layout-features='*' --flavor=woff2 \
  --output-file="$out/outfit.woff2"

# --- Noto Sans SC -----------------------------------------------------------
# Pinned to 900 — a static instance. The variable original is 17MB and we only
# ever ask for the heaviest weight.
echo "==> Noto Sans SC 900"
"$py" -m fontTools.varLib.instancer -q \
  -o "$work/NotoSansSC-900.ttf" "$work/NotoSansSC.ttf" wght=900
"$subset" "$work/NotoSansSC-900.ttf" \
  --text-file="$work/zh-chars.txt" --layout-features='*' --flavor=woff2 \
  --output-file="$out/noto-sans-sc-900.woff2"

cp "$work/OFL.txt" "$out/OFL.txt"

echo
echo "==> Done"
ls -lh "$out"
