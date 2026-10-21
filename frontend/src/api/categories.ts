import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type CategoryKind = 'expense' | 'income';

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string | null;
};

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => apiFetch<Category[]>('/categories', { signal }),
  });
}

/** What the form sends; PATCH takes the same body. */
export type CategoryInput = {
  name: string;
  kind: CategoryKind;
  color: string;
};

/** Categories show up in budgets, movements and templates, so a change refreshes all of them. */
function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ['categories', 'budgets', 'movements', 'movement-templates'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

export function useSaveCategory() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CategoryInput }) =>
      id
        ? apiFetch<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
        : apiFetch<Category>('/categories', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: refresh,
  });
}

export function useDeleteCategory() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}
