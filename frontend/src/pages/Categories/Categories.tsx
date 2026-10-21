import { Plus, Tag } from 'lucide-react';
import { useState } from 'react';
import { useBudgets } from '../../api/budgets';
import { type Category, useCategories } from '../../api/categories';
import { useMovements } from '../../api/movements';
import { useTemplates } from '../../api/templates';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { ApiError } from '../../lib/api';
import { currentMonthKey } from '../../lib/format';
import { CategoryDialog } from './CategoryDialog';
import { CategoryForm } from './CategoryForm';
import { CategoryGroup } from './CategoryRows';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import type { CategoryUsage } from './usage';

function Categories() {
  const month = currentMonthKey();
  const categories = useCategories();
  // The usage lines are a nicety: if these fail the list still works, just without them.
  const templates = useTemplates();
  const budgets = useBudgets(month);
  const movements = useMovements(month);

  // `new` opens the create dialog; a category opens its edit dialog.
  const [dialog, setDialog] = useState<Category | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  // Bumped after a create so the side panel starts again from a blank form.
  const [panelKey, setPanelKey] = useState(0);

  const all = categories.data ?? [];

  function usageOf(category: Category): CategoryUsage {
    return {
      templates: templates.data?.filter((t) => t.category_id === category.id).length ?? 0,
      movements: movements.data
        ? movements.data.filter((m) => m.category_id === category.id).length
        : null,
      limit: budgets.data?.find((b) => b.category_id === category.id)?.monthly_limit ?? null,
    };
  }

  let content;
  if (categories.isError) {
    const offline = categories.error instanceof ApiError && categories.error.status === 0;
    content = (
      <Notice
        tone={offline ? 'offline' : 'negative'}
        action={
          <Button
            variant="secondary"
            className="h-10 px-4"
            onClick={() => void categories.refetch()}
          >
            {offline ? 'Reintentar ahora' : 'Reintentar'}
          </Button>
        }
      >
        {offline
          ? 'Sin conexión con el servidor. No se guardará nada hasta que vuelva.'
          : 'No se pudieron cargar las categorías.'}
      </Notice>
    );
  } else if (categories.isPending) {
    content = <Skeleton className="h-96" />;
  } else if (all.length === 0) {
    content = (
      <EmptyState
        icon={Tag}
        title="Sin categorías todavía"
        description="Crea al menos una de gasto y una de ingreso para empezar a registrar movimientos."
        action={<Button onClick={() => setDialog('new')}>Crear categoría</Button>}
      />
    );
  } else {
    content = (
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <CategoryGroup
          title="Gasto"
          emptyText="Aún no hay categorías de gasto."
          categories={all.filter((category) => category.kind === 'expense')}
          usageOf={usageOf}
          onEdit={setDialog}
          onDelete={setToDelete}
        />
        <CategoryGroup
          title="Ingreso"
          emptyText="Aún no hay categorías de ingreso."
          categories={all.filter((category) => category.kind === 'income')}
          usageOf={usageOf}
          onEdit={setDialog}
          onDelete={setToDelete}
        />
      </div>
    );
  }

  const count = all.length;
  const title = categories.data
    ? `${count} ${count === 1 ? 'categoría' : 'categorías'}`
    : 'Categorías';
  const ready = !categories.isError && !categories.isPending;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Categorías" title={title} />

      {ready && count > 0 && (
        <Button block onClick={() => setDialog('new')} className="lg:hidden">
          <Plus className="size-5" aria-hidden="true" />
          Nueva categoría
        </Button>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <div>{content}</div>

        {ready && (
          <Card className="hidden lg:sticky lg:top-8 lg:block">
            <h2 className="mb-4 text-[17px] font-semibold">Nueva categoría</h2>
            <CategoryForm
              key={panelKey}
              categories={all}
              layout="panel"
              onDone={() => setPanelKey((key) => key + 1)}
            />
          </Card>
        )}
      </div>

      {dialog && (
        <CategoryDialog
          category={dialog === 'new' ? undefined : dialog}
          categories={all}
          onClose={() => setDialog(null)}
        />
      )}
      {toDelete && (
        <DeleteCategoryDialog
          category={toDelete}
          hasBudget={budgets.data?.some((b) => b.category_id === toDelete.id) ?? false}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

export default Categories;
