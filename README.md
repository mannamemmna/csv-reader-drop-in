# csv-reader-drop-in

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) [![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/mannamemmna/csv-reader-drop-in/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) [![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/mannamemmna/csv-reader-drop-in/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's csv-reader 1.0.0. For each case's `{text, header}` it returns exactly what the reference `readCsv` returns — `{columns, rows, errors}` — including every broken-row case: stray CR outside quotes, doubled quotes, unterminated quotes, quote junk after a closing quote, BOM at the very start, short and long rows padded or cut to the first record's width, and each error `{code, line, row}` in the order met.

## What it does

`solve.js` walks the text once, left to right, but takes runs of ordinary characters as a single `slice` instead of a character at a time: an unquoted field runs to the next comma or line break in one `indexOf`/`charCodeAt` scan, a quoted field body with nothing escaped inside is one `slice`, and `""` pairs are unescaped with `replaceAll` only when they occur. Fields are collected into flat arrays and padded or cut to the header's width. `main.ts` turns V8's incremental marking off before importing the solver, reads `/input/cases.json`, answers each case in order and writes `/output/answers.json`. No dependencies, JavaScript/TypeScript source only.

Verified against the reference on the full practice set (6/6 cases identical) and on 30,000+ random inputs drawn from a hostile alphabet (`a b , " \n \r \r\n \ufeff é 數 ; \t` plus fixed edge cases) with zero differences.

## Run it

```sh
MAKEFUN_INPUT_DIR=./practice/input MAKEFUN_OUTPUT_DIR=./out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=y7cjn3nn&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
