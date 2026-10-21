import type { TemplateFrequency } from '../../api/templates';

const UNITS: Record<TemplateFrequency, { one: string; many: string }> = {
  daily: { one: 'día', many: 'días' },
  weekly: { one: 'semana', many: 'semanas' },
  monthly: { one: 'mes', many: 'meses' },
  yearly: { one: 'año', many: 'años' },
};

export const FREQUENCIES: TemplateFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

/** `semana` or `semanas`, to follow the number typed next to it. */
export function unitLabel(frequency: TemplateFrequency, count: number): string {
  return count === 1 ? UNITS[frequency].one : UNITS[frequency].many;
}

/** `cada mes`, `cada 2 semanas`. */
export function frequencyLabel(frequency: TemplateFrequency, count: number): string {
  return count === 1 ? `cada ${UNITS[frequency].one}` : `cada ${count} ${UNITS[frequency].many}`;
}
