// Юніт-тести чистих функцій MoneyMe.
// Запуск: node tests.cjs
// Підхід: вирізаємо <script> із MoneyMe.html, відкидаємо секцію «Старт» (бутстреп із DOM-
// побічними ефектами), еволюємо решту у vm-пісочниці з мінімальними стабами та перевіряємо
// чисті доменні функції напряму з коду застосунку (без дублювання).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, 'MoneyMe.html'), 'utf8');
const scripts = src.match(/<script>([\s\S]*?)<\/script>/g).map(s => s.replace(/<\/?script>/g, ''));
let code = scripts.join('\n;\n');
// Відкидаємо бутстреп (виклики navigate/render/SW/таймери) — лишаємо лише визначення.
code = code.split('//==================== Старт ====================')[0];

// ——— Мінімальні стаби середовища браузера ———
const store = {};
const localStorageStub = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const noopEl = () => ({ setAttribute(){}, appendChild(){}, addEventListener(){}, classList:{add(){},remove(){},toggle(){}}, style:{}, querySelector(){return null;}, querySelectorAll(){return [];}, get firstElementChild(){return noopEl();}, content:{ get firstElementChild(){return noopEl();} }, set innerHTML(v){}, get innerHTML(){return '';} });
const documentStub = { documentElement:{ setAttribute(){}, getAttribute(){return null;} }, querySelector(){return null;}, querySelectorAll(){return [];}, getElementById(){return null;}, createElement(){return noopEl();}, addEventListener(){}, body:noopEl() };
const sandbox = {
  localStorage: localStorageStub,
  document: documentStub,
  navigator: { onLine: true, serviceWorker: { register(){return Promise.resolve();}, getRegistrations(){return Promise.resolve([]);} } },
  location: { hash: '', search: '', protocol: 'http:', pathname: '/' },
  history: { replaceState(){} },
  fetch: () => Promise.reject(new Error('no network in tests')),
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0,
  addEventListener: () => {}, removeEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener(){}, addListener(){} }),
  console, Math, Date, JSON, Intl, URLSearchParams,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
try { vm.runInContext(code, sandbox, { filename: 'MoneyMe.script.js' }); }
catch (e) { console.error('Не вдалося завантажити код застосунку у пісочницю:\n', e); process.exit(1); }

// ——— Мікро-фреймворк ———
let passed = 0, failed = 0;
const approx = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
function ok(name, cond) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + name); } }
function eq(name, a, b) { ok(name + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')', a === b); }
function near(name, a, b) { ok(name + ' (' + a + ' ≈ ' + b + ')', approx(a, b)); }
const S = sandbox;

// ——— feeSourceAmount (комісія у валюті джерела; також непрямо перевіряє round2) ———
eq('fee PERCENT 2% від 100', S.feeSourceAmount('PERCENT', 2, null, 'UAH', 100, 1), 2);
eq('fee FIXED 5 (та сама валюта)', S.feeSourceAmount('FIXED', 5, null, 'UAH', 100, 1), 5);
eq('fee NONE', S.feeSourceAmount('NONE', 9, null, 'UAH', 100, 1), 0);
eq('fee FIXED у валюті призначення (10 USD / курс 40)', S.feeSourceAmount('FIXED', 10, 'USD', 'UAH', 100, 40), 0.25);

// ——— Кредити ———
eq('loanMonthlyRate 24%/рік', S.loanMonthlyRate({ has_interest: true, rate: 24 }), 0.02);
eq('loanMonthlyRate без відсотків', S.loanMonthlyRate({ has_interest: false, rate: 24 }), 0);
eq('loanMonthly без %: 1200/12', S.loanMonthly({ principal: 1200, months: 12, has_interest: false }), 100);
near('loanMonthly ануїтет 12000@24%/12міс', S.loanMonthly({ principal: 12000, months: 12, has_interest: true, rate: 24 }), 1134.72);
eq('loanOutstanding 1000-300', S.loanOutstanding({ principal: 1000, paid: 300 }), 700);
eq('loanActive true', S.loanActive({ principal: 1000, paid: 300 }), true);
eq('loanActive false (виплачено)', S.loanActive({ principal: 1000, paid: 1000 }), false);
eq('loanMonthsLeft 12000@24% повна', S.loanMonthsLeft({ principal: 12000, paid: 0, months: 12, has_interest: true, rate: 24 }), 12);
eq('loanMonthsLeft без % 700/100', S.loanMonthsLeft({ principal: 1000, paid: 300, months: 10, has_interest: false }), 7);
eq('loanMonthsLeft платіж не покриває %', S.loanMonthsLeft({ principal: 100000, paid: 0, months: 1000, has_interest: true, rate: 100 }), Infinity);

