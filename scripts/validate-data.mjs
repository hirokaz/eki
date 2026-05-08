#!/usr/bin/env node
// データ不変条件のバリデータ
// 使い方: node scripts/validate-data.mjs
// 失敗時はプロセスが exit code 1 で終了し、CI で落ちる。

import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

const trigrams    = read('data/trigrams.json');
const hexagrams   = read('data/hexagrams.json');
const worldview   = read('data/worldview.json');
const applications = read('data/applications.json');
const figures     = read('data/figures.json');
const disciplines = read('data/disciplines.json');
const deep        = read('data/hexagrams-deep.json');

const errors = [];
const log = (msg) => errors.push(msg);

// trigrams ---------------------------------------------------
if (trigrams.length !== 8) log(`trigrams: count ${trigrams.length} != 8`);
for (const t of trigrams) {
  const expected = t.lines[2] * 4 + t.lines[1] * 2 + t.lines[0];
  if (expected !== t.id) log(`trigram id ${t.id} != computed ${expected}`);
  if (t.id.toString(2).padStart(3, '0') !== t.binary) log(`trigram ${t.id} binary mismatch`);
}

// hexagrams --------------------------------------------------
if (hexagrams.length !== 64) log(`hexagrams: count ${hexagrams.length} != 64`);
const fuxiSet = new Set();
const kwSet = new Set();
for (const h of hexagrams) {
  if (h.upper * 8 + h.lower !== h.fuxi) log(`KW#${h.kw}: fuxi mismatch`);
  if (String.fromCodePoint(0x4DC0 + h.kw - 1) !== h.symbol) log(`KW#${h.kw}: symbol mismatch`);
  fuxiSet.add(h.fuxi);
  kwSet.add(h.kw);
}
if (fuxiSet.size !== 64) log(`hexagrams: duplicate fuxi values, unique=${fuxiSet.size}`);
if (kwSet.size !== 64) log(`hexagrams: duplicate kw values, unique=${kwSet.size}`);

const hexKwSet = new Set(hexagrams.map((h) => h.kw));
const wvIdSet  = new Set(worldview.map((p) => p.id));
const figIdSet = new Set(figures.map((f) => f.id));
const validLevels = new Set(['fact', 'tradition', 'interpretation']);

// worldview ---------------------------------------------------
for (const p of worldview) {
  for (const kw of p.related_kw || []) {
    if (!hexKwSet.has(kw)) log(`worldview ${p.id}: kw ${kw} not in hexagrams`);
  }
}

// applications ------------------------------------------------
for (const a of applications) {
  if (!['life', 'business', 'relationships'].includes(a.category)) {
    log(`application ${a.id}: invalid category ${a.category}`);
  }
  for (const kw of a.related_kw || []) {
    if (!hexKwSet.has(kw)) log(`application ${a.id}: kw ${kw} not in hexagrams`);
  }
  for (const id of a.principles || []) {
    if (!wvIdSet.has(id)) log(`application ${a.id}: principle ${id} not in worldview`);
  }
}

// figures -----------------------------------------------------
for (const f of figures) {
  if (!validLevels.has(f.level)) log(`figure ${f.id}: invalid level ${f.level}`);
  for (const kw of f.related_kw || []) {
    if (!hexKwSet.has(kw)) log(`figure ${f.id}: kw ${kw} not in hexagrams`);
  }
  for (const id of f.principles || []) {
    if (!wvIdSet.has(id)) log(`figure ${f.id}: principle ${id} not in worldview`);
  }
}

// disciplines -------------------------------------------------
for (const d of disciplines) {
  if (!validLevels.has(d.level)) log(`discipline ${d.id}: invalid level ${d.level}`);
  for (const kw of d.related_kw || []) {
    if (!hexKwSet.has(kw)) log(`discipline ${d.id}: kw ${kw} not in hexagrams`);
  }
  for (const id of d.exemplars || []) {
    if (!figIdSet.has(id)) log(`discipline ${d.id}: exemplar ${id} not in figures`);
  }
}

// hexagrams-deep -----------------------------------------------
if (deep.length !== 64) log(`hexagrams-deep: count ${deep.length} != 64`);
const deepKwSet = new Set();
for (const d of deep) {
  if (!hexKwSet.has(d.kw)) log(`hexagrams-deep: kw ${d.kw} not in hexagrams`);
  if (deepKwSet.has(d.kw)) log(`hexagrams-deep: duplicate kw ${d.kw}`);
  deepKwSet.add(d.kw);
  for (const f of ['image', 'modern', 'key_question']) {
    if (!d[f] || typeof d[f] !== 'string') log(`hexagrams-deep KW#${d.kw}: missing ${f}`);
  }
}

// -------------------------------------------------------------
if (errors.length) {
  for (const e of errors) console.error('FAIL:', e);
  process.exit(1);
}

console.log(`OK: trigrams=${trigrams.length}, hexagrams=${hexagrams.length}, deep=${deep.length}, worldview=${worldview.length}, applications=${applications.length}, figures=${figures.length}, disciplines=${disciplines.length}`);
