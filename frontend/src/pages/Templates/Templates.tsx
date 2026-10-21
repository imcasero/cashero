import { Landmark, Plus, RefreshCw, Tag } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAccounts } from '../../api/accounts';
import { useCategories } from '../../api/categories';
import { useMonthStatus } from '../../api/monthClose';
import { type MovementTemplate, useTemplates, useToggleTemplate } from '../../api/templates';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { ApiError } from '../../lib/api';
import { monthName } from '../../lib/format';
import { DeleteTemplateDialog } from './DeleteTemplateDialog';
import { TemplateDialog } from './TemplateDialog';
import { TemplateForm } from './TemplateForm';
import { TemplateCards, TemplateTable } from './TemplateList';

const LINK_CLASS =
  'inline-flex h-12 items-center rounded-control border border-line px-5 font-semibold';

function Templates() {
  const templates = useTemplates();
  const accounts = useAccounts();
  const categories = useCategories();
  const { currentMonth, pendingMonth } = useMonthStatus();
  const toggle = useToggleTemplate();

  // `new` opens the create dialog; a template opens its edit dialog.
  const [dialog, setDialog] = useState<MovementTemplate | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<{ template: MovementTemplate; label: string } | null>(
    null,
  );
  // Bumped after a create so the desktop form starts again from a blank one.
  const [panelKey, setPanelKey] = useState(0);

  const categoryById = new Map((categories.data ?? []).map((category) => [category.id, category]));
  const accountById = new Map((accounts.data ?? []).map((account) => [account.id, account]));

  const failed = templates.isError || accounts.isError || categories.isError;
  const loading = templates.isPending || accounts.isPending || categories.isPending;
  const canCreate = !failed && !loading && accounts.data.length > 0 && categories.data.length > 0;

  // Active templates first, as in the design; each group keeps the API's next-run order.
  const sorted = [...(templates.data ?? [])].sort(
    (a, b) => Number(b.is_active) - Number(a.is_active),
  );

  let content;
  if (failed) {
    const offline = [templates.error, accounts.error, categories.error].some(
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
              void templates.refetch();
              void accounts.refetch();
              void categories.refetch();
            }}
          >
            {offline ? 'Reintentar ahora' : 'Reintentar'}
          </Button>
        }
      >
        {offline
          ? 'Sin conexión con el servidor. No se guardará nada hasta que vuelva.'
          : 'No se pudieron cargar las plantillas.'}
      </Notice>
    );
  } else if (loading) {
    content = <Skeleton className="h-96" />;
  } else if (accounts.data.length === 0) {
    content = (
      <EmptyState
        icon={Landmark}
        title="Antes, una cuenta"
        description="Cada plantilla genera sus cobros en una cuenta. Crea la primera para poder usarlas."
        action={
          <Link to="/cuentas" className={LINK_CLASS}>
            Ir a cuentas
          </Link>
        }
      />
    );
  } else if (categories.data.length === 0) {
    content = (
      <EmptyState
        icon={Tag}
        title="Antes, una categoría"
        description="Cada plantilla lleva la categoría de sus cobros. Crea al menos una de gasto o de ingreso."
        action={
          <Link to="/categorias" className={LINK_CLASS}>
            Ir a categorías
          </Link>
        }
      />
    );
  } else if (sorted.length === 0) {
    content = (
      <EmptyState
        icon={RefreshCw}
        title="Sin plantillas recurrentes"
        description="Alquiler, nómina, suscripciones: créalas una vez y se generarán al cerrar cada mes."
        action={<Button onClick={() => setDialog('new')}>Crear plantilla</Button>}
      />
    );
  } else {
    const list = {
      templates: sorted,
      categoryById,
      accountById,
      currentMonth,
      togglingId: toggle.isPending ? toggle.variables.id : null,
      onToggle: (template: MovementTemplate, isActive: boolean) =>
        toggle.mutate({ id: template.id, isActive }),
      onEdit: setDialog,
      onDelete: (template: MovementTemplate, label: string) => setToDelete({ template, label }),
    };
    content = (
      <div className="flex flex-col gap-3">
        {toggle.isError && (
          <Notice
            tone={
              toggle.error instanceof ApiError && toggle.error.status === 0 ? 'offline' : 'negative'
            }
          >
            {toggle.error instanceof ApiError && toggle.error.status === 0
              ? 'Sin conexión con el servidor. No se ha cambiado el estado.'
              : 'No se pudo cambiar el estado de la plantilla. Inténtalo de nuevo.'}
          </Notice>
        )}
        <TemplateCards {...list} />
        <TemplateTable {...list} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Recurrentes" title="Plantillas periódicas" />

      <div className="flex gap-3 rounded-card bg-info-soft p-4 text-[14px] lg:max-w-[calc(100%-2rem)]">
        <RefreshCw className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
        <p>
          Las plantillas no crean movimientos solas. Al cerrar un mes se generan todos sus cobros,
          con origen «recurrente».
          {pendingMonth &&
            ` ${monthName(pendingMonth).replace(/^./, (letter) => letter.toUpperCase())} sigue sin cerrar, por eso sus cobros están pendientes.`}
        </p>
      </div>

      {canCreate && (
        <Button block onClick={() => setDialog('new')} className="lg:hidden">
          <Plus className="size-5" aria-hidden="true" />
          Nueva plantilla
        </Button>
      )}

      {content}

      {canCreate && (
        <Card className="hidden lg:block">
          <TemplateForm
            key={panelKey}
            accounts={accounts.data}
            categories={categories.data}
            layout="panel"
            onDone={() => setPanelKey((key) => key + 1)}
          />
        </Card>
      )}

      {dialog && accounts.data && categories.data && (
        <TemplateDialog
          template={dialog === 'new' ? undefined : dialog}
          accounts={accounts.data}
          categories={categories.data}
          onClose={() => setDialog(null)}
        />
      )}
      {toDelete && (
        <DeleteTemplateDialog
          template={toDelete.template}
          label={toDelete.label}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

export default Templates;
