import { CircleCheck } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { useAccounts } from '../../api/accounts';
import { type Category, useCategories } from '../../api/categories';
import { type MonthCloseResult, useMonthlyBalances } from '../../api/monthClose';
import { type Movement, signedAmount, useMovements } from '../../api/movements';
import { useTemplates } from '../../api/templates';
import { Amount } from '../../components/Amount';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { CategoryDot } from '../../components/CategoryDot';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { ApiError } from '../../lib/api';
import { formatDayWithYear, formatShare, formatShortDay, monthLabel } from '../../lib/format';
import { ClosedMonthsSection } from './ClosedMonths';
import { templateLabel } from './helpers';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const BUTTON = 'inline-flex h-12 items-center rounded-control px-5 font-semibold';

/** Handed over by the close screen through the router, so the result shows what just happened. */
type LocationState = { result?: MonthCloseResult; closedAt?: number } | null;

const round2 = (value: number) => Math.round(value * 100) / 100;

function movementLabel(movement: Movement, categories: Map<string, Category>): string {
  return (
    movement.description ??
    (movement.category_id ? categories.get(movement.category_id)?.name : undefined) ??
    'Movimiento'
  );
}

function SubCard({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        {aside && <span className="text-[13px] text-text-3">{aside}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

/** What a closed month did. Right after a close it shows the API's answer; later it is rebuilt. */
function CloseResult() {
  const { month = '' } = useParams();
  const state = useLocation().state as LocationState;
  const fresh = state?.result?.month === month ? state.result : null;
  const closedAt = fresh ? state?.closedAt : undefined;
  const valid = MONTH_PATTERN.test(month);

  const balances = useMonthlyBalances();
  const accounts = useAccounts();
  const categories = useCategories();
  const templates = useTemplates();
  const movements = useMovements(valid ? month : '2000-01');

  if (!valid) {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Mes no válido"
        description="Ese mes no existe."
        action={
          <Link to="/cierre" className={`${BUTTON} border border-line`}>
            Volver al cierre
          </Link>
        }
      />
    );
  }

  const failed = [balances, accounts, categories, templates, movements].some((q) => q.isError);
  const balanceList = balances.data;
  const accountList = accounts.data;
  const categoryList = categories.data;
  const templateList = templates.data;
  const stored = movements.data;
  const loading = !balanceList || !accountList || !categoryList || !templateList || !stored;

  let content;
  if (failed) {
    const offline = [balances, accounts, categories, templates, movements].some(
      (q) => q.error instanceof ApiError && q.error.status === 0,
    );
    content = (
      <Notice tone={offline ? 'offline' : 'negative'}>
        {offline ? 'Sin conexión con el servidor.' : 'No se pudo cargar el resultado del cierre.'}
      </Notice>
    );
  } else if (loading) {
    content = <Skeleton className="h-96" />;
  } else {
    const snapshots = balanceList.filter((balance) => balance.period_month.slice(0, 7) === month);

    if (snapshots.length === 0 && !fresh) {
      content = (
        <EmptyState
          icon={CircleCheck}
          title={`${monthLabel(month)} aún no está cerrado`}
          description="Cuando lo cierres, aquí verás qué generó y a dónde fue el sobrante."
          action={
            <Link to={`/cierre?mes=${month}`} className={`${BUTTON} bg-accent text-on-accent`}>
              Ir al cierre
            </Link>
          }
        />
      );
    } else {
      const categoryById = new Map(categoryList.map((category) => [category.id, category]));
      const accountById = new Map(accountList.map((account) => [account.id, account]));

      const income = stored
        .filter((movement) => movement.kind === 'income')
        .reduce((sum, movement) => sum + movement.amount, 0);
      const expenses = stored
        .filter((movement) => movement.kind === 'expense')
        .reduce((sum, movement) => sum - movement.amount, 0);
      const surplus = fresh ? fresh.surplus : round2(income + expenses);

      // The origin tells the close's own movements apart from the ones typed by hand.
      const recurring = fresh
        ? fresh.generated_recurring
        : stored.filter((movement) => movement.origin === 'recurring');
      const transfers = fresh
        ? fresh.transfers
        : stored.filter((movement) => movement.origin.startsWith('month_close'));
      const moved = round2(transfers.reduce((sum, transfer) => sum + transfer.amount, 0));
      const primary = accountList.find((account) => account.is_primary);

      const rows = accountList.flatMap((account) => {
        const snapshot = snapshots.find((balance) => balance.account_id === account.id);
        return snapshot ? [{ account, snapshot }] : [];
      });
      const total = round2(rows.reduce((sum, row) => sum + row.snapshot.closing_balance, 0));

      // Only the answer to the close itself knows which templates it paused.
      const ended = (fresh?.deactivated_templates ?? []).flatMap((id) => {
        const template = templateList.find((candidate) => candidate.id === id);
        if (!template) return [];
        const lastDay = fresh?.generated_recurring
          .filter((movement) => movement.template_id === id)
          .map((movement) => movement.occurred_on)
          .sort()
          .at(-1);
        return [{ template, lastDay }];
      });

      const deficit = surplus < 0;
      const accountName = (id: string) => accountById.get(id)?.name ?? 'Cuenta';

      content = (
        <>
          <Card className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[13px] text-text-2">
                {deficit ? 'Déficit' : 'Sobrante'} de{' '}
                {monthLabel(month).split(' de ')[0].toLowerCase()}
              </p>
              <Amount value={surplus} signed className="text-[40px] leading-tight" />
            </div>
            <dl className="flex gap-6 text-[13px] text-text-2">
              <div>
                <dt>Ingresos</dt>
                <dd>
                  <Amount value={income} signed className="text-[15px]" />
                </dd>
              </div>
              <div>
                <dt>Gastos</dt>
                <dd>
                  <Amount value={expenses} signed className="text-[15px]" />
                </dd>
              </div>
              <div>
                <dt>Movimientos</dt>
                <dd className="font-mono text-[15px] font-medium text-text tabular-nums">
                  {stored.length}
                </dd>
              </div>
            </dl>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <div className="flex flex-col gap-5">
              <SubCard title="Recurrentes generados" aside={recurring.length}>
                {recurring.length === 0 ? (
                  <p className="text-text-2">Este cierre no generó ningún recurrente.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {recurring.map((movement) => (
                      <li key={movement.id} className="flex items-center gap-3 py-2.5">
                        <span className="w-14 shrink-0 text-[13px] text-text-3">
                          {formatShortDay(movement.occurred_on)}
                        </span>
                        <CategoryDot
                          color={
                            movement.category_id
                              ? categoryById.get(movement.category_id)?.color
                              : undefined
                          }
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {movementLabel(movement, categoryById)}
                        </span>
                        <Amount value={signedAmount(movement)} signed />
                      </li>
                    ))}
                  </ul>
                )}
              </SubCard>

              <SubCard title="Saldo de cierre e interés">
                <ul className="divide-y divide-line">
                  {rows.map(({ account, snapshot }) => (
                    <li key={account.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div>
                        <p className="flex items-center gap-2 font-medium">
                          {account.name}
                          {account.is_primary && <Badge tone="accent">Principal</Badge>}
                        </p>
                        <p className="text-[13px] text-text-3">
                          {snapshot.interest_accrued !== 0 ? (
                            <>
                              Interés{' '}
                              <Amount
                                value={snapshot.interest_accrued}
                                signed
                                className="text-[13px]"
                              />
                            </>
                          ) : (
                            'Interés no aplica'
                          )}
                        </p>
                      </div>
                      <Amount value={snapshot.closing_balance} tone="neutral" />
                    </li>
                  ))}
                </ul>
                <div className="mt-1 flex justify-between border-t border-line pt-3 font-semibold">
                  <span>Total</span>
                  <Amount value={total} tone="neutral" />
                </div>
              </SubCard>
            </div>

            <div className="flex flex-col gap-5">
              <SubCard title={deficit ? 'Cobertura del déficit' : 'Reparto del sobrante'}>
                {transfers.length === 0 ? (
                  <p className="text-text-2">
                    {surplus === 0
                      ? 'No hubo nada que repartir.'
                      : 'No se movió dinero entre cuentas.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {transfers.map((transfer) => (
                      <li
                        key={transfer.id}
                        className="flex items-start justify-between gap-3 py-2.5"
                      >
                        <div>
                          <p>
                            {accountName(transfer.account_id)} →{' '}
                            <strong className="font-semibold">
                              {accountName(transfer.counterparty_account_id ?? '')}
                            </strong>
                          </p>
                          <p className="font-mono text-[13px] text-text-3">
                            {formatShare(round2((transfer.amount / Math.abs(surplus)) * 100))} %{' '}
                            {deficit ? 'del déficit' : 'del sobrante'}
                          </p>
                        </div>
                        <Amount value={transfer.amount} tone="neutral" />
                      </li>
                    ))}
                    {primary && (
                      <li className="flex items-start justify-between gap-3 py-2.5">
                        <div>
                          <p>
                            {deficit ? 'Lo asume' : 'Se queda en'} →{' '}
                            <strong className="font-semibold">{primary.name}</strong>
                          </p>
                          <p className="font-mono text-[13px] text-text-3">
                            {formatShare(
                              round2(((Math.abs(surplus) - moved) / Math.abs(surplus)) * 100),
                            )}{' '}
                            % restante
                          </p>
                        </div>
                        <Amount value={round2(Math.abs(surplus) - moved)} tone="neutral" />
                      </li>
                    )}
                  </ul>
                )}
              </SubCard>

              {ended.length > 0 && (
                <SubCard title="Plantillas que terminaron">
                  <ul className="divide-y divide-line">
                    {ended.map(({ template, lastDay }) => (
                      <li
                        key={template.id}
                        className="flex items-start justify-between gap-3 py-2.5"
                      >
                        <div>
                          <p className="font-medium">{templateLabel(template, categoryById)}</p>
                          {lastDay && (
                            <p className="text-[13px] text-text-3">
                              Última cuota el {formatDayWithYear(lastDay)}
                            </p>
                          )}
                        </div>
                        <Amount
                          value={template.kind === 'expense' ? -template.amount : template.amount}
                          signed
                        />
                      </li>
                    ))}
                  </ul>
                  <Link to="/recurrentes" className="mt-3 inline-block text-accent underline">
                    Ver recurrentes
                  </Link>
                </SubCard>
              )}
            </div>
          </div>
        </>
      );
    }
  }

  const closedText = closedAt
    ? `El ${new Date(closedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')} a las ${new Date(closedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. `
    : '';

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Ruta" className="text-[13px] text-text-3">
        <Link to="/cierre" className="underline">
          Cierre de mes
        </Link>{' '}
        / {monthLabel(month)}
      </nav>
      <PageHeader
        eyebrow="Cierre de mes"
        title={
          <span className="flex items-center gap-3">
            <CircleCheck className="size-7 text-positive" aria-hidden="true" />
            {monthLabel(month).split(' de ')[0]}, cerrado
          </span>
        }
        action={
          <div className="hidden gap-3 lg:flex">
            <Link
              to={`/movimientos?mes=${month}`}
              className={`${BUTTON} border border-line hover:bg-sunken`}
            >
              Ver movimientos
            </Link>
            <Link to="/" className={`${BUTTON} bg-accent text-on-accent`}>
              Volver al inicio
            </Link>
          </div>
        }
      />
      <p className="-mt-2 text-[13px] text-text-2">
        {closedText}Lo generado lleva origen «recurrente» o «cierre».
      </p>

      {content}

      <div className="flex flex-col gap-3 lg:hidden">
        <Link
          to={`/movimientos?mes=${month}`}
          className={`${BUTTON} justify-center border border-line`}
        >
          Ver movimientos
        </Link>
        <Link to="/" className={`${BUTTON} justify-center bg-accent text-on-accent`}>
          Volver al inicio
        </Link>
      </div>

      <ClosedMonthsSection highlight={month} />
    </div>
  );
}

export default CloseResult;
