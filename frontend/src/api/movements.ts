import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type MovementKind = 'expense' | 'income' | 'transfer';
export type MovementOrigin = 'manual' | 'recurring' | 'month_close_surplus' | 'month_close_deficit';

export type Movement = {
  id: string;
  kind: MovementKind;
  amount: number;
  occurred_on: string;
  description: string | null;
  account_id: string;
  counterparty_account_id: string | null;
  category_id: string | null;
  origin: MovementOrigin;
  template_id: string | null;
};

/** Amount with the sign the user sees: expenses negative, income positive, transfers unsigned. */
export function signedAmount(movement: Movement): number {
  return movement.kind === 'expense' ? -movement.amount : movement.amount;
}

export type MovementFilters = {
  accountId?: string;
  categoryId?: string;
};

function movementsQuery(month: string, { accountId, categoryId }: MovementFilters = {}) {
  return {
    queryKey: ['movements', { month, accountId, categoryId }],
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      const params = new URLSearchParams({ month });
      if (accountId) params.set('account_id', accountId);
      if (categoryId) params.set('category_id', categoryId);
      return apiFetch<Movement[]>(`/movements?${params}`, { signal });
    },
  };
}

export function useMovements(month: string, filters: MovementFilters = {}) {
  return useQuery(movementsQuery(month, filters));
}

/** Every movement of each month in `months` (shares the cache with `useMovements`). */
export function useMovementsOfMonths(months: string[]) {
  return useQueries({
    queries: months.map((month) => movementsQuery(month)),
    combine: (results) => ({
      isPending: results.some((result) => result.isPending),
      isError: results.some((result) => result.isError),
      byMonth: new Map(
        results.flatMap((result, index) =>
          result.data ? [[months[index], result.data] as const] : [],
        ),
      ),
    }),
  });
}

/** What the form sends. PATCH takes the same body: null clears a field that no longer applies. */
export type MovementInput = {
  kind: MovementKind;
  amount: number;
  occurred_on: string;
  description: string | null;
  account_id: string;
  counterparty_account_id: string | null;
  category_id: string | null;
};

/** A movement changes balances and budget progress too, so all of them are refetched. */
function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['movements'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    ]);
}

/** Creates a movement, or updates it when `id` is given. */
export function useSaveMovement() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MovementInput }) =>
      id
        ? apiFetch<Movement>(`/movements/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
        : apiFetch<Movement>('/movements', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: refresh,
  });
}

export function useDeleteMovement() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/movements/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}
