const WHOLE_OR_CENTS = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

/** How a category is used right now, as the second line of its row. */
export type CategoryUsage = {
  templates: number;
  /** Movements this month; null while they are unknown (still loading or failed). */
  movements: number | null;
  limit: number | null;
};

export function usageLabel({ templates, movements, limit }: CategoryUsage): string {
  const parts: string[] = [];
  if (templates > 0) parts.push(templates === 1 ? '1 recurrente' : `${templates} recurrentes`);
  if (movements)
    parts.push(movements === 1 ? '1 movimiento este mes' : `${movements} movimientos este mes`);
  if (limit !== null) parts.push(`límite ${WHOLE_OR_CENTS.format(limit)} €`);
  return parts.length > 0 ? parts.join(' · ') : 'Sin uso este mes';
}
