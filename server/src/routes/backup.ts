import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';

const router = Router();

// GET /api/backup/export — повний дамп БД у JSON
router.get('/export', (_req, res) => {
  const payload = {
    app: 'MoneyMe',
    version: 1,
    exported_at: new Date().toISOString(),
    accounts: db.prepare('SELECT * FROM accounts ORDER BY id').all(),
    categories: db.prepare('SELECT * FROM categories ORDER BY id').all(),
    transactions: db.prepare('SELECT * FROM transactions ORDER BY id').all(),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="moneyme-backup.json"');
  res.json(payload);
});

const importSchema = z.object({
  accounts: z.array(z.record(z.any())),
  categories: z.array(z.record(z.any())),
  transactions: z.array(z.record(z.any())),
});

// POST /api/backup/import — повне відновлення (замінює поточні дані)
router.post('/import', (req, res) => {
  const data = importSchema.parse(req.body);

  const run = db.transaction(() => {
    db.exec('DELETE FROM transactions; DELETE FROM categories; DELETE FROM accounts;');

    const insAcc = db.prepare(
      `INSERT INTO accounts (id, name, type, currency_code, initial_balance, color, icon, archived, sort_order)
       VALUES (@id, @name, @type, @currency_code, @initial_balance, @color, @icon, @archived, @sort_order)`
    );
    for (const a of data.accounts) {
      insAcc.run({
        id: a.id ?? null,
        name: a.name,
        type: a.type ?? 'CARD',
        currency_code: a.currency_code ?? 'UAH',
        initial_balance: a.initial_balance ?? 0,
        color: a.color ?? '#3b82f6',
        icon: a.icon ?? null,
        archived: a.archived ?? 0,
        sort_order: a.sort_order ?? 0,
      });
    }

    const insCat = db.prepare(
      `INSERT INTO categories (id, name, kind, color, icon, archived, sort_order)
       VALUES (@id, @name, @kind, @color, @icon, @archived, @sort_order)`
    );
    for (const c of data.categories) {
      insCat.run({
        id: c.id ?? null,
        name: c.name,
        kind: c.kind,
        color: c.color ?? '#64748b',
        icon: c.icon ?? null,
        archived: c.archived ?? 0,
        sort_order: c.sort_order ?? 0,
      });
    }

    const insTx = db.prepare(
      `INSERT INTO transactions
         (id, kind, date, note, account_id, category_id, amount, to_account_id, to_amount, exchange_rate, fee_type, fee_value, fee_amount, created_at)
       VALUES
         (@id, @kind, @date, @note, @account_id, @category_id, @amount, @to_account_id, @to_amount, @exchange_rate, @fee_type, @fee_value, @fee_amount, @created_at)`
    );
    for (const t of data.transactions) {
      insTx.run({
        id: t.id ?? null,
        kind: t.kind,
        date: t.date,
        note: t.note ?? null,
        account_id: t.account_id ?? null,
        category_id: t.category_id ?? null,
        amount: t.amount ?? 0,
        to_account_id: t.to_account_id ?? null,
        to_amount: t.to_amount ?? null,
        exchange_rate: t.exchange_rate ?? null,
        fee_type: t.fee_type ?? 'NONE',
        fee_value: t.fee_value ?? 0,
        fee_amount: t.fee_amount ?? 0,
        created_at: t.created_at ?? new Date().toISOString(),
      });
    }
  });
  run();

  res.json({
    ok: true,
    accounts: data.accounts.length,
    categories: data.categories.length,
    transactions: data.transactions.length,
  });
});

export default router;
