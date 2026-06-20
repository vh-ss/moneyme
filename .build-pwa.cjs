// Збирає файли для хостингу/демо з канонічного MoneyMe.html.
// index.html — точка входу GitHub Pages (ідентична копія застосунку).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const d = __dirname;

const src = fs.readFileSync(path.join(d, 'MoneyMe.html'), 'utf8');
// Версія збірки = хеш контенту застосунку (рахуємо з канонічного src, у якому APP_VERSION='dev' — стабільно).
const build = crypto.createHash('sha256').update(src).digest('hex').slice(0, 10);
// index.html — точка входу Pages: підставляємо версію (а в MoneyMe.html лишається 'dev').
const indexHtml = src.replace(/const APP_VERSION = '[^']*';/, "const APP_VERSION = '" + build + "';");
fs.writeFileSync(path.join(d, 'index.html'), indexHtml, 'utf8');
console.log('index.html оновлено (', (Buffer.byteLength(indexHtml) / 1024).toFixed(0), 'KB ), версія', build);

// Штампуємо ту саму версію у sw.js — щоб браузер бачив оновлення
const swPath = path.join(d, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const BUILD = '[^']*';/, "const BUILD = '" + build + "';");
fs.writeFileSync(swPath, sw, 'utf8');
console.log('sw.js версія збірки:', build);

// Перезбираємо демо-пісочницю на новій версії коду
try { execFileSync('node', [path.join(d, '.build-demo.cjs')], { stdio: 'inherit' }); }
catch (e) { console.warn('Демо не перезібрано:', e.message); }
