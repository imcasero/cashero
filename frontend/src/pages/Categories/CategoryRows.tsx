import { Pencil, Trash2 } from 'lucide-react';
import type { Category } from '../../api/categories';
import { Card } from '../../components/Card';
import { CategoryDot } from '../../components/CategoryDot';
import { type CategoryUsage, usageLabel } from './usage';

type CategoryGroupProps = {
  title: string;
  emptyText: string;
  categories: Category[];
  usageOf: (category: Category) => CategoryUsage;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

const ICON_BUTTON =
  'grid size-11 place-items-center rounded-control text-text-2 hover:bg-sunken hover:text-text';

/** One card per kind (Gasto / Ingreso): its count and a row per category. */
export function CategoryGroup({
  title,
  emptyText,
  categories,
  usageOf,
  onEdit,
  onDelete,
}: CategoryGroupProps) {
  return (
    <Card>
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <span className="font-mono text-[15px] text-text-2">{categories.length}</span>
      </div>

      {categories.length === 0 ? (
        <p className="pt-4 text-[14px] text-text-2">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 py-2">
              <CategoryDot color={category.color} square className="size-4" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{category.name}</p>
                <p className="truncate text-[13px] text-text-2">{usageLabel(usageOf(category))}</p>
              </div>
              <button
                type="button"
                className={ICON_BUTTON}
                aria-label={`Editar ${category.name}`}
                onClick={() => onEdit(category)}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={ICON_BUTTON}
                aria-label={`Borrar ${category.name}`}
                onClick={() => onDelete(category)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
