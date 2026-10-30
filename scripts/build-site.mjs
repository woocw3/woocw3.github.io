#!/usr/bin/env node
// Regenerates the parts of chungwonwoo.com that are derived from data:
//   - paper lists on the English/Korean home pages, /papers/ index, llms.txt
//   - sitemap-papers.xml
//   - summary pages for papers that do not have a hand-written page yet
//   - paper counts and Google Scholar metrics (citations, h-index)
//   - "Latest videos" section from the YouTube channel (lecture recordings excluded)
//
// Single source of truth for papers: static/woo-publications.bib
// Optional display overrides per BibTeX key: data/paper-meta.json
// Metrics cache: data/metrics.json (refresh with scripts/fetch-metrics.mjs)
//
// Usage: node scripts/build-site.mjs [--offline]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBib, clean, authorsList } from './lib/bib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://chungwonwoo.com';
const CHANNEL_ID = 'UC0N09KMn3lkrpTtI-Sswbng';
const OFFLINE = process.argv.includes('--offline');
const today = new Date().toISOString().slice(0, 10);

const p = (...a) => path.join(ROOT, ...a);
const read = f => fs.readFileSync(p(f), 'utf8');
const exists = f => fs.existsSync(p(f));
const changed = [];
function write(f, s) {
  const before = exists(f) ? read(f) : null;
  if (before !== s) { fs.mkdirSync(path.dirname(p(f)), { recursive: true }); fs.writeFileSync(p(f), s); changed.push(f); }
}
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const escText = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hasHangul = s => /[\uAC00-\uD7A3]/.test(s || '');

// ---------------------------------------------------------------- papers
const META = JSON.parse(read('data/paper-meta.json'));
const bibText = read('static/woo-publications.bib');
const entries = parseBib(bibText).filter(e => e.type === 'article');

const TOPICS = {
  en: Object.fromEntries(META.topics.en.map(t => [t.topic, t.label])),
  ko: Object.fromEntries(META.topics.ko.map(t => [t.topic, t.label])),
};
const TOPIC_ORDER = META.topics.en.map(t => t.topic).filter(t => t !== 'books');
TOPICS.en.other = 'Other topics'; TOPICS.ko.other = '기타';

function autoSlug(e) {
  const t = clean(e.fields.title_en || e.fields.title).toLowerCase();
  const words = t.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter(w => w && !['a', 'an', 'the', 'of', 'on', 'in', 'and', 'for', 'to', 'by', 'with', 'from', 'do', 'does', 'is', 'are'].includes(w));
  const base = words.slice(0, 5).join('-') || e.key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${base}-${e.fields.year}`;
}

const papers = entries.map((e, i) => {
  const m = META.papers[e.key] || {};
  const f = e.fields;
  const title = clean(f.title);
  const journal = clean(f.journal);
  const titleEn = clean(f.title_en) || (hasHangul(title) ? '' : title);
  const journalEn = clean(f.journal_en) || journal;
  const inKorean = m.in_korean ?? (hasHangul(title) && !!titleEn);
  return {
    key: e.key, fields: f,
    slug: m.slug || clean(f.slug) || autoSlug(e),
    topic: m.topic || clean(f.topic) || 'other',
    order: m.order ?? 10000 + i,
    year: clean(f.year),
    title, journal,
    display_en: m.display_en || titleEn || title,
    journal_en: m.journal_en || journalEn,
    in_korean: inKorean,
    display_ko: m.display_ko || title,
    journal_ko: m.journal_ko || journal,
    index_title: m.index_title || title,
    index_journal: m.index_journal || journal,
    generated: !m.slug,
  };
});

// group by topic, newest first, keep hand-curated order for ties
function grouped() {
  const topics = [...TOPIC_ORDER];
  if (papers.some(x => !topics.includes(x.topic))) topics.push('other');
  return topics.map(t => ({
    topic: t,
    items: papers.filter(x => (topics.includes(x.topic) ? x.topic : 'other') === t)
      .sort((a, b) => (b.year - a.year) || (a.order - b.order)),
  })).filter(g => g.items.length);
}
const GROUPS = grouped();
const N = papers.length;
const journalsFor = lang => new Set(papers.map(x => (lang === 'ko' ? x.journal_ko : x.journal_en).trim().toLowerCase())).size;
const journals = journalsFor('en');

function homeList(lang) {
  const out = [];
  for (const g of GROUPS) {
    out.push(`    <h3 data-topic="${g.topic}">${escText(TOPICS[lang][g.topic])}</h3>`);
    out.push('    <ul class="dot">');
    for (const x of g.items) {
      if (lang === 'en') {
        out.push(`      <li><a href="/papers/${x.slug}.html">${esc(x.display_en)}</a>${x.in_korean ? ' <em>(in Korean)</em>' : ''} — <em>${esc(x.journal_en)}</em>, <span class="yr">${x.year}</span></li>`);
      } else {
        out.push(`      <li><a href="/papers/${x.slug}.html">${esc(x.display_ko)}</a> — <em>${esc(x.journal_ko)}</em>, <span class="yr">${x.year}</span></li>`);
      }
    }
    out.push('    </ul>', '');
  }
  return out.join('\n');
}

function indexList() {
  const out = [];
  for (const g of GROUPS) {
    out.push(`<h2>${escText(TOPICS.en[g.topic])}</h2>`, '<ul>');
    for (const x of g.items) out.push(`  <li><a href="${x.slug}.html">${esc(x.index_title)}</a> — <i>${esc(x.index_journal)}</i>, ${x.year}</li>`);
    out.push('</ul>', '');
  }
  return out.join('\n');
}

function llmsList() {
  const out = [];
  for (const g of GROUPS) {
    out.push(`### ${TOPICS.en[g.topic]}`, '');
    for (const x of g.items) out.push(`- [${x.index_title}](${SITE}/papers/${x.slug}.html): ${x.index_journal}, ${x.year}.`);
    out.push('');
  }
  return out.join('\n');
}

