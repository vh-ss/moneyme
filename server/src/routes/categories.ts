import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1, 'Назва обовʼязкова'),
  kind: z.enum(['EXPENSE', 'INCOME']),
  color: z.string().default('#64748b'),
  icon: z.string().nullish(),
  archived: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// GET /api/categories?kind=EXPENSE&all=1
router.get('/', (req, res) => {
  const kind = req.query.kind as string | undefined;
  const includeArchived = req.query.all === '1';
  const where: string[] = [];
  const params: any[] = [];
  if (kind) {
    where.push('kind = ?');
    params.push(kind);
  }
  if (!includeArchived) where.push('archived = 0');
  const sql = `SELECT * FROM categories ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY kind, sort_order, id`;
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const d = categorySchema.parse(req.body);
  const info = db
    .prepare(
      `INSERT INTO categories (name, kind, color, icon, sort_order)
       VALUES (@name, @kind, @color, @icon, @sort_order)`
    )
    .run({ ...d, icon: d.icon ?? null, sort_order: d.sort_order ?? nextSortOrder(d.kind) });
  res.status(201).json(getById(Number(info.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const current = getById(id);
  if (!current) return res.status(404).json({ error: 'Категорію не знайдено' });
  const d = categorySchema.partial().parse(req.body);
  const m = { ...current, ...d };
  db.prepare(
    `UPDATE categories SET name=@name, kind=@kind, color=@color, icon=@icon,
       archived=@archived, sort_order=@sort_order WHERE id=@id`
  ).run({
    id,
    name: m.name,
    kind: m.kind,
    color: m.color,
    icon: m.icon ?? null,
    archived: (d.archived ?? !!current.archived) ? 1 : 0,
    sort_order: m.sort_order,
  });
  res.json(getById(id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

function getById(id: number): any {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}
function nextSortOrder(kind: string): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories WHERE kind = ?')
    .get(kind) as { n: number };
  return row.n;
}

export default router;
