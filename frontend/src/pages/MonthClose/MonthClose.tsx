import { Lock, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAccounts } from '../../api/accounts';
import { useCategories } from '../../api/categories';
import { useCloseMonth, useMonthlyBalances } from '../../api/monthClose';
import { useMovements } from '../../api/movements';
import { useSurplusRules } from '../../api/surplusRules';
import { useActiveTemplates } from '../../api/templates';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Field, Select } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { LoadError, Skeleton } from '../../components/Skeleton';
import { ApiError } from '../../lib/api';
import {
  currentMonthKey,
  monthLabel,
  monthName,
  previousMonthKey,
  recentMonths,
} from '../../lib/format';
import { ClosedMonthsSection } from './ClosedMonths';
import { CloseMonthDialog } from './CloseMonthDialog';
import { ClosePreview } from './ClosePreview';
import { MONTHS_SHOWN } from './helpers';
import { buildClosePreview } from './preview';

const LINK_BUTTON =
  'inline-flex h-12 items-center rounded-control border border-line px-5 font-semibold hover:bg-sunken';

function MonthClose() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const balances = useMonthlyBalances();
  const accounts = useAccounts();
  const templates = useActiveTemplates();
  const rules = useSurplusRules();
  const categories = useCategories();
  const close = useCloseMonth();

  const [confirming, setConfirming] = useState(false);
  // The month a close was refused for because it was already closed (another tab or session).
  const [conflict, setConflict] = useState<string | null>(null);

  const previousMonth = previousMonthKey(currentMonthKey());
  const closedMonths = [
    ...new Set((balances.data ?? []).map((balance) => balance.period_month.slice(0, 7))),
  ]
    .sort()
    .reverse();
  const closedSet = new Set(closedMonths);

  // Newest first, so the default is the previous month when it is still open.
  const candidates = recentMonths(previousMonth, MONTHS_SHOWN).filter(
    (month) => !closedSet.has(month),
  );
  const requested = params.get('mes') ?? '';
  const selected = candidates.includes(requested) ? requested : candidates[0];

  const monthMovements = useMovements(selected ?? previousMonth);
  const categoryById = new Map((categories.data ?? []).map((category) => [category.id, category]));

  const failed = [balances, accounts, templates, rules, categories].some((query) => query.isError);
  const balanceList = balances.data;
  const accountList = accounts.data;
  const templateList = templates.data;
  const ruleList = rules.data;
  const loading = !balanceList || !accountList || !templateList || !ruleList || !categories.data;

  let panel;
  if (failed) {
    const offline = [balances, accounts, templates, rules, categories].some(
      (query) => query.error instanceof ApiError && query.error.status === 0,
    );
    panel = (
      <Notice
        tone={offline ? 'offline' : 'negative'}
        action={
          <Button
            variant="secondary"
            className="h-10 px-4"
            onClick={() => {
              for (const query of [balances, accounts, templates, rules, categories]) {
                if (query.isError) void query.refetch();
              }
            }}
          >
            {offline ? 'Reintentar ahora' : 'Reintentar'}
          </Button>
        }
      >
        {offline
          ? 'Sin conexión con el servidor. No se cerrará nada hasta que vuelva.'
          : 'No se pudo cargar el cierre de mes.'}
      </Notice>
    );
  } else if (loading) {
    panel = <Skeleton className="h-72" />;
  } else if (accountList.length === 0) {
    panel = (
      <EmptyState
        icon={Lock}
        title="Aún no tienes cuentas"
        description="El cierre reparte el sobrante desde la cuenta principal. Crea primero tu cuenta principal."
        action={
          <Link to="/cuentas" className={LINK_BUTTON}>
            Crear cuenta principal
          </Link>
        }
      />
    );
  } else if (!accountList.some((account) => account.is_primary)) {
    panel = (
      <Card className="flex gap-4">
        <TriangleAlert className="mt-0.5 size-6 shrink-0 text-warning" aria-hidden="true" />
        <div className="flex flex-col items-start gap-3">
          <h2 className="text-[17px] font-semibold">No se puede cerrar sin una cuenta principal</h2>
          <p className="text-text-2">
            El cierre necesita saber dónde dejar el dinero que no se reparte. Marca una de tus
            cuentas como principal y vuelve a intentarlo.
          </p>
          <Link to="/cuentas" className={LINK_BUTTON}>
            Marcar cuenta principal
          </Link>
        </div>
      </Card>
    );
  } else if (selected === undefined) {
    panel = (
      <Card className="text-text-2">
        No hay meses pendientes: los últimos {MONTHS_SHOWN} meses ya están cerrados.
      </Card>
    );
  } else {
    const previousClosing = new Map(
      balanceList
        .filter((balance) => balance.period_month.slice(0, 7) === previousMonthKey(selected))
        .map((balance) => [balance.account_id, balance.closing_balance]),
    );
    const preview = monthMovements.data
      ? buildClosePreview({
          month: selected,
          movements: monthMovements.data,
          templates: templateList,
          accounts: accountList,
          rules: ruleList,
          previousClosing,
        })
      : null;

    let closeError: string | null = null;
    if (close.isError) {
      const status = close.error instanceof ApiError ? close.error.status : null;
      if (status === 0) closeError = 'Sin conexión con el servidor. No se ha cerrado nada.';
      else if (status === 422)
        closeError = 'Falta la cuenta principal: márcala e inténtalo de nuevo.';
      else closeError = 'No se pudo cerrar el mes. No se ha cambiado nada: inténtalo de nuevo.';
    }

    panel = (
      <Card className="p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-10 lg:p-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-[17px] font-semibold">Mes a cerrar</h2>
          <Field label="Mes">
            <Select
              value={selected}
              onChange={(event) => setParams({ mes: event.target.value }, { replace: true })}
            >
              {candidates.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)} · sin cerrar
                </option>
              ))}
            </Select>
          </Field>
          <Button
            block
            disabled={preview === null}
            onClick={() => {
              close.reset();
              setConfirming(true);
            }}
          >
            <Lock className="size-4" aria-hidden="true" />
            Cerrar {monthName(selected)}
          </Button>
        </div>

        <div className="mt-6 lg:mt-0">
          {monthMovements.isError ? (
            <LoadError what="los movimientos del mes" />
          ) : preview ? (
            <ClosePreview month={selected} preview={preview} categories={categoryById} />
          ) : (
            <Skeleton className="h-56" />
          )}
        </div>

        {confirming && preview && (
          <CloseMonthDialog
            month={selected}
            preview={preview}
            categories={categoryById}
            pending={close.isPending}
            error={closeError}
            onClose={() => setConfirming(false)}
            onConfirm={() =>
              close.mutate(selected, {
                onSuccess: (result) =>
                  navigate(`/cierre/${result.month}`, {
                    state: { result, closedAt: Date.now() },
                  }),
                onError: (error) => {
                  if (error instanceof ApiError && error.status === 409) {
                    setConfirming(false);
                    setConflict(selected);
                  }
                },
              })
            }
          />
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Cierre de mes" title="Cerrar un mes" />
      <p className="-mt-3 max-w-2xl text-[15px] text-text-2">
        Cerrar consolida el mes: genera sus recurrentes, aplica intereses y reparte el sobrante.
        Después no se puede reabrir.
      </p>

      {conflict && (
        <Card className="flex gap-4">
          <Lock className="mt-0.5 size-6 shrink-0 text-negative" aria-hidden="true" />
          <div className="flex flex-col items-start gap-3">
            <h2 className="text-[17px] font-semibold">{monthLabel(conflict)} ya está cerrado</h2>
            <p className="text-text-2">
              Se cerró desde otra pestaña o sesión. No se ha vuelto a ejecutar nada: no hay
              movimientos ni transferencias duplicados.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/cierre/${conflict}`}
                className="inline-flex h-12 items-center rounded-control bg-accent px-5 font-semibold text-on-accent"
              >
                Ver el resultado
              </Link>
              <Button variant="secondary" onClick={() => setConflict(null)}>
                Elegir otro mes
              </Button>
            </div>
          </div>
        </Card>
      )}

      {panel}

      <ClosedMonthsSection />
    </div>
  );
}

export default MonthClose;
