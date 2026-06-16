import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Account, type Category, type CategoryKind } from './client.ts';

// Інвалідація всього, на що впливає зміна операцій/рахунків.
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
  };
}

export function useAccounts(all = false) {
  return useQuery({ queryKey: ['accounts', { all }], queryFn: () => api.listAccounts(all) });
}

export function useCategories(kind?: CategoryKind, all = false) {
  return useQuery({
    queryKey: ['categories', { kind, all }],
    queryFn: () => api.listCategories(kind, all),
  });
}

export function useTransactions(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.listTransactions(filters),
  });
}

export function useSummary(from?: string, to?: string) {
  return useQuery({ queryKey: ['analytics', 'summary', { from, to }], queryFn: () => api.summary(from, to) });
}

export function useByCategory(kind: CategoryKind, from?: string, to?: string) {
  return useQuery({
    queryKey: ['analytics', 'byCategory', { kind, from, to }],
    queryFn: () => api.byCategory(kind, from, to),
  });
}

export function useAccountMutations() {
  const invalidate = useInvalidateAll();
  return {
    create: useMutation({ mutationFn: (d: Partial<Account>) => api.createAccount(d), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Account> }) => api.updateAccount(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.deleteAccount(id), onSuccess: invalidate }),
  };
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });
  return {
    create: useMutation({ mutationFn: (d: Partial<Category>) => api.createCategory(d), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Category> }) => api.updateCategory(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.deleteCategory(id), onSuccess: invalidate }),
  };
}

export function useTransactionMutations() {
  const invalidate = useInvalidateAll();
  return {
    createEntry: useMutation({ mutationFn: (d: Record<string, unknown>) => api.createEntry(d), onSuccess: invalidate }),
    updateEntry: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateEntry(id, data),
      onSuccess: invalidate,
    }),
    createTransfer: useMutation({
      mutationFn: (d: Record<string, unknown>) => api.createTransfer(d),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.deleteTransaction(id), onSuccess: invalidate }),
  };
}
