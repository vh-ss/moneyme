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

// ——— calcEval (калькулятор у полях сум) ———
eq('calc 2+2', S.calcEval('2+2'), 4);
eq('calc пріоритет 100-30*2', S.calcEval('100-30*2'), 40);
eq('calc дужки (10+5)*2', S.calcEval('(10+5)*2'), 30);
eq('calc унарний -5+3', S.calcEval('-5+3'), -2);
eq('calc ділення 10/4', S.calcEval('10/4'), 2.5);
eq('calc кома 100,50+0,5', S.calcEval('100,50+0,5'), 101);
eq('calc символи 12×3', S.calcEval('12×3'), 36);
eq('calc невалідний 1+', S.calcEval('1+'), null);
eq('calc літери', S.calcEval('abc'), null);
eq('calc порожній', S.calcEval(''), null);
eq('calc ділення на нуль', S.calcEval('5/0'), null);

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
// повернення (reimbursement) — витрата з відʼємною сумою, нетиться у тій самій категорії
eq('txCatAmount повернення відʼємне', S.txCatAmount({ category_id: 7, amount: -9000, reimbursement: true }, 7), -9000);
eq('категорія = повна витрата − повернення (10000 − 9000 = 1000)',
   S.txCatAmount({ category_id: 7, amount: 10000 }, 7) + S.txCatAmount({ category_id: 7, amount: -9000, reimbursement: true }, 7), 1000);
eq('isSplitTx true', S.isSplitTx({ splits: [{}, {}] }), true);
eq('isSplitTx false (одна)', S.isSplitTx({ splits: [{}] }), false);

// ——— Дати ———
ok('monthRangeOf лютий 2026', S.monthRangeOf('2026-02').from === '2026-02-01' && S.monthRangeOf('2026-02').to === '2026-02-28');
eq('addMonthsYM 2026-12 +1', S.addMonthsYM('2026-12', 1), '2027-01');
eq('addMonthsYM 2026-03 -4', S.addMonthsYM('2026-03', -4), '2025-11');

// ——— Злиття N пристроїв: per-record LWW + надгробки (mergeAll) ———
const mkDev = (upd, txs, tomb) => ({ updatedAt: upd, accounts: [], categories: [], transactions: txs || [], banks: [], loans: [], recurring: [], goals: [], crypto: [], cryptoHistory: [], tombstones: { transactions: tomb || {} }, seq: { tx: 1 } });
const T = (id, note, upd) => ({ id, note, account_id: 1, updatedAt: upd });
{
  const A = mkDev('t2', [T(10, 'x', 't1'), T(20, 'a', 't2')]);
  const B = mkDev('t1', [T(10, 'x', 't1'), T(30, 'b', 't1')]);
  const m = S.mergeAll([A, B]);
  ok('mergeAll: union усіх записів', JSON.stringify(m.transactions.map(t => t.id).sort((a, b) => a - b)) === JSON.stringify([10, 20, 30]));
}
{
  const A = mkDev('t3', [], { 100: 't2' });          // A видалив 100 у t2
  const B = mkDev('t1', [T(100, 'old', 't1')]);      // B має 100 з t1 (старіше за надгробок)
  const m = S.mergeAll([A, B]);
  ok('mergeAll: надгробок (новіший) видаляє запис', m.transactions.length === 0 && m.tombstones.transactions[100] === 't2');
}
{
  const A = mkDev('t1', [], { 100: 't1' });           // delete у t1
  const B = mkDev('t3', [T(100, 'edited', 't2')]);    // edit у t2 > t1
  const m = S.mergeAll([A, B]);
  ok('mergeAll: редагування (новіше) перемагає надгробок', m.transactions.length === 1 && m.transactions[0].note === 'edited');
}
{
  const A = mkDev('t3', [T(100, 'L', 't3')]);
  const B = mkDev('t2', [T(100, 'R', 't2')]);
  eq('mergeAll: конкурентне редагування → новіший запис', S.mergeAll([A, B]).transactions[0].note, 'L');
}
{
  // 3 пристрої + воскресіння + перевірка КОМУТАТИВНОСТІ (порядок не впливає на результат)
  const A = mkDev('t2', [T(10, 'a', 't2')], { 30: 't2' });
  const B = mkDev('t3', [T(20, 'b', 't3'), T(30, 'res', 't3')]);   // 30 воскресло у t3 > надгробок t2
  const C = mkDev('t1', [T(10, 'old', 't1')]);
  const m1 = S.mergeAll([A, B, C]), m2 = S.mergeAll([C, B, A]);
  ok('mergeAll: комутативність merge(A,B,C)==merge(C,B,A)', S.syncSig(m1) === S.syncSig(m2));
  ok('mergeAll: воскресіння 30 (edit t3 > надгробок t2)', !!m1.transactions.find(t => t.id === 30) && m1.transactions.find(t => t.id === 30).note === 'res');
  eq('mergeAll: 10 = новіша версія (a)', m1.transactions.find(t => t.id === 10).note, 'a');
}
{
  const A = mkDev('t1', []); A.seq.tx = 5; A.cryptoHistory = [{ date: '2026-06-01', v: 1 }];
  const B = mkDev('t1', []); B.seq.tx = 9; B.cryptoHistory = [{ date: '2026-06-02', v: 2 }];
  const m = S.mergeAll([A, B]);
  eq('mergeAll: seq = максимум', m.seq.tx, 9);
  eq('mergeAll: cryptoHistory union за датою', m.cryptoHistory.length, 2);
}

