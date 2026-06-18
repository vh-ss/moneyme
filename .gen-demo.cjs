// Генератор демо-даних MoneyMe: операції з 1 січня по 18 червня 2026.
// Формат сумісний із бекапом застосунку: { app, version, exported_at, data }.
const fs = require('fs');

const TODAY = '2026-06-18';
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

// — детермінований ГПВЧ (щоб результат був відтворюваний) —
let _s = 20260618;
const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));      // ціле [a,b]
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const chance = p => rnd() < p;
const amt = (a, b) => round2(a + rnd() * (b - a));

const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

// ——— Рахунки ———
const accounts = [
  { id:1, name:'Готівка',         type:'CASH', currency_code:'UAH', initial_balance:4000, bank_id:null, icon:'💵', color:'#22c55e', sort_order:0 },
  { id:2, name:'Monobank',        type:'CARD', currency_code:'UAH', initial_balance:8000, bank_id:1,   icon:'⬛', color:'#111827', sort_order:1 },
  { id:3, name:'ПриватБанк',      type:'CARD', currency_code:'UAH', initial_balance:6000, bank_id:2,   icon:'🟩', color:'#16a34a', sort_order:2 },
  { id:4, name:'Картка $',        type:'CARD', currency_code:'USD', initial_balance:1200, bank_id:null, icon:'💳', color:'#3b82f6', sort_order:3 },
  { id:5, name:'Гаманець €',      type:'CARD', currency_code:'EUR', initial_balance:600,  bank_id:null, icon:'👛', color:'#8b5cf6', sort_order:4 },
];

// ——— Банки (кредитні ліміти) ———
const banks = [
  { id:1, name:'Monobank',   currency:'UAH', limit:25000, primary_account_id:2 },
  { id:2, name:'ПриватБанк', currency:'UAH', limit:15000, primary_account_id:3 },
];

// ——— Категорії (як у сіді + бюджети) ———
const categories = [
  { id:1, name:'Продукти',  kind:'EXPENSE', color:'#22c55e', icon:'🛒', budget:9000, budget_period:'monthly', rollover:false },
  { id:2, name:'Кафе',      kind:'EXPENSE', color:'#f97316', icon:'🍽️', budget:3500, budget_period:'monthly', rollover:false },
  { id:3, name:'Транспорт', kind:'EXPENSE', color:'#3b82f6', icon:'🚕', budget:2500, budget_period:'monthly', rollover:false },
  { id:4, name:'Житло',     kind:'EXPENSE', color:'#8b5cf6', icon:'🏠', budget:0,    budget_period:'monthly', rollover:false },
  { id:5, name:'Здоровʼя',  kind:'EXPENSE', color:'#ef4444', icon:'💊', budget:0,    budget_period:'monthly', rollover:false },
  { id:6, name:'Розваги',   kind:'EXPENSE', color:'#ec4899', icon:'🎬', budget:3000, budget_period:'monthly', rollover:true  },
  { id:7, name:'Одяг',      kind:'EXPENSE', color:'#14b8a6', icon:'👕', budget:0,    budget_period:'yearly',  rollover:false },
  { id:8, name:'Інше',      kind:'EXPENSE', color:'#64748b', icon:'📦', budget:0,    budget_period:'monthly', rollover:false },
  { id:9,  name:'Зарплата',   kind:'INCOME', color:'#16a34a', icon:'💼' },
  { id:10, name:'Підробіток', kind:'INCOME', color:'#0ea5e9', icon:'💸' },
  { id:11, name:'Подарунки',  kind:'INCOME', color:'#eab308', icon:'🎁' },
  { id:12, name:'Інше',       kind:'INCOME', color:'#64748b', icon:'📥' },
];

const tx = [];
let tid = 1, ord = 1;
const add = o => { tx.push(Object.assign({ id: tid++, ord: ord++, note:null, tags:[] }, o)); };
const before = d => d <= TODAY;

const groceryNotes = ['Сільпо','АТБ','Novus','Ринок','Варус','Метро'];
const cafeNotes = ['Кава з собою','Бізнес-ланч','Сніданок','Піца','Суші','Бар з друзями'];
const transNotes = ['Таксі','Паливо','Метро/проїзд','Bolt','Уклон'];
const funNotes = ['Кіно','Концерт','Boardgames','Steam','Книги','Боулінг'];
const healthNotes = ['Аптека','Стоматолог','Аналізи','Вітаміни','Лікар'];

