# Conversation Starter

A speaking-practice tool: spin a topic, then talk about it against a timer.

The point of this version is the **word bank**. It ships with ~250 bilingual topics,
but you are meant to replace them. Upload a spreadsheet or a text file with your own
list — vocabulary for a language class, interview questions, debate motions, prompts
for a workshop — and it becomes the bank you spin against. Everything is stored in
your own browser; nothing is uploaded anywhere.

```bash
npm install
npm run dev      # http://localhost:5173
```

## What it does

**Two modes.** *Off the cuff* goes straight from spin to a speech timer, with
What? / So what? / Now what? prompts lighting up at a third and two thirds elapsed.
*Deep research* gives you a research timer first, then an open-ended pause before
you start speaking.

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

Use **Download a template** in the panel to get a correctly shaped starter file.

### Getting your bank back out

**Export as JSON** round-trips exactly and is the one to keep as a backup.
**Export as CSV** gives you something editable in Excel or Sheets that this importer
reads back unchanged. **Reset to the original topics** restores the shipped bank.

To change the topics that ship with the project rather than just your own copy,
export as JSON and replace `src/data/topics.json`.

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
GitHub Pages and also when opened directly from disk.

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
