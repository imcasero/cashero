/** The swatches of the colour picker, in the order the design shows them (same values as the
 * `--color-cat-*` tokens in index.css, stored as hex because that is what the API keeps). */
export const CATEGORY_COLORS = [
  { name: 'Índigo', hex: '#5b6cb1' },
  { name: 'Verde', hex: '#3f8f6a' },
  { name: 'Naranja', hex: '#bf7a2c' },
  { name: 'Rojo', hex: '#b65b49' },
  { name: 'Violeta', hex: '#8b5ba5' },
  { name: 'Turquesa', hex: '#2e899b' },
  { name: 'Rosa', hex: '#9f5179' },
  { name: 'Oliva', hex: '#7a803a' },
  { name: 'Azul', hex: '#2e6fa7' },
  { name: 'Verde azulado', hex: '#4c9a8a' },
  { name: 'Mostaza', hex: '#8a7a2d' },
  { name: 'Pizarra', hex: '#5d6a73' },
] as const;

export function sameColor(a: string | null | undefined, b: string | null | undefined): boolean {
  return a != null && b != null && a.toLowerCase() === b.toLowerCase();
}
