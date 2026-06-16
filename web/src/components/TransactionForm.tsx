import { useEffect, useState } from 'react';
import Modal from './Modal.tsx';
import { useAccounts, useCategories, useTransactionMutations } from '../api/hooks.ts';
import { todayISO } from '../lib/format.ts';
import type { CategoryKind, Transaction } from '../api/client.ts';

interface Props {
  open: boolean;
  kind: CategoryKind; // EXPENSE | INCOME
  onClose: () => void;
  edit?: Transaction | null;
}

export default function TransactionForm({ open, kind, onClose, edit }: Props) {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories(kind);
  const { createEntry, updateEntry } = useTransactionMutations();

  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Ініціалізація значень при відкритті.
  useEffect(() => {
    if (!open) return;
    if (edit) {
      setAmount(String(edit.amount));
      setAccountId(edit.account_id ?? '');
      setCategoryId(edit.category_id ?? '');
      setDate(edit.date.slice(0, 10));
      setNote(edit.note ?? '');
    } else {
      setAmount('');
      setNote('');
      setDate(todayISO());
      setAccountId(accounts[0]?.id ?? '');
      setCategoryId(categories[0]?.id ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit, accounts.length, categories.length]);

  const isIncome = kind === 'INCOME';
  const title = (edit ? 'Редагувати ' : '') + (isIncome ? 'надходження' : 'витрату');

  async function submit() {
    setError('');
    const value = Number(amount.replace(',', '.'));
    if (!value || value <= 0) return setError('Введіть суму більше 0');
    if (!accountId) return setError('Оберіть рахунок');

    const payload = {
      kind,
      date,
      note: note || null,
      account_id: Number(accountId),
      category_id: categoryId ? Number(categoryId) : null,
      amount: value,
    };
    try {
      if (edit) await updateEntry.mutateAsync({ id: edit.id, data: payload });
      else await createEntry.mutateAsync(payload);
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn-primary" onClick={submit} disabled={createEntry.isPending || updateEntry.isPending}>
            Зберегти
          </button>
        </>
      }
    >
      <div>
        <label className="label">Сума</label>
        <input
          className="input text-2xl font-semibold"
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Рахунок</label>
        <select className="input" value={accountId} onChange={(e) => setAccountId(Number(e.target.value))}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency_code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Категорія</label>
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
          <option value="">Без категорії</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? c.icon + ' ' : ''}
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Дата</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Нотатка</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="—" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
