import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.ts';

export default function Settings() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function exportData() {
    // Простий перехід на ендпоінт — браузер завантажить файл.
    window.location.href = api.exportUrl;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json.accounts) || !Array.isArray(json.transactions)) {
        throw new Error('Файл не схожий на бекап MoneyMe');
      }
      if (!confirm('Імпорт ЗАМІНИТЬ усі поточні дані. Продовжити?')) return;
      await api.importBackup(json);
      await qc.invalidateQueries();
      setMsg({ text: 'Дані успішно відновлено з файлу.', ok: true });
    } catch (err: any) {
      setMsg({ text: 'Помилка імпорту: ' + err.message, ok: false });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-xl font-bold">Налаштування</h1>

      <section className="card p-5">
        <h2 className="font-semibold">Резервне копіювання</h2>
        <p className="mt-1 text-sm text-slate-500">
          Експортуйте всі дані у файл JSON (його можна зберегти будь-де, зокрема на Google Drive) і відновіть за потреби.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={exportData}>
            ⬇ Експорт у файл
          </button>
          <button className="btn-ghost border border-slate-300" onClick={() => fileRef.current?.click()}>
            ⬆ Імпорт із файлу
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>
        {msg && (
          <p className={`mt-3 text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
        )}
      </section>

      <section className="card p-5 text-sm text-slate-500">
        <h2 className="font-semibold text-slate-800">Про застосунок</h2>
        <p className="mt-1">
          MoneyMe зберігає дані локально на вашому ПК (файл <code>server/data/moneyme.db</code>). Інтернет не потрібен.
        </p>
      </section>
    </div>
  );
}
