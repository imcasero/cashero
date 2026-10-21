import { ChartPie, ChevronLeft, ChevronRight, Plus, Tag } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { type BudgetStatus, useBudgets } from '../../api/budgets';
import { useCategories } from '../../api/categories';
import { Amount } from '../../components/Amount';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { ApiError } from '../../lib/api';
import { currentMonthKey, monthLabel, nextMonthKey, previousMonthKey } from '../../lib/format';
import { BudgetActionSheet } from './BudgetActionSheet';
import { BudgetDialog } from './BudgetDialog';
import { BudgetForm } from './BudgetForm';
import { BudgetRows } from './BudgetRows';
import { DeleteBudgetDialog } from './DeleteBudgetDialog';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function MonthStepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-12 place-items-center rounded-control border border-line text-text hover:bg-sunken"
    >
      {children}
    </button>
  );
}

function Budgets() {
  const [params, setParams] = useSearchParams();

  // The month lives in the URL, like in Movimientos, so a link can open a given month.
  const requestedMonth = params.get('mes') ?? '';
  const month = MONTH_PATTERN.test(requestedMonth) ? requestedMonth : currentMonthKey();

  const budgets = useBudgets(month);
  const categories = useCategories();

  // `new` opens the create dialog; a budget opens its edit dialog.
  const [dialog, setDialog] = useState<BudgetStatus | 'new' | null>(null);
  // The row whose "⋮" sheet is open and the one waiting for delete confirmation.
  const [sheetFor, setSheetFor] = useState<BudgetStatus | null>(null);
  const [toDelete, setToDelete] = useState<BudgetStatus | null>(null);
  // Bumped after a create so the side panel starts again from a blank form.
  const [panelKey, setPanelKey] = useState(0);

  function goToMonth(target: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('mes', target);
        return next;
      },
      { replace: true },
    );
  }

  const categoryById = new Map((categories.data ?? []).map((category) => [category.id, category]));
  const nameOf = (budget: BudgetStatus) =>
    categoryById.get(budget.category_id)?.name ?? 'Sin categoría';

  const expenseCategories = (categories.data ?? []).filter(
    (category) => category.kind === 'expense',
  );
  const budgeted = new Set((budgets.data ?? []).map((budget) => budget.category_id));
  // A category admits one budget, so only the ones without it can be picked.
  const available = expenseCategories.filter((category) => !budgeted.has(category.id));

  const failed = budgets.isError || categories.isError;
  const loading = budgets.isPending || categories.isPending;
  const canCreate = !failed && !loading && available.length > 0;

  let content;
  if (failed) {
    const offline = [budgets.error, categories.error].some(
      (error) => error instanceof ApiError && error.status === 0,
    );
    content = (
      <Notice
        tone={offline ? 'offline' : 'negative'}
        action={
          <Button
            variant="secondary"
            className="h-10 px-4"
            onClick={() => {
              void budgets.refetch();
              void categories.refetch();
            }}
          >
            {offline ? 'Reintentar ahora' : 'Reintentar'}
          </Button>
        }
      >
        {offline
          ? 'Sin conexión con el servidor. No se guardará nada hasta que vuelva.'
          : 'No se pudieron cargar los presupuestos.'}
      </Notice>
    );
  } else if (loading) {
    content = <Skeleton className="h-96" />;
  } else if (expenseCategories.length === 0) {
    content = (
      <EmptyState
        icon={Tag}
        title="Antes, una categoría de gasto"
        description="Un presupuesto es el límite mensual de una categoría de gasto. Crea la primera para poder fijarlo."
        action={
          <Link
            to="/categorias"
            className="inline-flex h-12 items-center rounded-control border border-line px-5 font-semibold"
          >
            Ir a categorías
          </Link>
        }
      />
    );
  } else if (budgets.data.length === 0) {
    content = (
      <EmptyState
        icon={ChartPie}
        title="Sin presupuestos"
        description="Pon un límite mensual a una categoría de gasto y verás cuánto te queda cada mes."
        action={<Button onClick={() => setDialog('new')}>Crear presupuesto</Button>}
      />
    );
  } else {
    content = (
      <Card>
        <BudgetRows
          budgets={budgets.data}
          categoryById={categoryById}
          onOpenActions={setSheetFor}
        />
        <p className="mt-4 border-t border-line pt-4 text-[14px] text-text-2">
          Los límites se repiten cada mes y el contador vuelve a cero el día 1.
        </p>
      </Card>
    );
  }

  const limit = budgets.data?.reduce((sum, budget) => sum + budget.monthly_limit, 0) ?? 0;
  const spent = budgets.data?.reduce((sum, budget) => sum + budget.spent, 0) ?? 0;
  const showSummary = !failed && !loading && budgets.data.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Presupuestos"
        title={monthLabel(month)}
        action={
          <div className="flex gap-2">
            <MonthStepButton
              label="Mes anterior"
              onClick={() => goToMonth(previousMonthKey(month))}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </MonthStepButton>
            <MonthStepButton label="Mes siguiente" onClick={() => goToMonth(nextMonthKey(month))}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </MonthStepButton>
          </div>
        }
      />

      {showSummary && (
        <Card className="grid grid-cols-3 divide-x divide-line p-0">
          <div className="px-4 py-4 lg:px-5">
            <p className="text-[13px] text-text-2">Límite</p>
            <Amount
              value={limit}
              tone="neutral"
              className="mt-1 block text-[18px] lg:text-[21px]"
            />
          </div>
          <div className="px-4 py-4 lg:px-5">
            <p className="text-[13px] text-text-2">Gastado</p>
            <Amount
              value={spent}
              tone="neutral"
              className="mt-1 block text-[18px] lg:text-[21px]"
            />
          </div>
          <div className="px-4 py-4 lg:px-5">
            <p className="text-[13px] text-text-2">Restante</p>
            <Amount value={limit - spent} className="mt-1 block text-[18px] lg:text-[21px]" />
          </div>
        </Card>
      )}

      {canCreate && (
        <Button block onClick={() => setDialog('new')} className="lg:hidden">
          <Plus className="size-5" aria-hidden="true" />
          Nuevo presupuesto
        </Button>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <div>{content}</div>

        {!failed && !loading && expenseCategories.length > 0 && (
          <Card className="hidden lg:sticky lg:top-8 lg:block">
            <h2 className="mb-4 text-[17px] font-semibold">Nuevo presupuesto</h2>
            {available.length > 0 ? (
              <BudgetForm
                key={panelKey}
                available={available}
                layout="panel"
                onDone={() => setPanelKey((key) => key + 1)}
              />
            ) : (
              <p className="text-[14px] text-text-2">
                Todas tus categorías de gasto ya tienen presupuesto. Edita un límite desde el menú
                de su fila.
              </p>
            )}
          </Card>
        )}
      </div>

      {sheetFor && (
        <BudgetActionSheet
          categoryName={nameOf(sheetFor)}
          onClose={() => setSheetFor(null)}
          onEdit={() => {
            setDialog(sheetFor);
            setSheetFor(null);
          }}
          onDelete={() => {
            setToDelete(sheetFor);
            setSheetFor(null);
          }}
        />
      )}
      {dialog && (
        <BudgetDialog
          budget={dialog === 'new' ? undefined : dialog}
          categoryName={dialog === 'new' ? undefined : nameOf(dialog)}
          available={available}
          onClose={() => setDialog(null)}
        />
      )}
      {toDelete && (
        <DeleteBudgetDialog
          budget={toDelete}
          categoryName={nameOf(toDelete)}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

export default Budgets;
