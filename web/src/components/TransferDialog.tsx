import { useEffect, useState } from 'react';
import Modal from './Modal.tsx';
import { useTransactionMutations } from '../api/hooks.ts';
import { formatMoney, todayISO } from '../lib/format.ts';
import type { Account, FeeType } from '../api/client.ts';

interface Props {
  open: boolean;
  from: Account | null;
  to: Account | null;
  onClose: () => void;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default function TransferDialog({ open, from, to, onClose }: Props) {
  const { createTransfer } = useTransactionMutations();
  const [amount, setAmount] = useState('');
  const [feeType, setFeeType] = useState<FeeType>('NONE');
  const [feeValue, setFeeValue] = useState('');
  const [rate, setRate] = useState('1');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const crossCurrency = !!from && !!to && from.currency_code !== to.currency_code;

  useEffect(() => {
    if (open) {
      setAmount('');
      setFeeType('NONE');
      setFeeValue('');
      setRate('1');
      setDate(todayISO());
      setNote('');
      setError('');
    }
  }, [open]);

  const amt = Number(amount.replace(',', '.')) || 0;
  const fv = Number(feeValue.replace(',', '.')) || 0;
  const r = crossCurrency ? Number(rate.replace(',', '.')) || 0 : 1;
  const fee = feeType === 'PERCENT' ? round2((amt * fv) / 100) : feeType === 'FIXED' ? round2(fv) : 0;
  const debit = round2(amt + fee);
  const credit = round2(amt * (r > 0 ? r : 1));

  async function submit() {
    setError('');
    if (!from || !to) return setError('Оберіть рахунки');
    if (amt <= 0) return setError('Введіть суму більше 0');
    if (crossCurrency && r <= 0) return setError('Введіть курс конвертації');
    try {
      await createTransfer.mutateAsync({
        date,
        note: note || null,
        account_id: from.id,
        to_account_id: to.id,
        amount: amt,
        fee_type: feeType,
        fee_value: fv,
        exchange_rate: r > 0 ? r : 1,
      });
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Modal
      open={open}
      title="Переказ між рахунками"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn-primary" onClick={submit} disabled={createTransfer.isPending}>
            Переказати
          </button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
        <div className="font-medium">{from?.name ?? '—'}</div>
        <div className="text-slate-400">→</div>
        <div className="font-medium">{to?.name ?? '—'}</div>
      </div>

      <div>
        <label className="label">Сума ({from?.currency_code})</label>
        <input
          className="input text-2xl font-semibold"
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Комісія</label>
          <select className="input" value={feeType} onChange={(e) => setFeeType(e.target.value as FeeType)}>
            <option value="NONE">Без комісії</option>
            <option value="PERCENT">Відсоток %</option>
            <option value="FIXED">Фіксована</option>
          </select>
        </div>
        <div>
          <label className="label">{feeType === 'PERCENT' ? 'Відсоток, %' : 'Сума комісії'}</label>
          <input
            className="input"
            inputMode="decimal"
            disabled={feeType === 'NONE'}
            placeholder="0"
            value={feeValue}
            onChange={(e) => setFeeValue(e.target.value)}
          />
        </div>
      </div>

      {crossCurrency && (
        <div>
          <label className="label">
            Курс ({from?.currency_code} → {to?.currency_code})
          </label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="напр. 41.5"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      )}

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

      {/* Живий прев'ю */}
      <div className="rounded-xl border border-slate-200 p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-500">Спишеться з «{from?.name}»</span>
          <span className="font-semibold text-red-600">−{formatMoney(debit, from?.currency_code)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Зарахується на «{to?.name}»</span>
          <span className="font-semibold text-green-600">+{formatMoney(credit, to?.currency_code)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Комісія</span>
          <span className="font-medium text-amber-600">{formatMoney(fee, from?.currency_code)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
