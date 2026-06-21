// Збирає файли для хостингу/демо з канонічного MoneyMe.html.
// index.html — точка входу GitHub Pages (ідентична копія застосунку).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const d = __dirname;

// Юніт-тести чистих функцій — збірка падає, якщо доменна логіка зламана.
try { execFileSync('node', [path.join(d, 'tests.cjs')], { stdio: 'inherit' }); }
catch (e) { console.error('Юніт-тести впали — збірку зупинено.'); process.exit(1); }

const src = fs.readFileSync(path.join(d, 'MoneyMe.html'), 'utf8');
// Версія збірки = хеш контенту застосунку + статичних ассетів (іконки, manifest) — щоб зміна
// будь-якого ассета теж бастила кеш service worker. APP_VERSION='dev' у src — стабільно.
const hash = crypto.createHash('sha256').update(src);
['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'manifest.webmanifest'].forEach(f => { try { hash.update(fs.readFileSync(path.join(d, f))); } catch (e) {} });
const build = hash.digest('hex').slice(0, 10);
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
