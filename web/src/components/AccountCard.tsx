import { useDraggable, useDroppable } from '@dnd-kit/core';
import { formatMoney, ACCOUNT_TYPE_LABEL } from '../lib/format.ts';
import type { Account } from '../api/client.ts';

interface Props {
  account: Account;
  isOver?: boolean;
}

/**
 * Картка рахунку: одночасно draggable (тягнемо як джерело) і droppable (кидаємо на неї як призначення).
 * Перетягування однієї картки на іншу ініціює переказ (обробка в Dashboard).
 */
export default function AccountCard({ account, isOver }: Props) {
  const draggable = useDraggable({ id: `acc-${account.id}`, data: { account } });
  const droppable = useDroppable({ id: `drop-${account.id}`, data: { account } });

  const setRefs = (el: HTMLElement | null) => {
    draggable.setNodeRef(el);
    droppable.setNodeRef(el);
  };

  return (
    <div
      ref={setRefs}
      {...draggable.listeners}
      {...draggable.attributes}
      style={{ borderTopColor: account.color }}
      className={`card cursor-grab select-none border-t-4 p-4 transition active:cursor-grabbing ${
        draggable.isDragging ? 'opacity-40' : ''
      } ${isOver ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
      title="Перетягніть на інший рахунок, щоб зробити переказ"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {account.icon ? account.icon + ' ' : ''}
          {account.name}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-slate-400">
          {ACCOUNT_TYPE_LABEL[account.type] ?? account.type}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">
        {formatMoney(account.balance, account.currency_code)}
      </div>
    </div>
  );
}
