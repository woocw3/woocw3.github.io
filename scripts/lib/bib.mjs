// Minimal BibTeX parser (no dependencies). Handles nested braces and quoted values.
export function parseBib(text) {
  const entries = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const at = text.indexOf('@', i);
    if (at < 0) break;
    // skip '@' inside comment lines
    const lineStart = text.lastIndexOf('\n', at) + 1;
    if (text.slice(lineStart, at).trim().startsWith('%')) { i = at + 1; continue; }
    const brace = text.indexOf('{', at);
    if (brace < 0) break;
    const type = text.slice(at + 1, brace).trim().toLowerCase();
    if (type === 'comment' || type === 'preamble' || type === 'string') { i = skipBalanced(text, brace) ; continue; }
    const comma = text.indexOf(',', brace);
    const key = text.slice(brace + 1, comma).trim();
    let j = comma + 1;
    const fields = {};
    const order = [];
    while (j < n) {
      while (j < n && /[\s,]/.test(text[j])) j++;
      if (text[j] === '}') { j++; break; }
      const eq = text.indexOf('=', j);
      const name = text.slice(j, eq).trim().toLowerCase();
      j = eq + 1;
      while (/\s/.test(text[j])) j++;
      let value;
      if (text[j] === '{') {
        const end = skipBalanced(text, j);
        value = text.slice(j + 1, end - 1);
        j = end;
      } else if (text[j] === '"') {
        let k = j + 1;
        while (k < n && !(text[k] === '"' && text[k - 1] !== '\\')) k++;
        value = text.slice(j + 1, k);
        j = k + 1;
      } else {
        let k = j;
        while (k < n && !/[,}\n]/.test(text[k])) k++;
        value = text.slice(j, k).trim();
        j = k;
      }
      fields[name] = value.replace(/\s+/g, ' ').trim();
      order.push(name);
    }
    entries.push({ type, key, fields, order });
    i = j;
  }
  return entries;
}

function skipBalanced(text, start) {
  let depth = 0;
  for (let k = start; k < text.length; k++) {
    if (text[k] === '{') depth++;
    else if (text[k] === '}') { depth--; if (depth === 0) return k + 1; }
  }
  return text.length;
}

// Strip BibTeX braces used for case protection: {CBAM} -> CBAM
export function clean(v) {
  return (v || '').replace(/[{}]/g, '').replace(/\\&/g, '&').replace(/--/g, '–').trim();
}

export function authorsList(v) {
  return clean(v).split(/\s+and\s+/).map(a => a.trim()).filter(Boolean);
}

export function serializeEntry(e) {
  const width = Math.max(...e.order.map(k => k.length), 8);
  const lines = e.order.map(k => `  ${k.padEnd(width)} = {${e.fields[k]}}`);
  return `@${e.type}{${e.key},\n${lines.join(',\n')}\n}`;
}
