// Збирає файли для хостингу/демо з канонічного MoneyMe.html.
// index.html — точка входу GitHub Pages (ідентична копія застосунку).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const d = __dirname;

const src = fs.readFileSync(path.join(d, 'MoneyMe.html'), 'utf8');
fs.writeFileSync(path.join(d, 'index.html'), src, 'utf8');
console.log('index.html оновлено (', (Buffer.byteLength(src) / 1024).toFixed(0), 'KB )');

// Штампуємо версію збірки у sw.js (хеш контенту застосунку) — щоб браузер бачив оновлення
const build = crypto.createHash('sha256').update(src).digest('hex').slice(0, 10);
const swPath = path.join(d, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const BUILD = '[^']*';/, "const BUILD = '" + build + "';");
fs.writeFileSync(swPath, sw, 'utf8');
console.log('sw.js версія збірки:', build);

// Перезбираємо демо-пісочницю на новій версії коду
try { execFileSync('node', [path.join(d, '.build-demo.cjs')], { stdio: 'inherit' }); }
catch (e) { console.warn('Демо не перезібрано:', e.message); }