function between(text, start, end, body, file) {
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < 0 || b < a) throw new Error(`markers ${start} / ${end} not found in ${file}`);
  return text.slice(0, a + start.length) + '\n' + body + '\n' + text.slice(b);
}

// ---------------------------------------------------------------- metrics
const metrics = exists('data/metrics.json') ? JSON.parse(read('data/metrics.json')) : { citations: 1450, h_index: 17 };
const citesFloor = Math.floor(metrics.citations / 50) * 50;
const citesEn = citesFloor.toLocaleString('en-US') + '+';
const H = metrics.h_index;

function applyMetrics(s, lang = 'en') {
  return s
    .replace(/\d+ published papers, [\d,]+\+ citations, h-index \d+/g, `${N} published papers, ${citesEn} citations, h-index ${H}`)
    .replace(/게재논문 \d+편, 피인용 [\d,]+회 이상, h-index \d+/g, `게재논문 ${N}편, 피인용 ${citesFloor.toLocaleString('en-US')}회 이상, h-index ${H}`)
    .replace(/<div><b>\d+<\/b>(published papers|게재논문)<\/div>/g, (_, l) => `<div><b>${N}</b>${l}</div>`)
    .replace(/<b>[\d,]+\+<\/b>(citations|피인용|<span>citations|<span>피인용)/g, (_, l) => `<b>${citesEn}</b>${l}`)
    .replace(/<b>\d+<\/b>(h-index|<span>h-index)/g, (_, l) => `<b>${H}</b>${l}`)
    .replace(/data-kpi="papers">\d+</g, `data-kpi="papers">${N}<`)
    .replace(/data-kpi="journals">\d+</g, `data-kpi="journals">${journalsFor(lang)}<`)
    .replace(/All \d+ published papers\./g, `All ${N} published papers.`)
    .replace(/게재논문 \d+편 전체입니다/g, `게재논문 ${N}편 전체입니다`);
}

