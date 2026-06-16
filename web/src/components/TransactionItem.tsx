import { formatMoney, formatDate } from '../lib/format.ts';
import type { Transaction } from '../api/client.ts';

interface Props {
  tx: Transaction;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
}

export default function TransactionItem({ tx, onEdit, onDelete }: Props) {
  const isTransfer = tx.kind === 'TRANSFER';
  const isIncome = tx.kind === 'INCOME';

  const icon = isTransfer ? '⇄' : isIncome ? '＋' : tx.category_icon || '－';
  const color = isTransfer ? '#0ea5e9' : isIncome ? '#16a34a' : tx.category_color || '#ef4444';

  const title = isTransfer
    ? `${tx.account_name} → ${tx.to_account_name}`
    : tx.category_name || 'Без категорії';

  const subtitle = isTransfer
    ? tx.fee_amount > 0
      ? `Комісія ${formatMoney(tx.fee_amount, tx.account_currency)}`
      : 'Переказ'
    : tx.account_name;

  return (
    <div className="flex items-center gap-3 px-1 py-2.5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm"
        style={{ backgroundColor: color + '22', color }}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="truncate text-xs text-slate-400">
          {formatDate(tx.date)} · {subtitle}
          {tx.note ? ` · ${tx.note}` : ''}
        </div>
      </div>

      <div className="text-right">
        {isTransfer ? (
          <div className="text-sm font-semibold tabular-nums text-slate-600">
            {formatMoney(tx.amount, tx.account_currency)}
          </div>
        ) : (
          <div
            className={`text-sm font-semibold tabular-nums ${isIncome ? 'text-green-600' : 'text-red-600'}`}
          >
            {isIncome ? '+' : '−'}
            {formatMoney(tx.amount, tx.account_currency)}
          </div>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex shrink-0 gap-1">
          {onEdit && !isTransfer && (
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onEdit(tx)}>
              ✎
            </button>
          )}
          {onDelete && (
            <button
              className="btn-ghost px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              onClick={() => onDelete(tx)}
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
