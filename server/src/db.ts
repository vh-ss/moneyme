import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, 'moneyme.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  type            TEXT    NOT NULL DEFAULT 'CARD',        -- CASH | CARD | BANK
  currency_code   TEXT    NOT NULL DEFAULT 'UAH',
  initial_balance REAL    NOT NULL DEFAULT 0,
  color           TEXT    NOT NULL DEFAULT '#3b82f6',
  icon            TEXT,
  archived        INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  kind        TEXT    NOT NULL,                           -- EXPENSE | INCOME
  color       TEXT    NOT NULL DEFAULT '#64748b',
  icon        TEXT,
  archived    INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT    NOT NULL,                         -- EXPENSE | INCOME | TRANSFER
  date          TEXT    NOT NULL,                         -- ISO 'YYYY-MM-DD'
  note          TEXT,
  account_id    INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount        REAL    NOT NULL DEFAULT 0,
  to_account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  to_amount     REAL,
  exchange_rate REAL,
  fee_type      TEXT    NOT NULL DEFAULT 'NONE',          -- NONE | PERCENT | FIXED
  fee_value     REAL    NOT NULL DEFAULT 0,
  fee_amount    REAL    NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_date       ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_account    ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_to_account ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_tx_category   ON transactions(category_id);
`;

db.exec(SCHEMA);
seedCategories();

/** Базові статті при першому запуску (якщо таблиця порожня). */
function seedCategories(): void {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM categories').get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO categories (name, kind, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const expense: Array<[string, string, string]> = [
    ['Продукти', '#22c55e', '🛒'],
    ['Кафе і ресторани', '#f97316', '🍽️'],
    ['Транспорт', '#3b82f6', '🚕'],
    ['Житло і комуналка', '#8b5cf6', '🏠'],
    ['Здоровʼя', '#ef4444', '💊'],
    ['Розваги', '#ec4899', '🎬'],
    ['Одяг', '#14b8a6', '👕'],
    ['Інше', '#64748b', '📦'],
  ];
  const income: Array<[string, string, string]> = [
    ['Зарплата', '#16a34a', '💼'],
    ['Підробіток', '#0ea5e9', '💸'],
    ['Подарунки', '#f59e0b', '🎁'],
    ['Інше', '#64748b', '📥'],
  ];

  const tx = db.transaction(() => {
    expense.forEach(([name, color, icon], i) => insert.run(name, 'EXPENSE', color, icon, i));
    income.forEach(([name, color, icon], i) => insert.run(name, 'INCOME', color, icon, i));
  });
  tx();
}