// ---------------------------------------------------------------- YouTube
const isLecture = t => /^\d{6,8}[\s_]/.test(t) || /\d+\s*주차/.test(t) || /^\d{8}/.test(t);
async function loadVideos() {
  let list = exists('data/youtube.json') ? JSON.parse(read('data/youtube.json')) : [];
  if (!OFFLINE) {
    try {
      const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, { signal: AbortSignal.timeout(15000) });
      if (r.ok) {
        const xml = await r.text();
        list = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
          const e = m[1];
          const g = re => (e.match(re) || [])[1] || '';
          return {
            id: g(/<yt:videoId>([^<]+)/),
            title: g(/<title>([^<]+)/).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
            published: g(/<published>([^<]+)/).slice(0, 10),
          };
        });
        write('data/youtube.json', JSON.stringify(list, null, 2) + '\n');
      }
    } catch (err) { console.warn('YouTube feed unavailable, using cache:', err.message); }
  }
  return list.filter(v => v.id && !isLecture(v.title)).slice(0, 6);
}

function videoSection(videos, lang) {
  if (!videos.length) return '';
  const h = lang === 'en' ? 'Latest Videos' : '최신 영상';
  const more = lang === 'en' ? 'More on the YouTube channel →' : '유튜브 채널에서 더 보기 →';
  const items = videos.map(v => `      <li>
        <a class="thumb" data-label="YouTube" href="https://www.youtube.com/watch?v=${v.id}">
          <img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()">
        </a>
        <div>
          <a class="mtitle" href="https://www.youtube.com/watch?v=${v.id}">${esc(v.title)}</a>
          <div class="mmeta">YouTube · ${v.published.replace(/-/g, '.')}</div>
        </div>
      </li>`).join('\n');
  return `  <section id="videos">
    <h2>${h}</h2>
    <ul class="media">
${items}
    </ul>
    <p class="note"><a href="https://www.youtube.com/channel/${CHANNEL_ID}">${more}</a></p>
  </section>
`;
}

// ---------------------------------------------------------------- generated paper pages
function apaAuthors(list) {
  const fmt = a => {
    if (hasHangul(a)) return a;
    const parts = a.split(/\s+/);
    const last = parts.pop();
    return `${last}, ${parts.map(x => x.split('-').map(y => y[0] + '.').join('-')).join(' ')}`;
  };
  const xs = list.map(fmt);
  if (xs.length === 1) return xs[0];
  return xs.slice(0, -1).join(', ') + ', &amp; ' + xs[xs.length - 1];
}

