import { useQuery } from '@tanstack/react-query';
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
