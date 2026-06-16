import { useState } from 'react';
import { useAccounts, useAccountMutations } from '../api/hooks.ts';
import { ACCOUNT_TYPE_LABEL, CURRENCIES, PALETTE, formatMoney } from '../lib/format.ts';
import type { Account, AccountType } from '../api/client.ts';
import Modal from '../components/Modal.tsx';

const EMPTY = {
  name: '',
  type: 'CARD' as AccountType,
  currency_code: 'UAH',
  initial_balance: '0',
  color: PALETTE[0],
};

export default function Accounts() {
  const { data: accounts = [] } = useAccounts(true);
  const { create, update, remove } = useAccountMutations();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY });
    setError('');
    setOpen(true);
  }

  function openEdit(a: Account) {
    setEditId(a.id);
    setForm({
      name: a.name,
      type: a.type,
      currency_code: a.currency_code,
      initial_balance: String(a.initial_balance),
      color: a.color,
    });
    setError('');
    setOpen(true);
  }

  async function save() {
    setError('');
    if (!form.name.trim()) return setError('Введіть назву рахунку');
    const payload = {
      name: form.name.trim(),
      type: form.type,
      currency_code: form.currency_code,
      initial_balance: Number(String(form.initial_balance).replace(',', '.')) || 0,
      color: form.color,
    };
    try {
      if (editId) await update.mutateAsync({ id: editId, data: payload });
      else await create.mutateAsync(payload);
      setOpen(false);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function del(a: Account) {
    if (confirm(`Видалити «${a.name}»? Всі операції цього рахунку також буде видалено.`)) {
      await remove.mutateAsync(a.id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Рахунки</h1>
        <button className="btn-primary" onClick={openNew}>
          + Додати рахунок
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((a) => (
          <div key={a.id} className="card flex items-center justify-between border-l-4 p-4" style={{ borderLeftColor: a.color }}>
            <div>
              <div className="font-medium">
                {a.name} {a.archived ? <span className="text-xs text-slate-400">(архів)</span> : null}
              </div>
              <div className="text-xs text-slate-400">
                {ACCOUNT_TYPE_LABEL[a.type]} · {a.currency_code} · старт: {formatMoney(a.initial_balance, a.currency_code)}
              </div>
              <div className="mt-1 text-lg font-bold tabular-nums">{formatMoney(a.balance, a.currency_code)}</div>
            </div>
            <div className="flex flex-col gap-1">
              <button className="btn-ghost px-2 py-1 text-sm" onClick={() => openEdit(a)}>
                Змінити
              </button>
              <button className="btn-ghost px-2 py-1 text-sm text-red-500 hover:bg-red-50" onClick={() => del(a)}>
                Видалити
              </button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && <p className="text-slate-400">Ще немає рахунків.</p>}
      </div>

      <Modal
        open={open}
        title={editId ? 'Редагувати рахунок' : 'Новий рахунок'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Скасувати
            </button>
            <button className="btn-primary" onClick={save}>
              Зберегти
            </button>
          </>
        }
      >
        <div>
          <label className="label">Назва</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Тип</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>
              <option value="CASH">Готівка</option>
              <option value="CARD">Картка</option>
              <option value="BANK">Банк. рахунок</option>
            </select>
          </div>
          <div>
            <label className="label">Валюта</label>
            <select
              className="input"
              value={form.currency_code}
              onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Стартовий залишок</label>
          <input
            className="input"
            inputMode="decimal"
            value={form.initial_balance}
            onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Колір</label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={`h-7 w-7 rounded-full ${form.color === c ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </Modal>
    </div>
  );
}
