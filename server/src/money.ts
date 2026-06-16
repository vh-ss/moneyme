// Чисті фінансові розрахунки: комісія, конвертація, впливи на баланс.

export type FeeType = 'NONE' | 'PERCENT' | 'FIXED';
export type TxKind = 'EXPENSE' | 'INCOME' | 'TRANSFER';

/** Округлення до 2 знаків (копійки/центи). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Абсолютна сума комісії за переказ.
 * PERCENT — відсоток від суми переказу; FIXED — фіксована; NONE — без комісії.
 */
export function computeFee(amount: number, feeType: FeeType, feeValue: number): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  switch (feeType) {
    case 'PERCENT':
      return round2((amount * (feeValue || 0)) / 100);
    case 'FIXED':
      return round2(Math.max(0, feeValue || 0));
    default:
      return 0;
  }
}

/** Сума, що зараховується на рахунок-призначення (з урахуванням курсу). */
export function computeToAmount(amount: number, exchangeRate: number): number {
  const rate = exchangeRate && exchangeRate > 0 ? exchangeRate : 1;
  return round2(amount * rate);
}

/** Скільки реально списується з рахунку-джерела під час переказу. */
export function computeDebit(amount: number, fee: number): number {
  return round2(amount + fee);
}

export interface TransferInput {
  amount: number;
  feeType: FeeType;
  feeValue: number;
  exchangeRate: number;
}

export interface TransferResult {
  amount: number;
  feeAmount: number;
  debit: number; // списано з джерела (amount + feeAmount)
  toAmount: number; // зараховано призначенню
  exchangeRate: number;
}

/** Повний розрахунок переказу для збереження та прев'ю в UI. */
export function calcTransfer(input: TransferInput): TransferResult {
  const amount = round2(input.amount);
  const feeAmount = computeFee(amount, input.feeType, input.feeValue);
  const rate = input.exchangeRate && input.exchangeRate > 0 ? input.exchangeRate : 1;
  return {
    amount,
    feeAmount,
    debit: computeDebit(amount, feeAmount),
    toAmount: computeToAmount(amount, rate),
    exchangeRate: rate,
  };
}
