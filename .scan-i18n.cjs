// Статичний аудит i18n: токенізує JS, бере ТІЛЬКИ вміст рядкових літералів (рядки + статичні
// частини шаблонів, з коректним урахуванням вкладених ${...}), пропускає коментарі.
// Для кожного фрагмента симулює переклад (tStr) і виводить ті, де лишається кирилиця.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/MoneyMe.html', 'utf8');
const sIdx = html.indexOf('<script>'), eIdx = html.lastIndexOf('</script>');
let code = html.slice(sIdx + 8, eIdx);
const cyr = /[А-Яа-яІіЇїЄєҐґ]/;
const APO = /[ʼ’‘′]/g;

function extract(marker, open, close) {
  const i = code.indexOf(marker); if (i < 0) throw new Error('no ' + marker);
  let j = code.indexOf(open, i), depth = 0, k = j;
  for (; k < code.length; k++) { if (code[k] === open) depth++; else if (code[k] === close) { depth--; if (depth === 0) break; } }
  return { text: code.slice(i, k + 1), a: i, b: k + 1 };
}
const enDef = extract('const I18N_EN =', '{', '}');
const parDef = extract('const I18N_PARTIAL =', '[', ']');
const I18N_EN = eval('(' + enDef.text.replace('const I18N_EN =', '') + ')');
const I18N_PARTIAL = eval('(' + parDef.text.replace('const I18N_PARTIAL =', '') + ')');
const I18N_EN_N = {}; for (const k in I18N_EN) I18N_EN_N[k.replace(APO, "'")] = I18N_EN[k];
const I18N_PARTIAL_N = I18N_PARTIAL.map(([u, e]) => [u.replace(APO, "'"), e]).sort((a, b) => b[0].length - a[0].length);

// маскуємо таблиці (зберігаючи переноси рядків — щоб не зсувались номери)
function blank(a, b) { let s = code.slice(a, b).replace(/[^\n]/g, ' '); code = code.slice(0, a) + s + code.slice(b); }
blank(enDef.a, enDef.b); blank(parDef.a, parDef.b);

// Токенайзер: повертає вміст рядкових літералів (з номером рядка)
const RE_CTX = "(,=[{;:!&|?+-*/^~<>";   // після цих символів `/` — це regex-літерал, а не ділення
function chunks(src) {
  const res = []; let i = 0; const n = src.length; let line = 1; let prev = '';
  const stack = [{ t: 'code', depth: 0 }];
  let buf = null, bufLine = 0;
  const top = () => stack[stack.length - 1];
  const flush = () => { if (buf != null) { res.push({ text: buf, line: bufLine }); buf = null; } };
  while (i < n) {
    const c = src[i], c2 = src[i + 1], m = top();
    if (m.t === 'code') {
      if (c === '\n') { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === '/' && c2 === '/') { i += 2; while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && c2 === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
      if (c === '/' && (prev === '' || RE_CTX.indexOf(prev) >= 0)) {   // regex-літерал — пропускаємо повністю
        i++; let inClass = false;
        while (i < n) { const d = src[i]; if (d === '\\') { i += 2; continue; } if (d === '\n') { line++; i++; continue; } if (d === '[') inClass = true; else if (d === ']') inClass = false; else if (d === '/' && !inClass) { i++; break; } i++; }
        while (i < n && /[a-z]/i.test(src[i])) i++; prev = '/'; continue;
      }
      if (c === '\'') { stack.push({ t: 'sq' }); buf = ''; bufLine = line; i++; continue; }
      if (c === '"') { stack.push({ t: 'dq' }); buf = ''; bufLine = line; i++; continue; }
      if (c === '`') { stack.push({ t: 'tpl' }); buf = ''; bufLine = line; i++; continue; }
      if (c === '{') { m.depth++; prev = c; i++; continue; }
      if (c === '}') { if (m.depth === 0 && stack.length > 1) { stack.pop(); if (top().t === 'tpl') { buf = ''; bufLine = line; } } else if (m.depth > 0) m.depth--; prev = c; i++; continue; }
      prev = c; i++; continue;
    }
    if (m.t === 'sq' || m.t === 'dq') {
      if (c === '\\') { buf += (src[i] || '') + (src[i + 1] || ''); i += 2; continue; }
      if (c === '\n') line++;
      if (c === (m.t === 'sq' ? '\'' : '"')) { flush(); stack.pop(); i++; continue; }
      buf += c; i++; continue;
    }
    if (m.t === 'tpl') {
      if (c === '\\') { buf += (src[i] || '') + (src[i + 1] || ''); i += 2; continue; }
      if (c === '\n') line++;
      if (c === '`') { flush(); stack.pop(); i++; continue; }
      if (c === '$' && c2 === '{') { flush(); stack.push({ t: 'code', depth: 0 }); i += 2; continue; }
      buf += c; i++; continue;
    }
  }
  return res;
}

// raw = без обрізання (бо в DOM текстовий вузол склеюється зі значеннями ${} — підрядкові
// переклади з пробілами на межах працюють). Точний збіг — по обрізаному.
function translated(raw) {
  if (!cyr.test(raw)) return raw;
  const t = raw.trim(), normT = t.replace(APO, "'");
  if (I18N_EN_N[normT] !== undefined) return I18N_EN_N[normT];
  let v = raw.replace(APO, "'"); for (const [u, en] of I18N_PARTIAL_N) if (v.indexOf(u) >= 0) v = v.split(u).join(en);
  return v;
}

// у межах уже витягнутого літерала лапки ' ` — звичайні символи (апострофи в словах: прив'язку),
// тож ріжемо лише на межах HTML-тегів/інтерполяції та подвійних лапок (атрибути)
const seg_re = /[^"$<>{}\n]*[А-Яа-яІіЇїЄєҐґ][^"$<>{}\n]*/g;
const uncovered = new Map();
for (const { text, line } of chunks(code)) {
  let m;
  while ((m = seg_re.exec(text))) {
    const raw = m[0], seg = raw.trim();
    if (!seg || !cyr.test(seg)) continue;
    if (cyr.test(translated(raw))) { if (!uncovered.has(seg)) uncovered.set(seg, line); }
  }
}
const list = [...uncovered.entries()].sort((a, b) => a[1] - b[1]);
console.log('НЕПОКРИТО (' + list.length + '):');
for (const [seg, line] of list) console.log(String(line).padStart(5) + ' | ' + seg);
