import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';

const router = Router();

const accountSchema = z.object({
  name: z.string().min(1, 'Назва обовʼязкова'),
  type: z.enum(['CASH', 'CARD', 'BANK']).default('CARD'),
  currency_code: z.string().min(2).max(5).default('UAH'),
  initial_balance: z.number().default(0),
  color: z.string().default('#3b82f6'),
  icon: z.string().nullish(),
  archived: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// SQL-вираз поточного балансу рахунку (init + надходження − витрати − перекази-out + перекази-in).
const BALANCE_EXPR = `
  a.initial_balance
  + COALESCE((SELECT SUM(t.amount)              FROM transactions t WHERE t.kind='INCOME'   AND t.account_id=a.id), 0)
  - COALESCE((SELECT SUM(t.amount)              FROM transactions t WHERE t.kind='EXPENSE'  AND t.account_id=a.id), 0)
  - COALESCE((SELECT SUM(t.amount + t.fee_amount) FROM transactions t WHERE t.kind='TRANSFER' AND t.account_id=a.id), 0)
  + COALESCE((SELECT SUM(t.to_amount)          FROM transactions t WHERE t.kind='TRANSFER' AND t.to_account_id=a.id), 0)
`;

function listWithBalances(includeArchived = false) {
  return db
    .prepare(
      `SELECT a.*, (${BALANCE_EXPR}) AS balance
       FROM accounts a
       ${includeArchived ? '' : 'WHERE a.archived = 0'}
       ORDER BY a.sort_order, a.id`
    )
    .all();
}

// GET /api/accounts?all=1 — список рахунків з обчисленими балансами
router.get('/', (req, res) => {
  res.json(listWithBalances(req.query.all === '1'));
});

// GET /api/accounts/balances — лише id + balance + currency (для дашборду)
router.get('/balances', (_req, res) => {
  res.json(
    db
      .prepare(`SELECT a.id, a.name, a.currency_code, (${BALANCE_EXPR}) AS balance
                FROM accounts a WHERE a.archived = 0 ORDER BY a.sort_order, a.id`)
      .all()
  );
});

router.post('/', (req, res) => {
  const d = accountSchema.parse(req.body);
  const info = db
    .prepare(
      `INSERT INTO accounts (name, type, currency_code, initial_balance, color, icon, sort_order)
       VALUES (@name, @type, @currency_code, @initial_balance, @color, @icon, @sort_order)`
    )
    .run({
      ...d,
      icon: d.icon ?? null,
      sort_order: d.sort_order ?? nextSortOrder(),
    });
  res.status(201).json(getById(Number(info.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const d = accountSchema.partial().parse(req.body);
  const current = getById(id);
  if (!current) return res.status(404).json({ error: 'Рахунок не знайдено' });
  const merged = { ...current, ...d, archived: d.archived ?? current.archived };
  db.prepare(
    `UPDATE accounts SET name=@name, type=@type, currency_code=@currency_code,
       initial_balance=@initial_balance, color=@color, icon=@icon,
       archived=@archived, sort_order=@sort_order WHERE id=@id`
  ).run({
    id,
    name: merged.name,
    type: merged.type,
    currency_code: merged.currency_code,
    initial_balance: merged.initial_balance,
    color: merged.color,
    icon: merged.icon ?? null,
    archived: merged.archived ? 1 : 0,
    sort_order: merged.sort_order,
  });
  res.json(getById(id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM accounts WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

function getById(id: number): any {
  return db.prepare(`SELECT a.*, (${BALANCE_EXPR}) AS balance FROM accounts a WHERE a.id = ?`).get(id);
}

function nextSortOrder(): number {
  const row = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM accounts').get() as {
    n: number;
  };
  return row.n;
}

export default router;
