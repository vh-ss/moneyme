import { useState } from 'react';
import { useCategories, useCategoryMutations } from '../api/hooks.ts';
import { PALETTE } from '../lib/format.ts';
import type { Category, CategoryKind } from '../api/client.ts';
import Modal from '../components/Modal.tsx';

export default function Categories() {
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const { data: categories = [] } = useCategories(kind, true);
  const { create, update, remove } = useCategoryMutations();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', color: PALETTE[0], icon: '' });
  const [error, setError] = useState('');

  function openNew() {
    setEditId(null);
    setForm({ name: '', color: PALETTE[0], icon: '' });
    setError('');
    setOpen(true);
  }
  function openEdit(c: Category) {
    setEditId(c.id);
    setForm({ name: c.name, color: c.color, icon: c.icon ?? '' });
    setError('');
    setOpen(true);
  }
  async function save() {
    if (!form.name.trim()) return setError('Введіть назву');
    const payload = { name: form.name.trim(), kind, color: form.color, icon: form.icon || null };
    try {
      if (editId) await update.mutateAsync({ id: editId, data: payload });
      else await create.mutateAsync(payload);
      setOpen(false);
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function del(c: Category) {
    if (confirm(`Видалити категорію «${c.name}»? В операціях вона стане «Без категорії».`)) {
      await remove.mutateAsync(c.id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Категорії</h1>
        <button className="btn-primary" onClick={openNew}>
          + Додати
        </button>
      </div>

      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {(['EXPENSE', 'INCOME'] as CategoryKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`btn px-4 ${kind === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}
          >
            {k === 'EXPENSE' ? 'Витрати' : 'Надходження'}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {categories.map((c) => (
          <div key={c.id} className="card flex items-center gap-3 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-full text-sm" style={{ backgroundColor: c.color + '22', color: c.color }}>
              {c.icon || '•'}
            </span>
            <span className="flex-1 font-medium">{c.name}</span>
            <button className="btn-ghost px-2 py-1 text-sm" onClick={() => openEdit(c)}>
              ✎
            </button>
            <button className="btn-ghost px-2 py-1 text-sm text-red-500 hover:bg-red-50" onClick={() => del(c)}>
              ✕
            </button>
          </div>
        ))}
        {categories.length === 0 && <p className="text-slate-400">Категорій немає.</p>}
      </div>

      <Modal
        open={open}
        title={editId ? 'Редагувати категорію' : 'Нова категорія'}
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
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <div>
            <label className="label">Емодзі</label>
            <input
              className="input w-16 text-center text-xl"
              maxLength={2}
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="🙂"
            />
          </div>
          <div>
            <label className="label">Назва</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
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