function paperPage(x) {
  const f = x.fields;
  const authors = authorsList(f.author);
  const doi = clean(f.doi);
  const doiUrl = doi ? `https://doi.org/${doi}` : '';
  const pages = clean(f.pages).replace('–', '-');
  const [fp, lp] = pages.split('-');
  const vol = clean(f.volume), num = clean(f.number);
  const abstract = clean(f.abstract);
  const abstractKo = clean(f.abstract_ko);
  const tldr = clean(f.tldr);
  const keywords = clean(f.keywords);
  const lang = hasHangul(x.title) ? 'ko' : 'en';
  const heading = x.in_korean || hasHangul(x.title)
    ? `${esc(x.display_en)}${x.display_en !== x.title ? `<br><span style="font-size:.75em">${esc(x.title)}</span>` : ''}`
    : esc(x.title);
  const volStr = [vol && (num ? `${vol}(${num})` : vol), pages.replace('-', '–')].filter(Boolean).join(', ');
  const desc = (tldr || abstract || `${x.display_en}. ${x.journal_en}, ${x.year}.`).slice(0, 300);
  const bibLines = Object.entries(f).filter(([k]) => ['author', 'title', 'journal', 'year', 'volume', 'number', 'pages', 'doi'].includes(k))
    .map(([k, v]) => `&nbsp;&nbsp;${k}={${esc(clean(v))}}`).join(',<br>\n');
  const ld = {
    '@context': 'https://schema.org', '@type': 'ScholarlyArticle',
    headline: x.title, ...(x.display_en !== x.title ? { alternativeHeadline: x.display_en } : {}),
    author: authors.map(a => ({ '@type': 'Person', name: a })),
    datePublished: x.year,
    isPartOf: { '@type': 'Periodical', name: x.journal_en },
    ...(doi ? { identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: doi }, sameAs: doiUrl } : {}),
    inLanguage: lang, ...(abstract ? { abstract } : {}),
  };
  return `<!DOCTYPE html>
<!-- generated:paper — created by scripts/build-site.mjs from static/woo-publications.bib.
     To hand-edit this page, delete this comment line; the generator will then leave it alone. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(x.display_en)} — ${esc(apaAuthors(authors).split(',')[0])} (${x.year})</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/papers/${x.slug}.html">
<link rel="stylesheet" href="paper.css">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(x.display_en)} (${x.year})">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/papers/${x.slug}.html">
<meta name="citation_title" content="${esc(x.title)}">
${authors.map(a => `<meta name="citation_author" content="${esc(a)}">`).join('\n')}
<meta name="citation_publication_date" content="${x.year}">
<meta name="citation_journal_title" content="${esc(x.journal)}">
${vol ? `<meta name="citation_volume" content="${esc(vol)}">\n` : ''}${num ? `<meta name="citation_issue" content="${esc(num)}">\n` : ''}${fp ? `<meta name="citation_firstpage" content="${esc(fp)}">\n` : ''}${lp ? `<meta name="citation_lastpage" content="${esc(lp)}">\n` : ''}${doi ? `<meta name="citation_doi" content="${esc(doi)}">\n` : ''}<meta name="citation_language" content="${lang}">
${keywords ? `<meta name="citation_keywords" content="${esc(keywords)}">\n` : ''}${abstract ? `<meta name="citation_abstract" content="${esc(abstract)}">\n` : ''}
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:site_name" content="Chung-Won Woo">
<meta property="og:image" content="${SITE}/img/og-card.png">
<meta property="og:image:width" content="2400">
<meta property="og:image:height" content="1260">
<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "26c6dd0a24564a3e85cee6667dcc301f"}'></script><!-- End Cloudflare Web Analytics -->
</head>
<body>
<nav class="site"><a href="/">← Chung-Won Woo — Home</a> · <a href="index.html">All paper summaries</a></nav>

<h1>${heading}</h1>
<p class="meta">${esc(authors.join(', '))}<br>
<i>${esc(x.journal_en)}${x.journal_en !== x.journal ? ` (${esc(x.journal)})` : ''}</i>${volStr ? `, ${esc(volStr)}` : ''}, ${x.year}${doi ? ` · <a href="${doiUrl}">DOI: ${esc(doi)}</a>` : ''}</p>
${tldr ? `\n<div class="tldr">\n<b>TL;DR</b> — ${esc(tldr)}\n</div>\n` : ''}${abstract ? `\n<h2>Abstract</h2>\n<p>${esc(abstract)}</p>\n` : ''}${abstractKo ? `\n<h2>국문 요약</h2>\n<p class="kr">${esc(abstractKo)}</p>\n` : ''}
<h2>How to cite</h2>
<div class="cite">
APA: ${apaAuthors(authors)} (${x.year}). ${esc(x.title)}. <i>${esc(x.journal)}${vol ? `, ${esc(vol)}` : ''}</i>${num ? `(${esc(num)})` : ''}${pages ? `, ${esc(pages.replace('-', '–'))}` : ''}.${doi ? ` ${doiUrl}` : ''}
<br><br>
BibTeX:<br>
@article{${esc(x.key)},<br>
${bibLines}}
</div>

<h2>Links</h2>
<ul>
${doi ? `  <li><a href="${doiUrl}">Publisher (DOI)</a></li>\n` : ''}  <li><a href="https://scholar.google.com/citations?user=icd6fggAAAAJ">Author's Google Scholar</a></li>
</ul>

<footer>
<b>Chung-Won Woo (우청원)</b> — Associate Professor of Accounting, Changwon National University. Research: carbon regulation (CBAM), climate risk, ESG, cost behavior, R&amp;D efficiency, information-security disclosure.<br>
<a href="https://scholar.google.com/citations?user=icd6fggAAAAJ">Google Scholar</a> · <a href="https://orcid.org/0000-0002-2806-2639">ORCID</a> · woocw@changwon.ac.kr
</footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------- run
const videos = await loadVideos();
const newPages = [];

for (const x of papers) {
  const f = `static/papers/${x.slug}.html`;
  if (!exists(f) || read(f).includes('<!-- generated:paper')) {
    write(f, paperPage(x));
    newPages.push(x.slug);
  }
}

// remove generated pages whose paper was deleted from the BibTeX file
const liveSlugs = new Set(papers.map(x => x.slug));
for (const name of fs.readdirSync(p('static/papers'))) {
  if (!name.endsWith('.html') || name === 'index.html') continue;
  const slug = name.slice(0, -5);
  if (!liveSlugs.has(slug) && read('static/papers/' + name).includes('<!-- generated:paper')) {
    fs.unlinkSync(p('static/papers', name)); changed.push('static/papers/' + name + ' (removed)');
  }
}

for (const [file, lang] of [['layouts/index.html', 'en'], ['static/ko/index.html', 'ko']]) {
  let s = read(file);
  s = between(s, '<!-- GEN:PAPERS -->', '<!-- /GEN:PAPERS -->', homeList(lang), file);
  s = between(s, '<!-- GEN:VIDEOS -->', '<!-- /GEN:VIDEOS -->', videoSection(videos, lang), file);
  const navItem = videos.length ? `      <a class="item" href="#videos">${lang === 'en' ? 'Videos' : '영상'}</a>` : '';
  s = between(s, '<!-- GEN:VIDEONAV -->', '<!-- /GEN:VIDEONAV -->', navItem, file);
  write(file, applyMetrics(s, lang));
}

{
  let s = read('static/papers/index.html');
  s = between(s, '<!-- GEN:INDEX -->', '<!-- /GEN:INDEX -->', indexList(), 'static/papers/index.html');
  s = s.replace(/\(\d+ papers\)/, `(${N} papers)`).replace(/Summary pages for \d+ published papers/, `Summary pages for ${N} published papers`);
  write('static/papers/index.html', s);
}

{
  let s = read('static/llms.txt');
  s = between(s, '<!-- GEN:LLMS -->', '<!-- /GEN:LLMS -->', llmsList(), 'static/llms.txt');
  s = s.replace(/\d+ published papers,\n> [\d,]+\+ citations, h-index \d+/, `${N} published papers,\n> ${citesEn} citations, h-index ${H}`);
  write('static/llms.txt', s);
}

{
  const old = read('static/sitemap-papers.xml');
  const lastmod = Object.fromEntries([...old.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map(m => [m[1], m[2]]));
  const other = [...old.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0])
    .filter(u => !/\/papers\/[^<]+\.html</.test(u) && !/\/papers\/</.test(u));
  const rows = [`  <url><loc>${SITE}/papers/</loc><lastmod>${lastmod[`${SITE}/papers/`] || today}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>`];
  for (const g of GROUPS) for (const x of g.items) {
    const loc = `${SITE}/papers/${x.slug}.html`;
    rows.push(`  <url><loc>${loc}</loc><lastmod>${lastmod[loc] || today}</lastmod><changefreq>yearly</changefreq><priority>0.8</priority></url>`);
  }
  write('static/sitemap-papers.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n${other.map(u => '  ' + u.trim()).join('\n')}\n</urlset>\n`);
}

if (exists('content/authors/admin/_index.md')) {
  write('content/authors/admin/_index.md', read('content/authors/admin/_index.md')
    .replace(/With \d+\+? peer-reviewed publications \([\d,]+\+ citations, h-index \d+\)/, `With ${N} peer-reviewed publications (${citesEn} citations, h-index ${H})`));
}

write('static/woo-publications.bib', bibText.replace(/% \d+ published papers\./, `% ${N} published papers.`));

console.log(`papers: ${N} (${GROUPS.map(g => `${g.topic}:${g.items.length}`).join(', ')}), journals: ${journals}`);
console.log(`metrics: citations ${metrics.citations} -> "${citesEn}", h-index ${H}`);
console.log(`videos shown: ${videos.length}${videos.length ? ' — ' + videos.map(v => v.title).join(' | ') : ' (lecture recordings excluded)'}`);
console.log(`generated paper pages: ${newPages.length ? newPages.join(', ') : 'none'}`);
console.log(`files changed: ${changed.length ? changed.join(', ') : 'none'}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed.join(' ')}\n`);
