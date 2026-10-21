import { useQuery } from '@tanstack/react-query';
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
