// Збирає файли для хостингу/демо з канонічного MoneyMe.html.
// index.html — точка входу GitHub Pages (ідентична копія застосунку).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const d = __dirname;

const src = fs.readFileSync(path.join(d, 'MoneyMe.html'), 'utf8');
fs.writeFileSync(path.join(d, 'index.html'), src, 'utf8');
console.log('index.html оновлено (', (Buffer.byteLength(src) / 1024).toFixed(0), 'KB )');

// Перезбираємо демо-пісочницю на новій версії коду
try { execFileSync('node', [path.join(d, '.build-demo.cjs')], { stdio: 'inherit' }); }
catch (e) { console.warn('Демо не перезібрано:', e.message); }
