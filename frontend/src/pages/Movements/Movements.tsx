import { ArrowDownUp, Landmark, Plus, Tag } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAccounts } from '../../api/accounts';
import { useCategories } from '../../api/categories';
import { type Movement, signedAmount, useMovements } from '../../api/movements';
import { Amount } from '../../components/Amount';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Select } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { ApiError } from '../../lib/api';
import { currentMonthKey, monthLabel, monthName, recentMonths } from '../../lib/format';
import { DeleteMovementDialog } from './DeleteMovementDialog';
import { MovementActionSheet } from './MovementActionSheet';
import { useMovementDialog } from './MovementDialogContext';
import { MovementRows, MovementTable } from './MovementList';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTHS_LISTED = 12;

function Movements() {
  const [params, setParams] = useSearchParams();
  const { openNew, openEdit } = useMovementDialog();

  // Filters live in the URL so a link (e.g. "Ver movimientos") can open a filtered view.
  const requestedMonth = params.get('mes') ?? '';
  const month = MONTH_PATTERN.test(requestedMonth) ? requestedMonth : currentMonthKey();
  const accountId = params.get('cuenta') ?? '';
  const categoryId = params.get('categoria') ?? '';
  const hasFilters = Boolean(accountId || categoryId);

  const accounts = useAccounts();
  const categories = useCategories();
  const movements = useMovements(month, { accountId, categoryId });

  // The row whose "⋮" sheet is open (mobile) and the one waiting for delete confirmation.
  const [sheetFor, setSheetFor] = useState<Movement | null>(null);
  const [toDelete, setToDelete] = useState<Movement | null>(null);

  function setFilters(changes: Partial<Record<'mes' | 'cuenta' | 'categoria', string>>) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }

  const monthOptions = recentMonths(currentMonthKey(), MONTHS_LISTED);
  if (!monthOptions.includes(month)) monthOptions.push(month);

  let content;
  if (accounts.isError || categories.isError || movements.isError) {
    const offline = [accounts.error, categories.error, movements.error].some(
      (error) => error instanceof ApiError && error.status === 0,
    );
    const retry = () => {
      void accounts.refetch();
      void categories.refetch();
      void movements.refetch();
    };
    content = (
      <Notice
        tone={offline ? 'offline' : 'negative'}
        action={
          <Button variant="secondary" className="h-10 px-4" onClick={retry}>
            {offline ? 'Reintentar ahora' : 'Reintentar'}
          </Button>
        }
      >
        {offline
          ? 'Sin conexión con el servidor. No se guardará nada hasta que vuelva.'
          : 'No se pudieron cargar los movimientos.'}
      </Notice>
    );
  } else if (accounts.isPending || categories.isPending || movements.isPending) {
    content = <Skeleton className="h-96" />;
  } else if (accounts.data.length === 0) {
    content = (
      <EmptyState
        icon={Landmark}
        title="Aún no tienes cuentas"
        description="La primera que crees será la principal: ahí queda el dinero que no repartes."
        action={
          <Link
            to="/cuentas"
            className="inline-flex h-12 items-center rounded-control bg-accent px-5 font-semibold text-on-accent"
          >
            Crear cuenta principal
          </Link>
        }
      />
    );
  } else if (categories.data.length === 0) {
    content = (
      <EmptyState
        icon={Tag}
        title="Antes, una categoría"
        description="Los gastos e ingresos necesitan categoría. Las transferencias no, pero requieren dos cuentas."
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
  } else if (movements.data.length === 0) {
    content = hasFilters ? (
      <EmptyState
        icon={ArrowDownUp}
        title="Ningún movimiento con estos filtros"
        description={`No hay movimientos en ${monthName(month)} con la cuenta y la categoría elegidas.`}
        action={
          <Button variant="secondary" onClick={() => setFilters({ cuenta: '', categoria: '' })}>
            Quitar filtros
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={ArrowDownUp}
        title={`Ningún movimiento en ${monthName(month)}`}
        description="Registra tu primer gasto, ingreso o transferencia del mes."
        action={<Button onClick={openNew}>Añadir movimiento</Button>}
      />
    );
  } else {
    const sorted = [...movements.data].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
    const categoryById = new Map(categories.data.map((category) => [category.id, category]));
    const accountById = new Map(accounts.data.map((account) => [account.id, account]));

    // Transfers move money between accounts, so they are neither income nor expense.
    const income = sorted
      .filter((movement) => movement.kind === 'income')
      .reduce((total, movement) => total + movement.amount, 0);
    const expenses = sorted
      .filter((movement) => movement.kind === 'expense')
      .reduce((total, movement) => total + signedAmount(movement), 0);

    const rowProps = { categoryById, accountById, onEdit: openEdit, onDelete: setToDelete };

    content = (
      <>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-text-2">
          <span>
            <strong className="font-semibold text-text">{sorted.length}</strong>{' '}
            {sorted.length === 1 ? 'movimiento' : 'movimientos'}
          </span>
          <span>
            Ingresos <Amount value={income} signed />
          </span>
          <span>
            Gastos <Amount value={expenses} />
          </span>
        </p>
        <MovementRows {...rowProps} movements={sorted} onOpenActions={setSheetFor} />
        <MovementTable {...rowProps} movements={sorted} />
        <p className="text-[14px] text-text-2">
          Las transferencias no cuentan como ingreso ni gasto.
        </p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Movimientos"
        title={monthLabel(month)}
        action={
          <Button onClick={openNew} className="hidden lg:inline-flex">
            <Plus className="size-5" aria-hidden="true" />
            Añadir movimiento
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-2">
          Mes
          <Select value={month} onChange={(event) => setFilters({ mes: event.target.value })}>
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                {monthLabel(option)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-2">
          Cuenta
          <Select
            value={accountId}
            onChange={(event) => setFilters({ cuenta: event.target.value })}
          >
            <option value="">Todas</option>
            {accounts.data?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-2">
          Categoría
          <Select
            value={categoryId}
            onChange={(event) => setFilters({ categoria: event.target.value })}
          >
            <option value="">Todas</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {content}

      {sheetFor && (
        <MovementActionSheet
          movement={sheetFor}
          onClose={() => setSheetFor(null)}
          onEdit={() => {
            openEdit(sheetFor);
            setSheetFor(null);
          }}
          onDelete={() => {
            setToDelete(sheetFor);
            setSheetFor(null);
          }}
        />
      )}
      {toDelete && <DeleteMovementDialog movement={toDelete} onClose={() => setToDelete(null)} />}
    </div>
  );
}

export default Movements;
