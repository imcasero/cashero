import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/** From here on a budget is "close to the limit" (the design only warns when action is needed). */
export const WARNING_RATIO = 0.85;

export type BudgetTone = 'ok' | 'warning' | 'over';

/** How much of its limit a budget has used; above 1 means exceeded. */
export function budgetRatio(budget: BudgetStatus): number {
  return budget.spent / budget.monthly_limit;
}

export function budgetTone(ratio: number): BudgetTone {
  if (ratio >= 1) return 'over';
  if (ratio >= WARNING_RATIO) return 'warning';
  return 'ok';
}

/** The limit is stored once and repeats every month, so every month's status changes with it. */
function useRefreshBudgets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['budgets'] });
}

/** Creates a budget for a category, or changes the limit of the one given by `id`. */
export function useSaveBudget() {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: ({ id, categoryId, limit }: { id?: string; categoryId: string; limit: number }) =>
      id
        ? apiFetch<unknown>(`/budgets/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ monthly_limit: limit }),
          })
        : apiFetch<unknown>('/budgets', {
            method: 'POST',
            body: JSON.stringify({ category_id: categoryId, monthly_limit: limit }),
          }),
    onSuccess: refresh,
  });
}

export function useDeleteBudget() {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}
