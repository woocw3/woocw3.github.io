#!/usr/bin/env node
// Refresh data/metrics.json from the public Google Scholar profile.
// Google Scholar often blocks cloud IPs (GitHub Actions); in that case the
// cached values are kept and the script exits 0 so the build still runs.
// A weekly Aside routine on the owner's PC runs this and pushes the result.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data/metrics.json');
const USER = 'icd6fggAAAAJ';
const old = JSON.parse(fs.readFileSync(FILE, 'utf8'));

try {
  const r = await fetch(`https://scholar.google.com/citations?user=${USER}&hl=en`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(20000),
  });
  const html = await r.text();
  const cells = [...html.matchAll(/<td class="gsc_rsb_std">(\d+)<\/td>/g)].map(m => Number(m[1]));
  if (!r.ok || cells.length < 6) throw new Error(`unexpected response (HTTP ${r.status}, ${cells.length} cells)`);
  const [citations, , h, , i10] = cells;
  // sanity check: Scholar totals never fall sharply; treat a big drop as a parsing problem
  if (citations < old.citations * 0.8 || h < old.h_index - 2) throw new Error(`implausible values ${citations}/${h}`);
  const next = { ...old, citations, h_index: h, i10_index: i10, updated: new Date().toISOString().slice(0, 10) };
  const same = next.citations === old.citations && next.h_index === old.h_index && next.i10_index === old.i10_index;
  if (!same) fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n');
  console.log(same ? `metrics unchanged (${citations} citations, h=${h})` : `metrics updated: ${old.citations}->${citations} citations, h ${old.h_index}->${h}`);
} catch (e) {
  console.warn(`Google Scholar not reachable, keeping cached metrics (${old.citations} citations, h=${old.h_index}): ${e.message}`);
}
