# Conversation Starter

**English** · [中文](README.zh-CN.md)

A speaking-practice tool: spin a topic, then talk about it against a timer.

The point of this version is the **word bank**. It ships with ~250 bilingual topics,
but you are meant to replace them. Upload a spreadsheet or a text file with your own
list — vocabulary for a language class, interview questions, debate motions, prompts
for a workshop — and it becomes the bank you spin against. Everything is stored in
your own browser; nothing is uploaded anywhere.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/main-en.jpg" alt="The English interface, deep research mode, showing a spun topic" width="100%"></td>
    <td width="50%"><img src="docs/screenshots/main-zh.jpg" alt="The same view in Chinese, with a Chinese topic" width="100%"></td>
  </tr>
  <tr>
    <td align="center"><sub>Spin a topic, then talk about it against a timer.</sub></td>
    <td align="center"><sub>Selecting 中文 switches the interface <em>and</em> the topic pool.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/topic-bank.jpg" alt="The topic bank panel, with the file upload area and the category list" width="100%"></td>
    <td width="50%"><img src="docs/screenshots/timers.jpg" alt="The timers panel, with speech and research duration sliders" width="100%"></td>
  </tr>
  <tr>
    <td align="center"><sub>Upload a spreadsheet to replace the word bank.</sub></td>
    <td align="center"><sub>Speech and research timers, in whole minutes.</sub></td>
  </tr>
</table>

```bash
npm install
npm run dev      # http://localhost:5173
```

## What it does

**Three modes.** *Off the cuff* goes straight from spin to a speech timer, with
What? / So what? / Now what? prompts lighting up at a third and two thirds elapsed.
*Deep research* gives you a research timer first — jot one-line notes while you
read, condense them during an open-ended pause, then speak, reflect, and export
the whole session as a Markdown note. *Drill* is for working through a word bank:
short rounds on their own seconds-based timer, and when time is up you rate how
the speaking went — struggled, okay, smooth — and roll straight into the next
spin. Ratings measure fluency, never correctness; there is no due queue and
nothing to owe.

**Sessions leave a trace.** Every finished round is stored in your browser —
topic, mode, and whatever you captured — as the raw material for progress views
to come. Like the word bank, it never leaves your machine.

**Three regions**, additive rather than exclusive:

| Region | Pool | UI |
|---|---|---|
| English | shared topics, English side | English |
| Singapore | shared topics + Singapore-only additions | English |
| China | shared topics, 中文 side + China-only additions | Chinese |

Selecting China switches the entire interface to Chinese — region drives both the
pool and the language, so there is only one control to think about.

## Uploading your own word bank

**Settings → Topics → Upload a word list.** Drop in a file, check the preview, then
choose whether to add to what is there or replace it entirely. Nothing is written
until you confirm.

Accepted: `.csv`, `.tsv`, `.txt`, `.xlsx`, `.xls`, and `.json` (a bank previously
exported from here).

### The simplest thing that works

A plain text file, one topic per line:

```
Nostalgia
The last time you changed your mind
Something you were wrong about
```

Those land in whichever category and region you pick in the import panel.

### The full format

A spreadsheet or CSV with a header row. **Every column is optional**, and anything
you leave out falls back to what is selected in the panel:

| Column | Meaning | If omitted |
|---|---|---|
| `category` | Which category the topic belongs to | Goes to *General* |
| `en` | The topic in English | Falls back to the `zh` text |
| `zh` | The topic in 中文 | Falls back to the `en` text |
| `region` | `shared`, `singapore`, or `china` | Uses the panel's selection |

```csv
category,en,zh,region
General,Nostalgia,怀旧,shared
General,The best kopi order,,singapore
Fitness,Cold plunges,冷水浴,shared
Fitness,,晨跑还是夜跑,china
```

Header names are matched loosely and in both languages — `english`, `topic`, `word`,
`meaning`, `中文`, `分类` and similar all work, so a two-column vocabulary sheet
(`word` / `meaning`) imports as-is. If there is no recognisable header at all, the
first column is read as English and the second as 中文.

A few behaviours worth knowing:

- **Categories are created as needed.** A `category` value that does not exist yet
  becomes a new category; one that matches an existing name is merged into it.
- **Duplicates are skipped**, case- and whitespace-insensitively, both against your
  existing bank and within the uploaded file.
- **One-language rows are mirrored.** A shared topic with only English reuses that
  text for 中文, so the topic stays reachable in every region rather than vanishing
  from one. The preview tells you how many rows this affected.

Use **Download a template** in the panel to get a starter file. It carries a
`notes` column explaining what each row demonstrates — the importer ignores
columns it doesn't recognise, so you can leave that column in place or delete it,
and either way it never becomes a topic. Type over the examples and upload.

