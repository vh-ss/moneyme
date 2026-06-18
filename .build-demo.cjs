// Збирає MoneyMe-DEMO.html — самодостатню «пісочницю» з вшитими демо-даними.
// Ізоляція: усі ключі localStorage отримують префікс moneyme.demo.* —
// тож реальний MoneyMe.html (ключі moneyme.*) лишається недоторканим.
const fs = require('fs');
const path = require('path');
const dir = __dirname;

let html = fs.readFileSync(path.join(dir, 'MoneyMe.html'), 'utf8');

// 1) Простір імен для localStorage: moneyme. -> moneyme.demo.
html = html.replace(/moneyme\./g, 'moneyme.demo.');

// 2) Демо-дані (із згенерованого бекапу) + курси валют
const demo = JSON.parse(fs.readFileSync(path.join(dir, 'demo-2026.json'), 'utf8'));
const data = demo.data;
const rates = { date: '2026-06-18', base: 'UAH', rates: { UAH:1, USD:41.8, EUR:45.2, PLN:10.6, GBP:53.1 }, fetched_at: '2026-06-18T09:00:00.000Z', error: null };

const boot = `<script>
/* DEMO bootstrap: одноразово засіває пісочницю, якщо вона порожня */
(function(){
  try {
    var K='moneyme.demo.v1';
    if(!localStorage.getItem(K)) localStorage.setItem(K, ${JSON.stringify(JSON.stringify(data))});
    var RK='moneyme.demo.rates';
    if(!localStorage.getItem(RK)) localStorage.setItem(RK, ${JSON.stringify(JSON.stringify(rates))});
    var LB='moneyme.demo.lastBackup';
    if(!localStorage.getItem(LB)) localStorage.setItem(LB, '2026-06-18');
  } catch(e){}
})();
window.addEventListener('DOMContentLoaded', function(){
  document.title = 'MoneyMe — DEMO';
  var b = document.createElement('div');
  b.textContent = 'DEMO · пісочниця — ваші реальні дані недоторкані (клік, щоб сховати)';
  b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;background:#f59e0b;color:#111827;font:600 12px system-ui,sans-serif;padding:7px 11px;border-radius:9px;box-shadow:0 2px 10px rgba(0,0,0,.25);opacity:.93;cursor:pointer;max-width:92vw';
  b.onclick = function(){ b.remove(); };
  document.body.appendChild(b);
});
</script>`;

// 3) Вставляємо bootstrap перед головним скриптом застосунку
const idx = html.indexOf('<script>');
if (idx < 0) throw new Error('Не знайдено <script> у MoneyMe.html');
html = html.slice(0, idx) + boot + '\n' + html.slice(idx);

fs.writeFileSync(path.join(dir, 'MoneyMe-DEMO.html'), html, 'utf8');
console.log('MoneyMe-DEMO.html зібрано:', (Buffer.byteLength(html)/1024).toFixed(0), 'KB');
console.log('Операцій у демо:', data.transactions.length);
