import { useState } from 'react';
import { useAccounts, useTransactions, useTransactionMutations } from '../api/hooks.ts';
import TransactionItem from '../components/TransactionItem.tsx';
import TransactionForm from '../components/TransactionForm.tsx';
import { startOfMonthISO, todayISO } from '../lib/format.ts';
import type { Transaction, TxKind } from '../api/client.ts';

export default function Transactions() {
  const { data: accounts = [] } = useAccounts();
  const { remove } = useTransactionMutations();

  const [accountId, setAccountId] = useState<number | ''>('');
  const [kind, setKind] = useState<TxKind | ''>('');
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [edit, setEdit] = useState<Transaction | null>(null);

  const filters: Record<string, unknown> = {};
  if (accountId) filters.account_id = accountId;
  if (kind) filters.kind = kind;
  if (from) filters.from = from;
  if (to) filters.to = to;

  const { data: txs = [], isLoading } = useTransactions(filters);

  async function del(tx: Transaction) {
    if (confirm('Видалити операцію?')) await remove.mutateAsync(tx.id);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Операції</h1>

      <div className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div>
          <label className="label">Рахунок</label>
          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Усі</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Тип</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as TxKind | '')}>
            <option value="">Усі</option>
            <option value="EXPENSE">Витрати</option>
            <option value="INCOME">Надходження</option>
            <option value="TRANSFER">Перекази</option>
          </select>
        </div>
        <div>
          <label className="label">Від</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">До</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="card p-3">
        {isLoading ? (
          <p className="py-6 text-center text-slate-400">Завантаження…</p>
        ) : txs.length === 0 ? (
          <p className="py-6 text-center text-slate-400">Нічого не знайдено за фільтрами</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {txs.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} onEdit={setEdit} onDelete={del} />
            ))}
          </div>
        )}
      </div>

      <TransactionForm
        key={edit?.id ?? 'closed'}
        open={!!edit}
        kind={edit?.kind === 'INCOME' ? 'INCOME' : 'EXPENSE'}
        edit={edit}
        onClose={() => setEdit(null)}
      />
    </div>
  );
}
