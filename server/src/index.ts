import express from 'express';
import cors from 'cors';
import './db.ts'; // ініціалізує БД та сід
import accounts from './routes/accounts.ts';
import categories from './routes/categories.ts';
import transactions from './routes/transactions.ts';
import analytics from './routes/analytics.ts';
import backup from './routes/backup.ts';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/accounts', accounts);
app.use('/api/categories', categories);
app.use('/api/transactions', transactions);
app.use('/api/analytics', analytics);
app.use('/api/backup', backup);

// Уніфікована обробка помилок (зокрема zod-валідація).
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed', details: err.issues });
  }
  console.error(err);
  res.status(err?.status ?? 500).json({ error: err?.message ?? 'Internal error' });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`MoneyMe API → http://localhost:${PORT}`));
