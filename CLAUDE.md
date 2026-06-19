# MoneyMe — персональний облік фінансів

Локальний веб-додаток обліку фінансів для ПК.

## Архітектура
- **Монорепо (npm workspaces)**: `server/` (Express + SQLite) і `web/` (React + Vite).
- Збірні скрипти генерують **офлайн-білди в один файл**: `MoneyMe.html` (PWA) і `MoneyMe-DEMO.html` (демо з даними `demo-2026.json`).
- PWA: `manifest.webmanifest`, `sw.js`, `.nojekyll` (для GitHub Pages).

## Середовище
- **Машина БЕЗ Node.js та БЕЗ інтернету.** `npm install` / `npm run dev` тут НЕ запускаються.
- Тому правити код напряму, а перевіряти — через офлайн-білд `MoneyMe.html` у браузері (або згенерувати його збірним скриптом, якщо Node доступний).
- Команди для довідки (де є Node): `npm run dev`, `npm run typecheck`, `npm run test`.

## Межі проєкту
Працювати ТІЛЬКИ в цій папці (`TEST\MoneyMe`). Інші проєкти в `TEST` не чіпати.

## Git
- Репозиторій: **vh-ss/moneyme**, гілка `main`.
- Після кожної зміни — самостійно `commit` + `push`.
- Push працює лише з `http.sslBackend=schannel` (виставлено глобально).