for (let m = 1; m <= 6; m++) {
  const y = 2026, dim = daysInMonth(y, m);

  // Зарплата 5-го числа → Monobank
  if (before(iso(y, m, 5))) add({ kind:'INCOME', date:iso(y,m,5), account_id:2, category_id:9, amount:amt(36000,40000), note:'Зарплата', tags:['робота'] });

  // Підробіток (не щомісяця) → ПриватБанк
  if (chance(0.6) && before(iso(y, m, ri(10,24)))) add({ kind:'INCOME', date:iso(y,m,ri(10,24)), account_id:3, category_id:10, amount:amt(4000,9000), note:'Фриланс-проєкт', tags:['робота'] });

  // Поповнення ПриватБанку з Monobank (розподіл коштів між картками)
  if (before(iso(y, m, 6))) { const v = amt(6000,8000); add({ kind:'TRANSFER', date:iso(y,m,6), account_id:2, to_account_id:3, amount:v, to_amount:v, exchange_rate:1, fee_type:'NONE', fee_value:0, fee_amount:0, note:'Поповнення картки' }); }

  // Зрідка подарунок/кешбек
  if (chance(0.3) && before(iso(y, m, ri(12,26)))) add({ kind:'INCOME', date:iso(y,m,ri(12,26)), account_id:1, category_id:11, amount:amt(500,2500), note:pick(['Подарунок','Кешбек','Повернення боргу']) });

  // Оренда 2-го → Житло (з Monobank)
  if (before(iso(y, m, 2))) add({ kind:'EXPENSE', date:iso(y,m,2), account_id:2, category_id:4, amount:13000, note:'Оренда квартири' });

  // Комуналка 15-го → Житло (з ПриватБанку)
  if (before(iso(y, m, 15))) add({ kind:'EXPENSE', date:iso(y,m,15), account_id:3, category_id:4, amount:amt(1600,2900), note:'Комуналка' });

  // Інтернет 7-го → Житло
  if (before(iso(y, m, 7))) add({ kind:'EXPENSE', date:iso(y,m,7), account_id:2, category_id:4, amount:300, note:'Інтернет' });

  // Мобільний 10-го → Інше
  if (before(iso(y, m, 10))) add({ kind:'EXPENSE', date:iso(y,m,10), account_id:2, category_id:8, amount:200, note:'Мобільний звʼязок' });

  // Підписки → Розваги
  if (before(iso(y, m, 12))) add({ kind:'EXPENSE', date:iso(y,m,12), account_id:2, category_id:6, amount:259, note:'Netflix' });
  if (before(iso(y, m, 18))) add({ kind:'EXPENSE', date:iso(y,m,18), account_id:3, category_id:6, amount:149, note:'Spotify' });

  // Продукти 2–3 рази/тиждень (переважно картки, зрідка готівка)
  for (let d = 3; d <= dim; d += ri(2,4)) {
    if (!before(iso(y,m,d))) break;
    const cash = chance(0.3);
    add({ kind:'EXPENSE', date:iso(y,m,d), account_id: cash?1:pick([2,3]), category_id:1, amount:amt(350,1500), note:pick(groceryNotes) });
  }
  // Кафе 2–4 рази/тиждень
  for (let d = 2; d <= dim; d += ri(2,3)) {
    if (!before(iso(y,m,d))) break;
    if (chance(0.7)) add({ kind:'EXPENSE', date:iso(y,m,d), account_id:pick([1,2,2,3,3]), category_id:2, amount:amt(110,620), note:pick(cafeNotes) });
  }
  // Транспорт
  for (let d = 4; d <= dim; d += ri(3,5)) {
    if (!before(iso(y,m,d))) break;
    add({ kind:'EXPENSE', date:iso(y,m,d), account_id:pick([1,2,2]), category_id:3, amount:amt(80,420), note:pick(transNotes) });
  }
  // Розваги щотижня
  for (let d = 6; d <= dim; d += ri(6,9)) {
    if (!before(iso(y,m,d))) break;
    add({ kind:'EXPENSE', date:iso(y,m,d), account_id:pick([2,3]), category_id:6, amount:amt(150,1200), note:pick(funNotes) });
  }
  // Здоровʼя зрідка
  if (chance(0.7)) { const d = ri(5,26); if (before(iso(y,m,d))) add({ kind:'EXPENSE', date:iso(y,m,d), account_id:pick([3,2]), category_id:5, amount:amt(200,2600), note:pick(healthNotes) }); }
  // Одяг зрідка
  if (chance(0.55)) { const d = ri(8,27); if (before(iso(y,m,d))) add({ kind:'EXPENSE', date:iso(y,m,d), account_id:pick([2,3]), category_id:7, amount:amt(700,4200), note:pick(['Кросівки','Куртка','Джинси','Сорочка','Zara','H&M']) }); }
  // Інше
  if (chance(0.6)) { const d = ri(6,26); if (before(iso(y,m,d))) add({ kind:'EXPENSE', date:iso(y,m,d), account_id:pick([2,3]), category_id:8, amount:amt(150,1800), note:pick(['Побутова хімія','Подарунок другу','Ремонт','Канцелярія','Донат']) }); }

  // Зняття готівки з картки → переказ Monobank → Готівка (раз на місяць, без комісії)
  { const dd = ri(6,22); if (before(iso(y,m,dd))) { const w = amt(3000,5000); add({ kind:'TRANSFER', date:iso(y,m,dd), account_id:2, to_account_id:1, amount:w, to_amount:w, exchange_rate:1, fee_type:'NONE', fee_value:0, fee_amount:0, note:'Зняття готівки' }); } }
  // Поповнення доларової картки (переказ між валютами з комісією) — раз на пару місяців
  if (m % 2 === 1) { const d = ri(10,20); if (before(iso(y,m,d))) {
    const usd = amt(100,300), rate = amt(41.0,42.5), uah = round2(usd*rate);
    add({ kind:'TRANSFER', date:iso(y,m,d), account_id:2, to_account_id:4, amount:uah, to_amount:usd, exchange_rate:round2(1/rate), fee_type:'PERCENT', fee_value:1, fee_amount:round2(uah*0.01), note:'Купівля $' });
  }}
}