// ——— Регулярні ———
eq('recurMonthlyAmt monthly', S.recurMonthlyAmt({ amount: 30, freq: 'monthly' }), 30);
near('recurMonthlyAmt weekly (×52/12)', S.recurMonthlyAmt({ amount: 7, freq: 'weekly' }), 30.33);

// ——— Split-операції ———
ok('txParts без split', JSON.stringify(S.txParts({ category_id: 5, amount: 100 })) === JSON.stringify([{ category_id: 5, amount: 100 }]));
ok('txParts зі split', JSON.stringify(S.txParts({ category_id: 1, amount: 300, splits: [{ category_id: 1, amount: 200 }, { category_id: 2, amount: 100 }] })).includes('200'));
eq('txCatAmount split cat1', S.txCatAmount({ amount: 300, splits: [{ category_id: 1, amount: 200 }, { category_id: 2, amount: 100 }] }, 1), 200);
eq('txCatAmount split cat2', S.txCatAmount({ amount: 300, splits: [{ category_id: 1, amount: 200 }, { category_id: 2, amount: 100 }] }, 2), 100);
eq('txCatAmount одна категорія', S.txCatAmount({ category_id: 7, amount: 50 }, 7), 50);
eq('isSplitTx true', S.isSplitTx({ splits: [{}, {}] }), true);
eq('isSplitTx false (одна)', S.isSplitTx({ splits: [{}] }), false);

// ——— Дати ———
ok('monthRangeOf лютий 2026', S.monthRangeOf('2026-02').from === '2026-02-01' && S.monthRangeOf('2026-02').to === '2026-02-28');
eq('addMonthsYM 2026-12 +1', S.addMonthsYM('2026-12', 1), '2027-01');
eq('addMonthsYM 2026-03 -4', S.addMonthsYM('2026-03', -4), '2025-11');

// ——— 3-стороннє злиття (merge) ———
const mkBase = () => ({ updatedAt: '2026-06-20T10:00:00Z', accounts: [{ id: 1, name: 'A' }], categories: [], transactions: [{ id: 10, note: 'base', account_id: 1 }], banks: [], loans: [], recurring: [], goals: [], crypto: [], cryptoHistory: [], seq: { acc: 2, cat: 1, tx: 11, bank: 1, loan: 1, rec: 1, goal: 1, cry: 1 } });
const clone = o => JSON.parse(JSON.stringify(o));
{
  const base = mkBase();
  const lAdd = clone(base); lAdd.updatedAt = '2026-06-20T12:00:00Z'; lAdd.transactions.push({ id: 20, note: 'local', account_id: 1 });
  const rAdd = clone(base); rAdd.updatedAt = '2026-06-20T11:00:00Z'; rAdd.transactions.push({ id: 30, note: 'remote', account_id: 1 });
  const m = S.mergeStates(base, lAdd, rAdd);
  ok('merge: додавання з обох сторін збережено', JSON.stringify(m.transactions.map(t => t.id).sort((a,b)=>a-b)) === JSON.stringify([10, 20, 30]));
}
{
  const base = mkBase();
  const lDel = clone(base); lDel.updatedAt = '2026-06-20T12:00:00Z'; lDel.transactions = [];
  const rSame = clone(base);
  ok('merge: видалення поважається (хмара без змін)', S.mergeStates(base, lDel, rSame).transactions.length === 0);
}
{
  const base = mkBase();
  const lDel = clone(base); lDel.updatedAt = '2026-06-20T12:00:00Z'; lDel.transactions = [];
  const rEdit = clone(base); rEdit.updatedAt = '2026-06-20T11:30:00Z'; rEdit.transactions[0].note = 'edited';
  const m = S.mergeStates(base, lDel, rEdit);
  ok('merge: редагування на хмарі перемагає видалення', m.transactions.length === 1 && m.transactions[0].note === 'edited');
}
{
  const base = mkBase();
  const lE = clone(base); lE.updatedAt = '2026-06-20T13:00:00Z'; lE.transactions[0].note = 'L';
  const rE = clone(base); rE.updatedAt = '2026-06-20T11:00:00Z'; rE.transactions[0].note = 'R';
  const m = S.mergeStates(base, lE, rE);
  ok('merge: конкурентне редагування → новіша сторона (local)', m.transactions[0].note === 'L');
  eq('merge: seq = максимум', m.seq.tx, 11);
}

