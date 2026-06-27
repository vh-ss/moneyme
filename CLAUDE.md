# MoneyMe — персональний облік фінансів

Локальний веб-додаток обліку фінансів для ПК.

## Архітектура
- **Монорепо (npm workspaces)**: `server/` (Express + SQLite) і `web/` (React + Vite).
- Збірні скрипти генерують **офлайн-білди в один файл**: `MoneyMe.html` (PWA) і `MoneyMe-DEMO.html` (демо з даними `demo-2026.json`).
- PWA: `manifest.webmanifest`, `sw.js`, `.nojekyll` (для GitHub Pages).

## Середовище
- **Node.js (v24) та інтернет ДОСТУПНІ на машині.** Збірку/тести можна ганяти локально.
- Основний робочий процес: правити код у джерелах → `node .build-pwa.cjs` (проганяє `tests.cjs`, штампує версію, будує `MoneyMe.html`/`index.html`/`sw.js`/`MoneyMe-DEMO.html`) → перевіряти у браузері.
- Команди (де є повний стек): `npm run dev`, `npm run typecheck`, `npm run test`.

## Межі проєкту
Працювати ТІЛЬКИ в цій папці (`TEST\MoneyMe`). Інші проєкти в `TEST` не чіпати.

## Git
- Репозиторій: **vh-ss/moneyme**, гілка `main`.
- Після кожної зміни — самостійно `commit` + `push`.
- Push працює лише з `http.sslBackend=schannel` (виставлено глобально).
