import { Router } from 'express';
import { db } from '../db.ts';

const router = Router();

// GET /api/analytics/by-category?kind=EXPENSE&from&to
// Суми за статтями. Комісії сюди НЕ входять (лише EXPENSE/INCOME).
router.get('/by-category', (req, res) => {
  const { kind, from, to } = req.query as Record<string, string>;
  if (kind !== 'EXPENSE' && kind !== 'INCOME') {
    return res.status(400).json({ error: 'kind має бути EXPENSE або INCOME' });
  }
  const where = ['t.kind = ?'];
  const params: any[] = [kind];
  if (from) {
    where.push('t.date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('t.date <= ?');
    params.push(to);
  }
  const rows = db
    .prepare(
      `SELECT COALESCE(c.id, 0) AS category_id,
              COALESCE(c.name, 'Без категорії') AS name,
              COALESCE(c.color, '#94a3b8') AS color,
              c.icon AS icon,
              SUM(t.amount) AS total,
              COUNT(*) AS count
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE ${where.join(' AND ')}
       GROUP BY t.category_id
       ORDER BY total DESC`
    )
    .all(...params);
  res.json(rows);
});

// GET /api/analytics/summary?from&to
// Зведення: витрати, надходження, КОМІСІЇ (окремо), чистий потік + помісячна динаміка.
router.get('/summary', (req, res) => {
  const { from, to } = req.query as Record<string, string>;
  const cond: string[] = [];
  const params: any[] = [];
  if (from) {
    cond.push('date >= ?');
    params.push(from);
  }
  if (to) {
    cond.push('date <= ?');
    params.push(to);
  }
  const whereDate = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN kind='EXPENSE' THEN amount END), 0)  AS expense,
         COALESCE(SUM(CASE WHEN kind='INCOME'  THEN amount END), 0)  AS income,
         COALESCE(SUM(CASE WHEN kind='TRANSFER' THEN fee_amount END), 0) AS fees,
         COALESCE(SUM(CASE WHEN kind='TRANSFER' THEN 1 ELSE 0 END), 0)   AS transfers_count
       FROM transactions ${whereDate}`
    )
    .get(...params) as { expense: number; income: number; fees: number; transfers_count: number };

  const monthly = db
    .prepare(
      `SELECT substr(date, 1, 7) AS month,
              COALESCE(SUM(CASE WHEN kind='EXPENSE' THEN amount END), 0) AS expense,
              COALESCE(SUM(CASE WHEN kind='INCOME'  THEN amount END), 0) AS income,
              COALESCE(SUM(CASE WHEN kind='TRANSFER' THEN fee_amount END), 0) AS fees
       FROM transactions ${whereDate}
       GROUP BY month ORDER BY month`
    )
    .all(...params);

  res.json({
    expense: totals.expense,
    income: totals.income,
    fees: totals.fees,
    net: totals.income - totals.expense - totals.fees,
    transfers_count: totals.transfers_count,
    monthly,
  });
});

export default router;