// ——— Мультирахунковий split (кафе картою, чайові готівкою) ———
eq('txAccountShare: не-split весь на свій рахунок', S.txAccountShare({ kind: 'EXPENSE', amount: 100, account_id: 1 }, 1), 100);
eq('txAccountShare: не-split 0 для іншого', S.txAccountShare({ kind: 'EXPENSE', amount: 100, account_id: 1 }, 2), 0);
{
  const tx = { kind: 'EXPENSE', amount: 300, account_id: 2, splits: [{ category_id: 1, amount: 200 }, { category_id: 2, amount: 100, account_id: 1 }] };
  eq('txAccountShare: split основний рахунок (картка 200)', S.txAccountShare(tx, 2), 200);
  eq('txAccountShare: split інший рахунок (готівка 100)', S.txAccountShare(tx, 1), 100);
}

// ——— Симуляція синхронізації 2 пристроїв (тригер як у виправленому cloudSync) ———
// Регресія: пристрій із новішою локальною міткою НЕ має перезаписувати хмару без злиття.
function simTwoDevice(scenario){
  let clock = 0; const stamp = () => '2026-06-21T00:00:' + String(clock++).padStart(2, '0') + '.000Z';
  const cl = o => JSON.parse(JSON.stringify(o));
  const base = { updatedAt: stamp(), accounts: [{ id: 1, name: 'A' }], categories: [], transactions: [{ id: 100, note: 'base', account_id: 1 }], banks: [], loans: [], recurring: [], goals: [], crypto: [], cryptoHistory: [], seq: { tx: 101 } };
  let cloud = { data: cl(base), updatedAt: base.updatedAt };
  const A = { state: cl(base), base: cl(base), syncedUpd: base.updatedAt };
  const B = { state: cl(base), base: cl(base), syncedUpd: base.updatedAt };
  function sync(dev){
    const remote = cl(cloud);
    const cloudChanged = remote.updatedAt !== dev.syncedUpd;
    const localChanged = dev.state.updatedAt !== dev.base.updatedAt;
    if (cloudChanged && localChanged) { const m = S.mergeStates(dev.base, dev.state, remote.data); m.updatedAt = stamp(); dev.state = m; cloud = { data: cl(m), updatedAt: m.updatedAt }; dev.base = cl(m); dev.syncedUpd = m.updatedAt; }
    else if (cloudChanged) { dev.state = cl(remote.data); dev.base = cl(remote.data); dev.syncedUpd = remote.updatedAt; }
    else if (localChanged) { cloud = { data: cl(dev.state), updatedAt: dev.state.updatedAt }; dev.base = cl(dev.state); dev.syncedUpd = dev.state.updatedAt; }
    else { dev.syncedUpd = remote.updatedAt; }
  }
  scenario(A, B, stamp);
  sync(A); sync(B); sync(A);   // A залив → B змержив → A підхопив обʼєднане
  return { A: A.state.transactions, cloud: cloud.data.transactions };
}
{
  // Сценарій 1: A: +200 та видаляє 100; B: +300 та редагує 100 (B має новішу мітку).
  const r = simTwoDevice((A, B, stamp) => {
    A.state.transactions.push({ id: 200, note: 'A', account_id: 1 }); A.state.transactions = A.state.transactions.filter(t => t.id !== 100); A.state.updatedAt = stamp();
    B.state.transactions.push({ id: 300, note: 'B', account_id: 1 }); B.state.transactions[0].note = 'B-edit'; B.state.updatedAt = stamp();
  });
  const ids = r.A.map(t => t.id).sort((a, b) => a - b);
  ok('sync2: A-додавання (200) не втрачено', ids.includes(200));
  ok('sync2: B-додавання (300) збережено', ids.includes(300));
  ok('sync2: редагування перемогло видалення (100 лишилась)', ids.includes(100) && r.A.find(t => t.id === 100).note === 'B-edit');
  ok('sync2: пристрій A і хмара зійшлись', JSON.stringify(ids) === JSON.stringify(r.cloud.map(t => t.id).sort((a, b) => a - b)));
}
{
  // Сценарій 2: A видаляє 100 (B не чіпає) + дод. 200; B дод. 300 → 100 має зникнути.
  const r = simTwoDevice((A, B, stamp) => {
    A.state.transactions = A.state.transactions.filter(t => t.id !== 100); A.state.transactions.push({ id: 200, note: 'A', account_id: 1 }); A.state.updatedAt = stamp();
    B.state.transactions.push({ id: 300, note: 'B', account_id: 1 }); B.state.updatedAt = stamp();
  });
  const ids = r.A.map(t => t.id).sort((a, b) => a - b);
  ok('sync2: чисте видалення поважено (100 зникла)', !ids.includes(100) && ids.includes(200) && ids.includes(300));
}

// ——— Підсумок ———
console.log(`\n${failed === 0 ? '✓' : '✗'} Тести: ${passed} пройдено, ${failed} впало.`);
process.exit(failed === 0 ? 0 : 1);
