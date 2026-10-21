import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type InterestType = 'simple' | 'compound';

export type Account = {
  id: string;
  name: string;
  type: string;
  currency: string;
  initial_balance: number;
  interest_type: InterestType | null;
  interest_rate: number | null;
  is_primary: boolean;
};

export type AccountBalance = {
  account_id: string;
  current_balance: number;
};

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: ({ signal }) => apiFetch<Account[]>('/accounts', { signal }),
  });
}

/** Accounts joined with their current balance; one balance request per account. */
export function useAccountBalances(accounts: Account[] | undefined) {
  return useQueries({
    queries: (accounts ?? []).map((account) => ({
      queryKey: ['accounts', account.id, 'balance'],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        apiFetch<AccountBalance>(`/accounts/${account.id}/balance`, { signal }),
    })),
    combine: (results) => ({
      isPending: results.some((result) => result.isPending),
      isError: results.some((result) => result.isError),
      balances: new Map(
        results.flatMap((result) =>
          result.data ? [[result.data.account_id, result.data.current_balance] as const] : [],
        ),
      ),
    }),
  });
}

/** What the form sends. PATCH takes the same body: null clears the interest on an account. */
export type AccountInput = {
  name: string;
  type: string;
  initial_balance: number;
  interest_type: InterestType | null;
  interest_rate: number | null;
  is_primary: boolean;
};

/** Balances, the account list and the Inicio cards all hang off the `accounts` key. */
function useRefreshAccounts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['accounts'] });
}

/** Creates an account, or updates it when `id` is given. */
export function useSaveAccount() {
  const refresh = useRefreshAccounts();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AccountInput }) =>
      id
        ? apiFetch<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
        : apiFetch<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: refresh,
  });
}

/** The API unsets the previous primary account in the same request. */
export function useMakePrimary() {
  const refresh = useRefreshAccounts();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Account>(`/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_primary: true }),
      }),
    onSuccess: refresh,
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      // Drop the gone account's balance query first, or its refetch would 404 while the list reloads.
      queryClient.removeQueries({ queryKey: ['accounts', id] });
      // The delete cascades to the account's month-close snapshots too.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['month-close'] }),
      ]);
    },
  });
}
