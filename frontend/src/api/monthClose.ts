import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { currentMonthKey, previousMonthKey } from '../lib/format';
import type { Movement } from './movements';

export type MonthlyBalance = {
  id: string;
  account_id: string;
  /** First day of the closed month, `YYYY-MM-01`. */
  period_month: string;
  closing_balance: number;
  interest_accrued: number;
};

export function useMonthlyBalances() {
  return useQuery({
    queryKey: ['month-close'],
    queryFn: ({ signal }) => apiFetch<MonthlyBalance[]>('/month-close', { signal }),
  });
}

/**
 * The previous month is "pending" until a snapshot exists for it. `pendingMonth` is that
 * `YYYY-MM`, or null when it is closed (or while loading, so the banner never flashes).
 */
export function useMonthStatus() {
  const query = useMonthlyBalances();
  const currentMonth = currentMonthKey();
  const previousMonth = previousMonthKey(currentMonth);

  const closedMonths = new Set(
    (query.data ?? []).map((balance) => balance.period_month.slice(0, 7)),
  );
  const pendingMonth = query.data && !closedMonths.has(previousMonth) ? previousMonth : null;

  return { currentMonth, pendingMonth };
}

/** What one run of the close did, as the API reports it right after the click. */
export type MonthCloseResult = {
  month: string;
  surplus: number;
  generated_recurring: Movement[];
  transfers: Movement[];
  monthly_balances: MonthlyBalance[];
  deactivated_templates: string[];
};

/**
 * Closing is irreversible and touches movements, balances, templates and the snapshots, so every
 * one of those is refetched. The API answers 409 when the month is already closed and 422 when
 * there is no primary account.
 */
export function useCloseMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: string) =>
      apiFetch<MonthCloseResult>('/month-close', {
        method: 'POST',
        body: JSON.stringify({ month }),
      }),
    // Not awaited: the screen should move on to the result without waiting for the refetches,
    // and a failed close (409) still needs fresh snapshots to show the month as closed.
    onSettled: () => {
      for (const key of ['month-close', 'accounts', 'movements', 'budgets', 'movement-templates']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
