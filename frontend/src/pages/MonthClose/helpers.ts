import type { Category } from '../../api/categories';
import type { Movement } from '../../api/movements';

/** How many closed months the history reaches back. */
export const MONTHS_SHOWN = 12;

/** The name a template goes by in lists: its description, or its category when it has none. */
export function templateLabel(
  template: { description: string | null; category_id: string },
  categories: Map<string, Category>,
): string {
  return template.description ?? categories.get(template.category_id)?.name ?? 'Plantilla';
}

export type ClosedMonthFigures = {
  month: string;
  income: number;
  expenses: number;
  result: number;
  /** Moved out of the primary account by the close, or back into it after a deficit. */
  distributed: number;
  returned: number;
};

/** Figures of a closed month, from its stored movements (transfers never count as result). */
export function closedMonthFigures(month: string, movements: Movement[]): ClosedMonthFigures {
  let income = 0;
  let expenses = 0;
  let distributed = 0;
  let returned = 0;
  for (const movement of movements) {
    if (movement.kind === 'income') income += movement.amount;
    if (movement.kind === 'expense') expenses -= movement.amount;
    if (movement.origin === 'month_close_surplus') distributed += movement.amount;
    if (movement.origin === 'month_close_deficit') returned += movement.amount;
  }
  return { month, income, expenses, result: income + expenses, distributed, returned };
}
