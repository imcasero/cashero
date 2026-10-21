import { useQueries, useQuery } from '@tanstack/react-query';
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
