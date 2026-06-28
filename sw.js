/* MoneyMe service worker — офлайн-кеш оболонки застосунку.
   Дані застосунку зберігаються у localStorage (не тут); SW кешує лише статику,
   щоб усе відкривалося без мережі. Cross-origin запити (Google API) не чіпаємо. */
const BUILD = 'e0713ad54b';   // підставляється збиранням (.build-pwa.cjs) — хеш контенту застосунку
const CACHE = 'moneyme-shell-' + BUILD;
const ASSETS = [
  './',
  './index.html',
  './MoneyMe.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // не валимо інсталяцію, якщо якогось файлу немає (напр. лише MoneyMe.html без index.html)
    await Promise.allSettled(ASSETS.map((u) => c.add(u)));
    await self.skipWaiting();   // нова версія активується ОДРАЗУ — критично для швидкого розкочування фіксів (без чіпляння у старому коді)
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
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
  // а одразу віддаємо кеш. Без таймауту fetch міг зависати до браузерного ліміту → застосунок «зависав».
  const isDoc = req.mode === 'navigate' || req.destination === 'document' ||
    url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isDoc) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html')) || (await cache.match('./MoneyMe.html'));
      // якщо кеш уже є — чекаємо мережу максимум 3с; на першому завантаженні (кешу нема) даємо більше часу
      const ctrl = new AbortController();
      let to; const timer = new Promise((_, rej) => { to = setTimeout(() => { ctrl.abort(); rej(new Error('sw-timeout')); }, cached ? 3000 : 12000); });
      const net = fetch(req, { signal: ctrl.signal }); net.catch(() => {});   // не лишати unhandled rejection при abort/offline
      try {
        const res = await Promise.race([net, timer]); clearTimeout(to);
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      } catch (e2) { clearTimeout(to); return cached || Response.error(); }
    })());
    return;
  }
  // Інша статика (іконки/маніфест) — stale-while-revalidate: миттєво з кешу, у фоні оновлюємо.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
