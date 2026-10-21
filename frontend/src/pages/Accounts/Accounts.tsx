import { Landmark, Plus } from 'lucide-react';
import { useState } from 'react';
import { type Account, useAccountBalances, useAccounts } from '../../api/accounts';
import { useMonthlyBalances } from '../../api/monthClose';
import { Amount } from '../../components/Amount';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { ApiError } from '../../lib/api';
import { monthName } from '../../lib/format';
import { AccountCard } from './AccountCard';
import { AccountDialog } from './AccountDialog';
import { AccountForm } from './AccountForm';
import { DeleteAccountDialog } from './DeleteAccountDialog';

function Accounts() {
  const accounts = useAccounts();
  const balances = useAccountBalances(accounts.data);
  const closes = useMonthlyBalances();

  // `new` opens the create dialog; an account opens its edit dialog.
  const [dialog, setDialog] = useState<Account | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);
  // Bumped after a create so the side panel starts again from a blank form.
  const [panelKey, setPanelKey] = useState(0);

  // The interest line shows what each account earned in the latest closed month.
  const lastClosedMonth = (closes.data ?? [])
    .map((balance) => balance.period_month.slice(0, 7))
    .sort()
    .at(-1);
  const interestLabel = lastClosedMonth
    ? `Interés de ${monthName(lastClosedMonth)}`
    : 'Interés del último cierre';
  const interestByAccount = new Map(
    (closes.data ?? [])
      .filter((balance) => balance.period_month.slice(0, 7) === lastClosedMonth)
      .map((balance) => [balance.account_id, balance.interest_accrued]),
  );

  const failed = accounts.isError || balances.isError;
  const loading = accounts.isPending || balances.isPending;

  let total: number | null = null;
  if (accounts.data && !failed && !loading) {
    total = accounts.data.reduce(
      (sum, account) => sum + (balances.balances.get(account.id) ?? 0),
      0,
    );
  }

  let title: React.ReactNode = 'Cuentas';
  if (accounts.data && total !== null) {
    const count = accounts.data.length;
    title = (
      <>
        {count} {count === 1 ? 'cuenta' : 'cuentas'} ·{' '}
        <Amount value={total} tone="neutral" className="text-[26px] lg:text-[30px]" />
      </>
    );
  }

  let content;
  if (failed) {
    const offline = [accounts.error, closes.error].some(
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
              void accounts.refetch();
            }}
          >
            {offline ? 'Reintentar ahora' : 'Reintentar'}
          </Button>
        }
      >
        {offline
          ? 'Sin conexión con el servidor. No se guardará nada hasta que vuelva.'
          : 'No se pudieron cargar las cuentas.'}
      </Notice>
    );
  } else if (loading) {
    content = <Skeleton className="h-96" />;
  } else if (accounts.data.length === 0) {
    content = (
      <EmptyState
        icon={Landmark}
        title="Aún no tienes cuentas"
        description="La primera que crees será la principal: ahí queda el dinero que no repartes."
        action={<Button onClick={() => setDialog('new')}>Crear cuenta principal</Button>}
      />
    );
  } else {
    content = (
      <ul className="flex flex-col gap-3">
        {accounts.data.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            balance={balances.balances.get(account.id) ?? 0}
            interestLabel={interestLabel}
            interestEarned={
              account.interest_type ? (interestByAccount.get(account.id) ?? null) : null
            }
            onEdit={() => setDialog(account)}
            onDelete={() => setToDelete(account)}
          />
        ))}
      </ul>
    );
  }

  // The form needs the account list to know which one is primary, so it waits for it.
  const canCreate = Boolean(accounts.data) && !failed;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Cuentas" title={title} />

      {canCreate && (
        <Button block onClick={() => setDialog('new')} className="lg:hidden">
          <Plus className="size-5" aria-hidden="true" />
          Nueva cuenta
        </Button>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <div>{content}</div>

        {canCreate && accounts.data && (
          <Card className="hidden lg:sticky lg:top-8 lg:block">
            <h2 className="mb-4 text-[17px] font-semibold">Nueva cuenta</h2>
            <AccountForm
              key={panelKey}
              accounts={accounts.data}
              layout="panel"
              onDone={() => setPanelKey((key) => key + 1)}
            />
          </Card>
        )}
      </div>

      {dialog && accounts.data && (
        <AccountDialog
          account={dialog === 'new' ? undefined : dialog}
          accounts={accounts.data}
          onClose={() => setDialog(null)}
        />
      )}
      {toDelete && <DeleteAccountDialog account={toDelete} onClose={() => setToDelete(null)} />}
    </div>
  );
}

export default Accounts;
