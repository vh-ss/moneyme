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

// ——— computeFee (також непрямо перевіряє round2) ———
eq('fee PERCENT 2% від 100', S.computeFee(100, 'PERCENT', 2), 2);
eq('fee FIXED 5', S.computeFee(100, 'FIXED', 5), 5);
eq('fee NONE', S.computeFee(100, 'NONE', 9), 0);

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

// ——— Підсумок ———
console.log(`\n${failed === 0 ? '✓' : '✗'} Тести: ${passed} пройдено, ${failed} впало.`);
process.exit(failed === 0 ? 0 : 1);
