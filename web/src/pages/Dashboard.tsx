import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useAccounts, useSummary, useTransactions } from '../api/hooks.ts';
import { formatMoney, startOfMonthISO, todayISO } from '../lib/format.ts';
import type { Account, CategoryKind, Transaction } from '../api/client.ts';
import AccountCard from '../components/AccountCard.tsx';
import QuickActions from '../components/QuickActions.tsx';
import TransactionForm from '../components/TransactionForm.tsx';
import TransferDialog from '../components/TransferDialog.tsx';
import TransactionItem from '../components/TransactionItem.tsx';

export default function Dashboard() {
  const { data: accounts = [] } = useAccounts();
  const { data: recent = [] } = useTransactions({ limit: 8 });
  const { data: summary } = useSummary(startOfMonthISO(), todayISO());

  const [entryKind, setEntryKind] = useState<CategoryKind | null>(null);
  const [transfer, setTransfer] = useState<{ from: Account; to: Account } | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Підсумок балансів, згрупований за валютою.
  const byCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) map.set(a.currency_code, (map.get(a.currency_code) ?? 0) + a.balance);
    return [...map.entries()];
  }, [accounts]);

  function onDragOver(e: DragOverEvent) {
    const overAcc = e.over?.data.current?.account as Account | undefined;
    const fromAcc = e.active.data.current?.account as Account | undefined;
    setOverId(overAcc && fromAcc && overAcc.id !== fromAcc.id ? overAcc.id : null);
  }

  function onDragEnd(e: DragEndEvent) {
    setOverId(null);
    const from = e.active.data.current?.account as Account | undefined;
    const to = e.over?.data.current?.account as Account | undefined;
    if (from && to && from.id !== to.id) setTransfer({ from, to });
  }

  return (
    <div className="space-y-6">
      {/* Зведення за валютами */}
      <section className="card p-5">
        <h2 className="text-sm font-medium text-slate-500">Загальний баланс</h2>
        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1">
          {byCurrency.length === 0 && <p className="text-slate-400">Додайте рахунок, щоб почати</p>}
          {byCurrency.map(([cur, total]) => (
            <div key={cur} className="text-3xl font-bold tabular-nums">
              {formatMoney(total, cur)}
            </div>
          ))}
        </div>
        {summary && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Stat label="Надходження (міс.)" value={summary.income} cls="text-green-600" />
            <Stat label="Витрати (міс.)" value={summary.expense} cls="text-red-600" />
            <Stat label="Комісії (міс.)" value={summary.fees} cls="text-amber-600" />
          </div>
        )}
      </section>

      <QuickActions onExpense={() => setEntryKind('EXPENSE')} onIncome={() => setEntryKind('INCOME')} />

      {/* Рахунки з drag-and-drop */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Рахунки</h2>
          <span className="text-xs text-slate-400">Перетягніть картку на іншу — зробити переказ</span>
        </div>
        <DndContext sensors={sensors} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {accounts.map((a) => (
              <AccountCard key={a.id} account={a} isOver={overId === a.id} />
            ))}
          </div>
        </DndContext>
      </section>

      {/* Останні операції */}
      <section className="card p-4">
        <h2 className="mb-1 font-semibold">Останні операції</h2>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-slate-400">Операцій ще немає</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((tx: Transaction) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </section>

      {/* Модалки */}
      <TransactionForm
        key={entryKind ?? 'closed'}
        open={!!entryKind}
        kind={entryKind ?? 'EXPENSE'}
        onClose={() => setEntryKind(null)}
      />
      <TransferDialog
        open={!!transfer}
        from={transfer?.from ?? null}
        to={transfer?.to ?? null}
        onClose={() => setTransfer(null)}
      />
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div>
      <span className="text-slate-400">{label}: </span>
      <span className={`font-semibold tabular-nums ${cls}`}>{formatMoney(value, 'UAH')}</span>
    </div>
  );
}
