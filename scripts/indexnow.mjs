#!/usr/bin/env node
// Tell Bing, Naver, Yandex, Seznam (IndexNow) which public URLs changed in a push.
// Usage: node scripts/indexnow.mjs <before-sha>   (run after the site is deployed)
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const SITE = 'https://chungwonwoo.com';
const KEY = '93805c4d8d5a0d401237d9d1970f3697';
const before = process.argv[2] || '';

let files = [];
try {
  const range = /^0+$/.test(before) || !before ? 'HEAD~1..HEAD' : `${before}..HEAD`;
  files = execSync(`git diff --name-only ${range}`, { encoding: 'utf8' }).split('\n').filter(Boolean);
} catch { files = []; }

const urls = new Set();
const allPapers = () => {
  const xml = fs.readFileSync('static/sitemap-papers.xml', 'utf8');
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1]);
};
for (const f of files) {
  if (f === 'layouts/index.html') urls.add(`${SITE}/`);
  else if (f === 'static/ko/index.html') urls.add(`${SITE}/ko/`);
  else if (f === 'static/papers/index.html') urls.add(`${SITE}/papers/`);
  else if (/^static\/papers\/[^/]+\.html$/.test(f)) urls.add(`${SITE}/${f.slice('static/'.length)}`);
  else if (['static/woo-publications.bib', 'data/paper-meta.json', 'data/metrics.json'].includes(f)) {
    urls.add(`${SITE}/`); urls.add(`${SITE}/ko/`); urls.add(`${SITE}/papers/`);
    if (f !== 'data/metrics.json') allPapers();
  }
  else if (/^content\/(blog|teaching)\/[^/]+\//.test(f)) {
    const [, sec, slug] = f.match(/^content\/(blog|teaching)\/([^/]+)\//);
    urls.add(`${SITE}/${sec}/${slug}/`); urls.add(`${SITE}/${sec}/`);
  }
}

const list = [...urls];
if (!list.length) { console.log('IndexNow: no public pages changed in this push'); process.exit(0); }
const body = JSON.stringify({ host: 'chungwonwoo.com', key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: list });
for (const ep of ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow']) {
  try {
    const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
    console.log(`IndexNow ${ep} -> HTTP ${r.status} (${list.length} URLs)`);
  } catch (e) { console.warn(`IndexNow ${ep} failed: ${e.message}`); }
}
list.forEach(u => console.log('  ' + u));
