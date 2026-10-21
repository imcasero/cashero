import { Link } from 'react-router';
import { useBudgets } from '../../api/budgets';
import { useCategories } from '../../api/categories';
import { Amount } from '../../components/Amount';
import { Card } from '../../components/Card';
import { CategoryDot } from '../../components/CategoryDot';
import { ProgressBar } from '../../components/ProgressBar';
import { LoadError, Skeleton } from '../../components/Skeleton';
import { formatEur } from '../../lib/format';

/** From here on a budget is "close to the limit" (the design only warns when action is needed). */
const WARNING_RATIO = 0.85;

export function BudgetsCard({ month }: { month: string }) {
  const budgets = useBudgets(month);
  const categories = useCategories();

  let body;
  if (budgets.isError || categories.isError) {
    body = <LoadError what="los presupuestos" />;
  } else if (budgets.isPending || categories.isPending) {
    body = <Skeleton className="mt-4 h-40" />;
  } else if (budgets.data.length === 0) {
    body = <p className="mt-4 text-text-2">Todavía no tienes presupuestos.</p>;
  } else {
    const categoryById = new Map(categories.data.map((category) => [category.id, category]));
    const rows = budgets.data
      .map((budget) => ({ budget, ratio: budget.spent / budget.monthly_limit }))
      .sort((a, b) => b.ratio - a.ratio);

    body = (
      <ul className="mt-4 space-y-4">
        {rows.map(({ budget, ratio }) => {
          const category = categoryById.get(budget.category_id);
          const name = category?.name ?? 'Sin categoría';
          const tone = ratio >= 1 ? 'over' : ratio >= WARNING_RATIO ? 'warning' : 'ok';

          return (
            <li key={budget.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <CategoryDot color={category?.color} />
                  <span className="truncate">{name}</span>
                </span>
                <span
                  className={`font-mono text-[14px] whitespace-nowrap ${
                    tone === 'over'
                      ? 'text-negative'
                      : tone === 'warning'
                        ? 'text-warning'
                        : 'text-text-2'
                  }`}
                >
                  {tone === 'over'
                    ? `superado ${formatEur(-budget.remaining)}`
                    : `quedan ${formatEur(budget.remaining)}`}
                </span>
              </div>
              <ProgressBar ratio={ratio} tone={tone} label={`Presupuesto de ${name}`} />
            </li>
          );
        })}
      </ul>
    );
  }

  const limit = budgets.data?.reduce((sum, budget) => sum + budget.monthly_limit, 0) ?? 0;
  const remaining = budgets.data?.reduce((sum, budget) => sum + budget.remaining, 0) ?? 0;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Presupuestos</h2>
        {budgets.data && budgets.data.length > 0 && (
          <span className="text-right font-mono text-[13px] text-text-2">
            <Amount value={remaining} tone="neutral" className="font-normal" /> libres de{' '}
            <Amount value={limit} tone="neutral" className="font-normal" />
          </span>
        )}
      </div>
      {body}
      <Link to="/presupuestos" className="mt-5 inline-block font-semibold text-accent underline">
        Ver presupuestos
      </Link>
    </Card>
  );
}
