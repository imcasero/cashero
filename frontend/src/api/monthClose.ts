import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { currentMonthKey, previousMonthKey } from '../lib/format';

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
