// Типи доменних сутностей + тонкий fetch-клієнт до /api.

export type AccountType = 'CASH' | 'CARD' | 'BANK';
export type CategoryKind = 'EXPENSE' | 'INCOME';
export type TxKind = 'EXPENSE' | 'INCOME' | 'TRANSFER';
export type FeeType = 'NONE' | 'PERCENT' | 'FIXED';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency_code: string;
  initial_balance: number;
  color: string;
  icon: string | null;
  archived: number;
  sort_order: number;
  balance: number; // обчислюється сервером
}

export interface Category {
  id: number;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string | null;
  archived: number;
  sort_order: number;
}

export interface Transaction {
  id: number;
  kind: TxKind;
  date: string;
  note: string | null;
  account_id: number | null;
  category_id: number | null;
  amount: number;
  to_account_id: number | null;
  to_amount: number | null;
  exchange_rate: number | null;
  fee_type: FeeType;
  fee_value: number;
  fee_amount: number;
  // приєднані поля
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  account_name?: string;
  account_currency?: string;
  account_color?: string;
  to_account_name?: string;
  to_account_currency?: string;
}

export interface CategoryStat {
  category_id: number;
  name: string;
  color: string;
  icon: string | null;
  total: number;
  count: number;
}

export interface Summary {
  expense: number;
  income: number;
  fees: number;
  net: number;
  transfers_count: number;
  monthly: Array<{ month: string; expense: number; income: number; fees: number }>;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Помилка ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const qs = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  // accounts
  listAccounts: (all = false) => request<Account[]>(`/api/accounts${all ? '?all=1' : ''}`),
  createAccount: (data: Partial<Account>) =>
    request<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: number, data: Partial<Account>) =>
    request<Account>(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: number) => request<void>(`/api/accounts/${id}`, { method: 'DELETE' }),

  // categories
  listCategories: (kind?: CategoryKind, all = false) =>
    request<Category[]>(`/api/categories${qs({ kind, all: all ? 1 : undefined })}`),
  createCategory: (data: Partial<Category>) =>
    request<Category>('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: Partial<Category>) =>
    request<Category>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) => request<void>(`/api/categories/${id}`, { method: 'DELETE' }),

  // transactions
  listTransactions: (filters: Record<string, unknown> = {}) =>
    request<Transaction[]>(`/api/transactions${qs(filters)}`),
  createEntry: (data: Record<string, unknown>) =>
    request<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (id: number, data: Record<string, unknown>) =>
    request<Transaction>(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createTransfer: (data: Record<string, unknown>) =>
    request<Transaction>('/api/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id: number) =>
    request<void>(`/api/transactions/${id}`, { method: 'DELETE' }),

  // analytics
  byCategory: (kind: CategoryKind, from?: string, to?: string) =>
    request<CategoryStat[]>(`/api/analytics/by-category${qs({ kind, from, to })}`),
  summary: (from?: string, to?: string) =>
    request<Summary>(`/api/analytics/summary${qs({ from, to })}`),

  // backup
  exportUrl: '/api/backup/export',
  importBackup: (data: unknown) =>
    request<{ ok: boolean }>('/api/backup/import', { method: 'POST', body: JSON.stringify(data) }),
};
