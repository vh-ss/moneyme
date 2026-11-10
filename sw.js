/* MoneyMe service worker — офлайн-кеш оболонки застосунку.
   Дані застосунку зберігаються у localStorage (не тут); SW кешує лише статику,
   щоб усе відкривалося без мережі. Cross-origin запити (Google API) не чіпаємо.

   УРОК (листопад 2026): застосунок «зависав на лого» без інтернету. Причина була НЕ у вході в Google,
   а тут: оновлення на поганій мережі могло не докачати index.html, install усе одно вважався
   успішним (Promise.allSettled ковтав помилку), а activate зносив СТАРИЙ робочий кеш. Після цього
   офлайн відкривати було нічого. Тому тепер: без оболонки install ПАДАЄ, старий кеш не чіпаємо,
   поки новий не готовий, а оболонку шукаємо в УСІХ кешах. */
const BUILD = '2d8f540cce';   // підставляється збиранням (.build-pwa.cjs) — хеш контенту застосунку
const CACHE = 'moneyme-shell-' + BUILD;
const SHELL = ['./index.html', './MoneyMe.html'];   // сама оболонка (достатньо хоча б одного файлу)
const EXTRA = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
];

// Чи є в кеші хоч якась оболонка застосунку.
async function hasShell(cache){
  for (const u of SHELL) { if (await cache.match(u)) return true; }
  return false;
}
// Пошук у БУДЬ-ЯКОМУ кеші (включно зі старими версіями): краще віддати файл попередньої версії,
// ніж не віддати нічого — саме через це застосунок переставав відкриватись після обірваного оновлення.
async function anyCached(req){
  for (const k of await caches.keys()) {
    const c = await caches.open(k);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
  }
  return null;
}
async function anyCachedShell(req){
  return (req && await anyCached(req)) || (await anyCached('./index.html')) || (await anyCached('./MoneyMe.html'));
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Оболонку кешуємо ОБОВ'ЯЗКОВО. Якщо жоден файл не доїхав (обірвана мережа) — кидаємо помилку:
    // install падає, лишається працювати попередній SW зі своїм кешем, і застосунок далі відкривається.
    await Promise.allSettled(SHELL.map((u) => c.add(u)));
    if (!await hasShell(c)) { await caches.delete(CACHE); throw new Error('shell not cached'); }
    await Promise.allSettled(EXTRA.map((u) => c.add(u)));   // іконки/маніфест — не критично
    await self.skipWaiting();   // нова версія активується ОДРАЗУ — критично для швидкого розкочування фіксів
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Старі кеші прибираємо ЛИШЕ коли новий справді має оболонку — інакше лишаємо їх як запасний аеродром.
    if (await hasShell(c)) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Google API тощо — напряму в мережу

  // Документ (увесь застосунок — single-file HTML): NETWORK-FIRST з ТАЙМАУТОМ — онлайн віддає свіжий код,
  // але якщо мережа не відповіла швидко (офлайн / є з'єднання без інтернету / повільний DNS) — НЕ висимо,
  // а одразу віддаємо кеш.
  const isDoc = req.mode === 'navigate' || req.destination === 'document' ||
    url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isDoc) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await anyCachedShell(req);
      // якщо кеш уже є — чекаємо мережу максимум 3с; на першому завантаженні (кешу нема) даємо більше часу
      const ctrl = new AbortController();
      let to; const timer = new Promise((_, rej) => { to = setTimeout(() => { ctrl.abort(); rej(new Error('sw-timeout')); }, cached ? 3000 : 12000); });
      const net = fetch(req, { signal: ctrl.signal }); net.catch(() => {});   // не лишати unhandled rejection при abort/offline
      try {
        const res = await Promise.race([net, timer]); clearTimeout(to);
        if (res && res.status === 200) { cache.put(req, res.clone()); return res; }
        // 5xx, редірект кептив-порталу Wi-Fi тощо — краще віддати робочу оболонку з кешу, ніж сторінку помилки
        return cached || res;
      } catch (e2) { clearTimeout(to); return cached || Response.error(); }
    })());
    return;
  }
  // Інша статика (іконки/маніфест) — stale-while-revalidate: миттєво з кешу, у фоні оновлюємо.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = (await cache.match(req, { ignoreSearch: true })) || (await anyCached(req));
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