// ——— Мультирахунковий split (кафе картою, чайові готівкою) ———
eq('txAccountShare: не-split весь на свій рахунок', S.txAccountShare({ kind: 'EXPENSE', amount: 100, account_id: 1 }, 1), 100);
eq('txAccountShare: не-split 0 для іншого', S.txAccountShare({ kind: 'EXPENSE', amount: 100, account_id: 1 }, 2), 0);
{
  const tx = { kind: 'EXPENSE', amount: 300, account_id: 2, splits: [{ category_id: 1, amount: 200 }, { category_id: 2, amount: 100, account_id: 1 }] };
  eq('txAccountShare: split основний рахунок (картка 200)', S.txAccountShare(tx, 2), 200);
  eq('txAccountShare: split інший рахунок (готівка 100)', S.txAccountShare(tx, 1), 100);
}

// ——— Симуляція 5 пристроїв через повторне застосування mergeAll (порядок випадковий) ———
// Кожен пристрій тримає свій стан; «синх» = mergeAll(усі стани). Має збігтись незалежно від порядку.
{
  const cl = o => JSON.parse(JSON.stringify(o));
  const mk = (upd, txs, tomb) => ({ updatedAt: upd, accounts: [], categories: [], transactions: txs || [], banks: [], loans: [], recurring: [], goals: [], crypto: [], cryptoHistory: [], tombstones: { transactions: tomb || {} }, seq: { tx: 1 } });
  const tx = (id, n, u) => ({ id, note: n, account_id: 1, updatedAt: u });
  const devs = [
    mk('t5', [tx(1, 'a', 't1'), tx(2, 'b', 't2')]),
    mk('t5', [tx(1, 'a', 't1'), tx(3, 'c', 't3')]),
    mk('t5', [tx(2, 'b2', 't5')]),               // редагує 2 пізніше
    mk('t5', [], { 1: 't4' }),                    // видаляє 1 у t4
    mk('t5', [tx(4, 'd', 't2')]),
  ];
  const merged = S.mergeAll(devs);
  const merged2 = S.mergeAll(cl(devs).reverse());
  ok('sim5: результат однаковий за будь-якого порядку', S.syncSig(merged) === S.syncSig(merged2));
  const ids = merged.transactions.map(t => t.id).sort((a, b) => a - b);
  ok('sim5: 1 видалено (надгробок t4 > edit t1)', !ids.includes(1));
  ok('sim5: 2 = новіша версія b2', merged.transactions.find(t => t.id === 2).note === 'b2');
  ok('sim5: усі додавання зведено (2,3,4)', JSON.stringify(ids) === JSON.stringify([2, 3, 4]));
  // після повторного злиття нічого не змінюється (ідемпотентність)
  ok('sim5: ідемпотентність повторного злиття', S.syncSig(S.mergeAll([merged, devs[0]])) === S.syncSig(merged));
}