// Кілька витрат у валюті (демонстрація мультивалютності)
add({ kind:'EXPENSE', date:'2026-03-14', account_id:4, category_id:8, amount:amt(20,60), note:'Підписка (US)', tags:['робота'] });
add({ kind:'EXPENSE', date:'2026-05-09', account_id:5, category_id:6, amount:amt(15,45), note:'Apple Store' });
add({ kind:'EXPENSE', date:'2026-06-02', account_id:4, category_id:8, amount:amt(10,30), note:'Хостинг' });

// Фіксуємо «відпустку» тегом на кількох травневих операціях
tx.filter(t => t.date >= '2026-05-01' && t.date <= '2026-05-12' && [2,3].includes(t.category_id))
  .slice(0, 4).forEach(t => { t.tags = [...new Set([...(t.tags||[]), 'відпустка'])]; });

// ——— Цілі ———
const goals = [
  { id:1, name:'Відпустка', target:60000, saved:24500, currency:'UAH', deadline:'2026-08-15', color:'#0ea5e9', icon:'✈️' },
  { id:2, name:'Подушка безпеки', target:120000, saved:52000, currency:'UAH', deadline:null, color:'#22c55e', icon:'🛟' },
];

// ——— Регулярні платежі (шаблони; next_date — наступне списання) ———
const recurring = [
  { id:1, name:'Інтернет', kind:'EXPENSE', freq:'monthly', amount:300, next_date:'2026-07-07', account_id:2, category_id:4, active:true },
  { id:2, name:'Netflix',  kind:'EXPENSE', freq:'monthly', amount:259, next_date:'2026-06-18', account_id:2, category_id:6, active:true },
  { id:3, name:'Spotify',  kind:'EXPENSE', freq:'monthly', amount:149, next_date:'2026-07-18', account_id:3, category_id:6, active:true },
  { id:4, name:'Оренда',   kind:'EXPENSE', freq:'monthly', amount:13000, next_date:'2026-07-02', account_id:2, category_id:4, active:true },
];

// ——— Кредит (розстрочка) ———
const loans = [
  { id:1, bank_id:1, name:'Розстрочка: ноутбук', principal:36000, months:12, has_interest:false, rate:0, due_date:'2026-07-02', paid:15000 },
];

const data = {
  version: 2,
  seq: { acc:6, cat:13, tx:tid, bank:3, loan:2, rec:5, goal:3 },
  accounts, categories, transactions: tx, banks, loans, recurring, goals,
};
const payload = { app:'MoneyMe', version:2, exported_at:'2026-06-18T10:00:00.000Z', data };

fs.writeFileSync(__dirname + '/demo-2026.json', JSON.stringify(payload, null, 2), 'utf8');

// невелика статистика для контролю
const sum = (k, kind) => tx.filter(t => t.kind===kind).reduce((s,t)=>s+(t[k]||0),0);
console.log('Операцій:', tx.length);
console.log('  INCOME:', tx.filter(t=>t.kind==='INCOME').length, '≈', round2(sum('amount','INCOME')));
console.log('  EXPENSE:', tx.filter(t=>t.kind==='EXPENSE').length, '≈', round2(sum('amount','EXPENSE')));
console.log('  TRANSFER:', tx.filter(t=>t.kind==='TRANSFER').length);
console.log('Діапазон дат:', tx.reduce((a,t)=>t.date<a?t.date:a,'9999'), '→', tx.reduce((a,t)=>t.date>a?t.date:a,'0'));
console.log('Баланси рахунків:');
accounts.forEach(a => {
  let bal = a.initial_balance || 0;
  for (const t of tx) {
    if (t.kind==='INCOME' && t.account_id===a.id) bal += t.amount;
    else if (t.kind==='EXPENSE' && t.account_id===a.id) bal -= t.amount;
    else if (t.kind==='TRANSFER') { if (t.account_id===a.id) bal -= (t.amount+(t.fee_amount||0)); if (t.to_account_id===a.id) bal += (t.to_amount||0); }
  }
  console.log('  ', a.name.padEnd(12), round2(bal), a.currency_code, bal<0?'  <-- МІНУС!':'');
});
