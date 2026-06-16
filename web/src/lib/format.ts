// Форматування грошей і дат.

export function formatMoney(amount: number, currency = 'UAH'): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // невідомий код валюти → показуємо число + код
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(amount || 0);
}

export function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

export function startOfMonthISO(): string {
  return todayISO().slice(0, 8) + '01';
}

export const CURRENCIES = ['UAH', 'USD', 'EUR', 'PLN', 'GBP'];

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  CASH: 'Готівка',
  CARD: 'Картка',
  BANK: 'Банк. рахунок',
};

export const PALETTE = [
  '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444',
  '#ec4899', '#14b8a6', '#eab308', '#0ea5e9', '#64748b',
];
