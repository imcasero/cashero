import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type BudgetStatus = {
  id: string;
  category_id: string;
  monthly_limit: number;
  month: string;
  spent: number;
  /** Goes negative once the limit is exceeded. */
  remaining: number;
};

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ['budgets', { month }],
    queryFn: ({ signal }) => apiFetch<BudgetStatus[]>(`/budgets?month=${month}`, { signal }),
  });
}
