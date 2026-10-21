import { useQuery } from '@tanstack/react-query';
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

export function useMovements(month: string) {
  return useQuery({
    queryKey: ['movements', { month }],
    queryFn: ({ signal }) => apiFetch<Movement[]>(`/movements?month=${month}`, { signal }),
  });
}