// ——— Крипто-обмін за крипту: cost-basis (cryptoTradeDeltas) ———
{
  const usdt = { id: 2, symbol: 'USDT', amount: 1000, cost: 1000, price: 1, cg: null };
  const btc = { id: 1, symbol: 'BTC', amount: 0, cost: 0, price: 60000, cg: null };
  const d = S.cryptoTradeDeltas(btc, usdt, 'BUY', 0.01, 600);   // купити 0.01 BTC за 600 USDT
  eq('crypto BUY: USD-вартість угоди = 600', d.usd, 600);
  eq('crypto BUY: базі (BTC) додається cost 600', d.baseCostDelta, 600);
  eq('crypto BUY: з котирування (USDT) забирається пропорційний cost 600', d.quoteCostDelta, 600);
}
{
  const btc = { id: 1, symbol: 'BTC', amount: 0.02, cost: 1000, price: 60000, cg: null };
  const usdt = { id: 2, symbol: 'USDT', amount: 0, cost: 0, price: 1, cg: null };
  const d = S.cryptoTradeDeltas(btc, usdt, 'SELL', 0.01, 700);  // продати половину BTC за 700 USDT
  eq('crypto SELL: USD-вартість угоди = 700', d.usd, 700);
  eq('crypto SELL: з BTC забирається пропорційний cost (половина) = 500', d.baseCostDelta, 500);
  eq('crypto SELL: котируванню (USDT) додається cost 700', d.quoteCostDelta, 700);
}
// ——— Коригування позиції по біржах (adjustHoldingOnExchange) ———
{
  const h = { id: 1, symbol: 'USDT', amount: 342, exchanges: [{ name: 'WhiteBit', amount: 270 }, { name: 'Wallet', amount: 71 }, { name: 'Binance', amount: 1 }] };
  S.adjustHoldingOnExchange(h, 'WhiteBit', -100);
  eq('exchange: WhiteBit зменшено на 100', h.exchanges.find(x => x.name === 'WhiteBit').amount, 170);
  eq('exchange: загальна = сума бірж (170+71+1)', h.amount, 242);
}
{
  const g = { id: 2, symbol: 'GRAM', amount: 0, exchanges: [] };   // нова позиція засівається біржею
  S.adjustHoldingOnExchange(g, 'WhiteBit', 50);
  eq('exchange: нова позиція на біржі', g.amount, 50);
  ok('exchange: створено запис біржі WhiteBit=50', g.exchanges.length === 1 && g.exchanges[0].name === 'WhiteBit' && g.exchanges[0].amount === 50);
}
{
  const f = { id: 3, symbol: 'BTC', amount: 0.02 };   // пласка позиція без бірж
  S.adjustHoldingOnExchange(f, null, 0.01);
  eq('exchange: пласка позиція (без біржі) → загальна', f.amount, 0.03);
}

// ——— Вкладення: id-посилання та план синхронізації (referencedAttIds / attachmentPlan) ———
{
  const s = { transactions: [
    { id: 1, attachments: ['att_a', 'att_b'] },
    { id: 2, attachments: ['att_b'] },                 // дубль id між операціями
    { id: 3, attachments: ['data:image/jpeg;base64,xxx'] },  // legacy dataURL — НЕ id
    { id: 4 },                                         // без вкладень
  ] };
  const refd = [...S.referencedAttIds(s)].sort();
  ok('referencedAttIds: лише att_-id, унікальні', JSON.stringify(refd) === JSON.stringify(['att_a', 'att_b']));
}
{
  const DAY = 24 * 3600 * 1000, now = 1000 * DAY, grace = 14 * DAY;
  const refd = new Set(['att_x', 'att_y', 'att_z']);
  const local = ['att_x', 'att_y'];                    // att_z ще не докачано локально
  const drive = [
    { id: 'att_x', fileId: 'fx', modifiedAt: now - DAY },        // вже в Drive
    { id: 'att_old', fileId: 'fo', modifiedAt: now - 30 * DAY }, // сирота, старий → видалити
    { id: 'att_new', fileId: 'fn', modifiedAt: now - DAY },      // сирота, свіжий → лишити (grace)
  ];
  const plan = S.attachmentPlan(refd, local, drive, now, grace);
  ok('attachmentPlan: вивантажити локальне+не-в-Drive (att_y)', JSON.stringify(plan.toUpload) === JSON.stringify(['att_y']));
  ok('attachmentPlan: att_z не вивантажуємо (нема локально)', !plan.toUpload.includes('att_z'));
  ok('attachmentPlan: видалити лише старого сироту (att_old)', JSON.stringify(plan.toDeleteDrive) === JSON.stringify(['att_old']));
  ok('attachmentPlan: свіжого сироту не чіпаємо (grace)', !plan.toDeleteDrive.includes('att_new'));
}

// ——— Підсумок ———
console.log(`\n${failed === 0 ? '✓' : '✗'} Тести: ${passed} пройдено, ${failed} впало.`);
process.exit(failed === 0 ? 0 : 1);
