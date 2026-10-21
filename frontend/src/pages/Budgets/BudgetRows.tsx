import { EllipsisVertical } from 'lucide-react';
import { type BudgetStatus, budgetRatio, budgetTone } from '../../api/budgets';
import type { Category } from '../../api/categories';
import { Amount } from '../../components/Amount';
import { CategoryDot } from '../../components/CategoryDot';
import { ProgressBar } from '../../components/ProgressBar';
import { formatEur } from '../../lib/format';

const TONE_TEXT = {
  over: 'text-negative',
  warning: 'text-warning',
  ok: 'text-text-2',
};

/** The line under a budget's bar: what is left, and a warning only when action is needed. */
function remainingText(budget: BudgetStatus, ratio: number): string {
  const tone = budgetTone(ratio);
  const remaining = `Restante ${formatEur(budget.remaining)}`;
  if (tone === 'over') return `${remaining} · superado un ${Math.round((ratio - 1) * 100)} %`;
  if (tone === 'warning') return `${remaining} · cerca del límite`;
  return remaining;
}

type BudgetRowsProps = {
  budgets: BudgetStatus[];
  categoryById: Map<string, Category>;
  onOpenActions: (budget: BudgetStatus) => void;
};

/** The most used budgets first, so what needs attention is at the top. */
export function BudgetRows({ budgets, categoryById, onOpenActions }: BudgetRowsProps) {
  const rows = budgets
    .map((budget) => ({ budget, ratio: budgetRatio(budget) }))
    .sort((a, b) => b.ratio - a.ratio);

  return (
    <ul className="divide-y divide-line">
      {rows.map(({ budget, ratio }) => {
        const category = categoryById.get(budget.category_id);
        const name = category?.name ?? 'Sin categoría';
        const tone = budgetTone(ratio);

        return (
          <li key={budget.id} className="flex items-start gap-2 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5 font-semibold">
                  <CategoryDot square color={category?.color} />
                  <span className="truncate">{name}</span>
                </span>
                <span className="font-mono text-[14px] whitespace-nowrap text-text-2">
                  <Amount
                    value={budget.spent}
                    tone="neutral"
                    className="text-[14px] font-normal text-text"
                  />{' '}
                  <span className="font-sans text-[13px]">de</span>{' '}
                  <Amount value={budget.monthly_limit} tone="neutral" className="font-normal" />
                </span>
              </div>
              <ProgressBar ratio={ratio} tone={tone} label={`Presupuesto de ${name}`} />
              <p className={`mt-2 text-[13px] ${TONE_TEXT[tone]}`}>
                {remainingText(budget, ratio)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenActions(budget)}
              aria-label={`Acciones del presupuesto de ${name}`}
              className="grid size-10 shrink-0 place-items-center rounded-control text-text-2 hover:bg-sunken hover:text-text"
            >
              <EllipsisVertical className="size-5" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