The template downloads with a UTF-8 byte-order mark so Excel opens Chinese text
correctly rather than as mojibake; the importer strips it back off.

### Getting your bank back out

**Export as JSON** round-trips exactly and is the one to keep as a backup.
**Export as CSV** gives you something editable in Excel or Sheets that this importer
reads back unchanged. **Reset to the original topics** restores the shipped bank.

To change the topics that ship with the project rather than just your own copy,
edit the files the shipped bank is made of: one JSON file per category in
`src/data/topics/`, and `src/data/topics.json`, which lists which of those files
load and in what order the interface shows them. Adding a category means adding
the file and naming it in the manifest; a name with no file behind it fails at
startup, and `npm run verify` checks the manifest against the folder.

## Where your topics live

In `localStorage`, under `conversation-starter:topics`, in the browser you used.
There is no account and no server. That means:

- Clearing site data clears your bank — export first.
- A different browser or device starts from the shipped defaults.
- Nothing you write is visible to anyone else, including me.

## How the spin works

4800ms, `easeOutCubic` over a step count of `revolutions × reelLength + offset`,
one tick per changed step, landing index decided up front.

Step count scales with pool size, so a large topic bank would spin visibly denser
than a small one. Instead of changing the formula, each spin samples a **30-topic
reel** from the full pool and runs the formula over that. Every bank keeps the same
cadence, every topic stays reachable, and the draw stays uniform
(`30/n × 1/30 = 1/n`) — verified by chi-square in `scripts/verify-reel.ts`.

## Building

```bash
npm run build     # type-check then bundle to dist/
npm run preview   # serve the built output
```

Assets are built with relative paths, so `dist/` works on a subpath host like
GitHub Pages. It still needs *a* server, though: browsers refuse to load ES
modules over `file://`, so double-clicking `dist/index.html` gets you a blank
page. For a copy that runs off disk, build the single file below.

### One self-contained file

```bash
npm run build:single   # writes "Conversation Starter.html"
```

Everything — script, styles, fonts, favicon — is inlined into one HTML file
that runs by double-clicking, with no server, no install, and **no network
requests at all**. An inline `<script type="module">` is never fetched, which
is what sidesteps the `file://` restriction.

This build passes `--mode single` so Vite inlines dynamic imports: the
`read-excel-file` chunk that the hosted build loads lazily has to be part of
the one script tag. `scripts/bundle-single-file.ts` verifies the embedded
payload byte-for-byte and refuses to write a file that still references
anything remote.

### Offline distribution

```bash
npm run pack:china   # writes 交谈话题-离线版.zip
```

GitHub Pages is unreliable-to-blocked on the Chinese mainland, so the way this
reaches people there is a zip on Baidu Netdisk (百度网盘): the single file
renamed to `交谈话题.html`, a Chinese tutorial page, a readme, and the font
licences. Sources live in `packaging/`.

`scripts/pack-china.ts` writes the archive by hand rather than shelling out to
`zip`, because macOS ships Info-ZIP built without Unicode support — it stores
UTF-8 filenames but never sets the flag that says so, and Chinese Windows then
decodes them as GBK and shows 乱码. The script sets the flag and asserts it
afterwards. The readme gets a UTF-8 BOM and CRLF line endings for the same
reason: Notepad guesses otherwise.

## Fonts

Fraunces, Outfit and Noto Sans SC are **self-hosted** from `public/fonts/`.
They used to come from Google Fonts, which made `fonts.googleapis.com` the
app's only external request — blocked in China, where it stalled on a render-
blocking stylesheet and then quietly dropped Noto Sans SC 900, the face the
Chinese topic word is set in. `tokens.css` sets `font-synthesis: none`, so
there was no synthetic bold to soften the loss.

```bash
npm run build:fonts   # regenerate the subsets
```

Fraunces and Outfit stay variable over the weights actually used, subset to
Latin. Noto Sans SC is pinned to a static 900 and subset to GB2312 level 1
(the 3755 most common characters) unioned with every character in the shipped
topic bank — 560KB instead of 17MB. An imported topic using a rarer character
falls back to PingFang SC or Microsoft YaHei for that glyph.

All three are SIL Open Font License 1.1; see `public/fonts/OFL.txt`.

## Verifying

```bash
npm run typecheck     # also enforces that both locales have every string
npm run verify        # phase machine, time helpers, topic bank integrity
npm run verify:reel   # spin distribution is uniform, no topic is unreachable
npm run verify:import # CSV parsing and the merge fold, end to end
```

## Credits

Built by **Jinininn**.

Inspired by [unprompted.cool](https://www.unprompted.cool/), which is the original
idea and worth visiting. This is an independent reimplementation, extended with
regional topic banks, a fully localized Chinese interface, and the uploadable word
bank described above.

MIT licensed — see [LICENSE](LICENSE).
