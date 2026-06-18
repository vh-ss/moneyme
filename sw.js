/* MoneyMe service worker — офлайн-кеш оболонки застосунку.
   Дані застосунку зберігаються у localStorage (не тут); SW кешує лише статику,
   щоб усе відкривалося без мережі. Cross-origin запити (Google API) не чіпаємо. */
const BUILD = 'bd29666bb2';   // підставляється збиранням (.build-pwa.cjs) — хеш контенту застосунку
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
    // НЕ робимо skipWaiting автоматично — даємо застосунку показати плашку «оновити»
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

  // stale-while-revalidate: миттєво з кешу, у фоні оновлюємо
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) || (await cache.match('./index.html')) || (await cache.match('./MoneyMe.html')) || Response.error();
  })());
});
