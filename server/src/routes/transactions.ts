import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';
import { calcTransfer } from '../money.ts';

const router = Router();

// Витрата / надходження
const entrySchema = z.object({
  kind: z.enum(['EXPENSE', 'INCOME']),
  date: z.string().min(8), // YYYY-MM-DD
  note: z.string().nullish(),
  account_id: z.number().int(),
  category_id: z.number().int().nullish(),
  amount: z.number().positive('Сума має бути більше 0'),
});

// Переказ між рахунками
const transferSchema = z.object({
  date: z.string().min(8),
  note: z.string().nullish(),
  account_id: z.number().int(), // джерело
  to_account_id: z.number().int(), // призначення
  amount: z.number().positive('Сума має бути більше 0'),
  fee_type: z.enum(['NONE', 'PERCENT', 'FIXED']).default('NONE'),
  fee_value: z.number().min(0).default(0),
  exchange_rate: z.number().positive().default(1),
});

const SELECT_TX = `
  SELECT t.*,
         c.name  AS category_name,  c.color AS category_color, c.icon AS category_icon,
         a.name  AS account_name,   a.currency_code AS account_currency, a.color AS account_color,
         ta.name AS to_account_name, ta.currency_code AS to_account_currency
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN accounts   a ON a.id = t.account_id
  LEFT JOIN accounts  ta ON ta.id = t.to_account_id
`;

// GET /api/transactions?account_id&category_id&kind&from&to&limit
router.get('/', (req, res) => {
  const { account_id, category_id, kind, from, to, limit } = req.query as Record<string, string>;
  const where: string[] = [];
  const params: any[] = [];
  if (account_id) {
    where.push('(t.account_id = ? OR t.to_account_id = ?)');
    params.push(Number(account_id), Number(account_id));
  }
  if (category_id) {
    where.push('t.category_id = ?');
    params.push(Number(category_id));
  }
  if (kind) {
    where.push('t.kind = ?');
    params.push(kind);
  }
  if (from) {
    where.push('t.date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('t.date <= ?');
    params.push(to);
  }
  const sql =
    SELECT_TX +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY t.date DESC, t.id DESC' +
    (limit ? ` LIMIT ${Number(limit)}` : '');
  res.json(db.prepare(sql).all(...params));
});

// POST /api/transactions — витрата або надходження
router.post('/', (req, res) => {
  const d = entrySchema.parse(req.body);
  const info = db
    .prepare(
      `INSERT INTO transactions (kind, date, note, account_id, category_id, amount, fee_type)
       VALUES (@kind, @date, @note, @account_id, @category_id, @amount, 'NONE')`
    )
    .run({ ...d, note: d.note ?? null, category_id: d.category_id ?? null });
  res.status(201).json(getById(Number(info.lastInsertRowid)));
});

// POST /api/transactions/transfer — переказ із комісією та курсом
router.post('/transfer', (req, res) => {
  const d = transferSchema.parse(req.body);
  if (d.account_id === d.to_account_id) {
    return res.status(400).json({ error: 'Рахунок-джерело і призначення мають відрізнятися' });
  }
  const r = calcTransfer({
    amount: d.amount,
    feeType: d.fee_type,
    feeValue: d.fee_value,
    exchangeRate: d.exchange_rate,
  });
  const info = db
    .prepare(
      `INSERT INTO transactions
         (kind, date, note, account_id, to_account_id, amount, to_amount, exchange_rate, fee_type, fee_value, fee_amount)
       VALUES ('TRANSFER', @date, @note, @account_id, @to_account_id, @amount, @to_amount, @exchange_rate, @fee_type, @fee_value, @fee_amount)`
    )
    .run({
      date: d.date,
      note: d.note ?? null,
      account_id: d.account_id,
      to_account_id: d.to_account_id,
      amount: r.amount,
      to_amount: r.toAmount,
      exchange_rate: r.exchangeRate,
      fee_type: d.fee_type,
      fee_value: d.fee_value,
      fee_amount: r.feeAmount,
    });
  res.status(201).json(getById(Number(info.lastInsertRowid)));
});

// PUT /api/transactions/:id — редагування витрати/надходження
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const current = getById(id);
  if (!current) return res.status(404).json({ error: 'Операцію не знайдено' });
  if (current.kind === 'TRANSFER') {
    return res.status(400).json({ error: 'Переказ редагувати не можна — видаліть і створіть заново' });
  }
  const d = entrySchema.parse(req.body);
  db.prepare(
    `UPDATE transactions SET kind=@kind, date=@date, note=@note, account_id=@account_id,
       category_id=@category_id, amount=@amount WHERE id=@id`
  ).run({ id, ...d, note: d.note ?? null, category_id: d.category_id ?? null });
  res.json(getById(id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

function getById(id: number): any {
  return db.prepare(SELECT_TX + ' WHERE t.id = ?').get(id);
}

export default router;
