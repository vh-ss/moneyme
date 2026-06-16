import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useByCategory, useSummary } from '../api/hooks.ts';
import { formatMoney, startOfMonthISO, todayISO } from '../lib/format.ts';
import type { CategoryKind, CategoryStat } from '../api/client.ts';

export default function Analytics() {
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());

  const { data: summary } = useSummary(from, to);
  const { data: expenses = [] } = useByCategory('EXPENSE', from, to);
  const { data: incomes = [] } = useByCategory('INCOME', from, to);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-bold">Аналітика</h1>
        <div className="flex gap-2">
          <div>
            <label className="label">Від</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">До</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Зведення */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Надходження" value={summary?.income ?? 0} cls="text-green-600" />
        <SummaryCard label="Витрати" value={summary?.expense ?? 0} cls="text-red-600" />
        <SummaryCard label="Комісії" value={summary?.fees ?? 0} cls="text-amber-600" hint="окремо від витрат" />
        <SummaryCard label="Чистий потік" value={summary?.net ?? 0} cls={(summary?.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      {/* Кругові діаграми */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryPie title="Витрати за статтями" data={expenses} />
        <CategoryPie title="Надходження за статтями" data={incomes} />
      </div>

      {/* Помісячна динаміка */}
      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Динаміка по місяцях</h2>
        {summary && summary.monthly.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary.monthly}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} width={70} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="income" name="Надходження" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Витрати" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fees" name="Комісії" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-6 text-center text-slate-400">Немає даних за період</p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, cls, hint }: { label: string; value: number; cls: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${cls}`}>{formatMoney(value)}</div>
      {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
    </div>
  );
}

function CategoryPie({ title, data }: { title: string; data: CategoryStat[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  return (
    <div className="card p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {data.length === 0 ? (
        <p className="py-10 text-center text-slate-400">Немає даних</p>
      ) : (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <ResponsiveContainer width="100%" height={200} className="max-w-[220px]">
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {data.map((d) => (
                  <Cell key={d.category_id} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="w-full space-y-1 text-sm">
            {data.map((d) => (
              <li key={d.category_id} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="flex-1 truncate">
                  {d.icon ? d.icon + ' ' : ''}
                  {d.name}
                </span>
                <span className="tabular-nums font-medium">{formatMoney(d.total)}</span>
                <span className="w-10 text-right text-xs text-slate-400">
                  {total ? Math.round((d.total / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
