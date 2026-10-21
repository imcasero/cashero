import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { monthRange, parseDay } from '../lib/format';
import type { CategoryKind } from './categories';

export type TemplateFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type MovementTemplate = {
  id: string;
  kind: CategoryKind;
  amount: number;
  description: string | null;
  account_id: string;
  category_id: string;
  frequency: TemplateFrequency;
  interval_count: number;
  start_date: string;
  end_date: string | null;
  next_run_on: string;
  last_run_on: string | null;
  is_active: boolean;
};

/** Every template, paused ones included, ordered by next run (the API's order). */
export function useTemplates() {
  return useQuery({
    queryKey: ['movement-templates', 'all'],
    queryFn: ({ signal }) => apiFetch<MovementTemplate[]>('/movement-templates', { signal }),
  });
}

export function useActiveTemplates() {
  return useQuery({
    queryKey: ['movement-templates', { active: true }],
    queryFn: ({ signal }) =>
      apiFetch<MovementTemplate[]>('/movement-templates?is_active=true', { signal }),
  });
}

/** Shifts by whole months clamping the day, like the backend (31 Jan + 1 month -> 28 Feb). */
function addMonths(anchor: Date, months: number): Date {
  const target = new Date(anchor.getFullYear(), anchor.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(anchor.getDate(), lastDay));
  return target;
}

/** Occurrence number `index` (0 = start_date); always derived from start_date, as in the backend. */
function occurrenceOn(template: MovementTemplate, index: number): Date {
  const start = parseDay(template.start_date);
  const periods = template.interval_count * index;
  switch (template.frequency) {
    case 'daily':
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + periods);
    case 'weekly':
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + periods * 7);
    case 'monthly':
      return addMonths(start, periods);
    case 'yearly':
      return addMonths(start, periods * 12);
  }
}

/**
 * True when `next_run_on` is the last occurrence before `end_date`: the next close generates the
 * final charge (e.g. the last instalment of a loan).
 */
export function isLastInstallment(template: MovementTemplate): boolean {
  if (!template.end_date) return false;
  const nextRun = parseDay(template.next_run_on);
  const endDate = parseDay(template.end_date);

  // Find the occurrence that next_run_on points at, then check the one after it.
  // The cap only guards against a daily template that has been left behind for decades.
  for (let index = 0; index < 20000; index++) {
    if (occurrenceOn(template, index) >= nextRun) {
      return nextRun <= endDate && occurrenceOn(template, index + 1) > endDate;
    }
  }
  return false;
}

/** How many times a template will run inside `month` (counting only what has not run yet). */
export function occurrencesInMonth(template: MovementTemplate, month: string): number {
  const { start, end } = monthRange(month);
  const monthStart = parseDay(start);
  const monthEnd = parseDay(end);
  const nextRun = parseDay(template.next_run_on);
  const endDate = template.end_date ? parseDay(template.end_date) : null;

  let count = 0;
  for (let index = 0; ; index++) {
    const occurrence = occurrenceOn(template, index);
    if (occurrence > monthEnd || (endDate && occurrence > endDate)) return count;
    if (occurrence >= monthStart && occurrence >= nextRun) count++;
  }
}

/** Net effect of the templates still owed for `month`: income minus expenses. */
export function projectedTemplatesNet(templates: MovementTemplate[], month: string): number {
  return templates.reduce((total, template) => {
    const signed = template.kind === 'expense' ? -template.amount : template.amount;
    return total + signed * occurrencesInMonth(template, month);
  }, 0);
}

/**
 * What the form sends. The API seeds `next_run_on` from `start_date` and owns it afterwards, so it
 * is never sent. `start_date` is left out when editing a template that already ran, and
 * `end_date: null` clears the end.
 */
export type TemplateInput = {
  kind: CategoryKind;
  amount: number;
  description: string;
  account_id: string;
  category_id: string;
  frequency: TemplateFrequency;
  interval_count: number;
  start_date?: string;
  end_date: string | null;
};

/** Templates feed the projection on Inicio too, so every `movement-templates` query refetches. */
function useRefreshTemplates() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['movement-templates'] });
}

/** Creates a template, or updates it when `id` is given. */
export function useSaveTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TemplateInput }) =>
      id
        ? apiFetch<MovementTemplate>(`/movement-templates/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
          })
        : apiFetch<MovementTemplate>('/movement-templates', {
            method: 'POST',
            body: JSON.stringify(input),
          }),
    onSuccess: refresh,
  });
}

/** Pauses or resumes a template: a paused one is skipped when a month closes. */
export function useToggleTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<MovementTemplate>(`/movement-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      }),
    onSuccess: refresh,
  });
}

/** Movements already generated survive: the API keeps them and only drops the link. */
export function useDeleteTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/movement-templates/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}
