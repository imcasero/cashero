import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type SurplusRule = {
  id: string;
  account_id: string;
  /** 0 < percentage <= 100, two decimals. */
  percentage: number;
};

export type SurplusRuleInput = {
  account_id: string;
  percentage: number;
};

export function useSurplusRules() {
  return useQuery({
    queryKey: ['surplus-rules'],
    queryFn: ({ signal }) => apiFetch<SurplusRule[]>('/surplus-allocation-rules', { signal }),
  });
}

/**
 * The split can only be changed as a whole: the PUT replaces every stored rule, and an account left
 * out of the list stops receiving anything.
 */
export function useSaveSurplusRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: SurplusRuleInput[]) =>
      apiFetch<SurplusRule[]>('/surplus-allocation-rules', {
        method: 'PUT',
        body: JSON.stringify({ rules }),
      }),
    // The PUT answers with the stored rules, so the screen can show them without a refetch.
    onSuccess: (rules) => queryClient.setQueryData(['surplus-rules'], rules),
  });
}
