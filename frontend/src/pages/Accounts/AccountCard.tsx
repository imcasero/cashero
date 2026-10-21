import type { ReactNode } from 'react';
import { type Account, useMakePrimary } from '../../api/accounts';
import { Amount } from '../../components/Amount';
import { Badge } from '../../components/Badge';
import { Notice } from '../../components/Notice';
import { ApiError } from '../../lib/api';
import { formatEur, formatPercent } from '../../lib/format';

const ACTION =
  'inline-flex h-11 items-center justify-center rounded-control border border-line px-4 font-semibold hover:bg-sunken disabled:cursor-not-allowed disabled:text-text-3';

function interestText(account: Account): string {
  if (account.interest_type && account.interest_rate !== null) {
    const kind = account.interest_type === 'compound' ? 'compuesto' : 'simple';
    return `${formatPercent(account.interest_rate)} % · ${kind}`;
  }
  return 'Sin interés';
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-text-2">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

type AccountCardProps = {
  account: Account;
  balance: number;
  /** `Interés de agosto`, or null before the first close. */
  interestLabel: string;
  /** What the account earned in that month; null when it earns nothing or has no close yet. */
  interestEarned: number | null;
  onEdit: () => void;
  onDelete: () => void;
};

export function AccountCard({
  account,
  balance,
  interestLabel,
  interestEarned,
  onEdit,
  onDelete,
}: AccountCardProps) {
  const makePrimary = useMakePrimary();

  return (
    <li
      className={`rounded-card border bg-surface p-5 ${account.is_primary ? 'border-accent' : 'border-line'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-[17px] font-semibold">{account.name}</h2>
            {account.is_primary && <Badge tone="accent">Principal</Badge>}
          </div>
          <p className="text-text-2">{account.type}</p>
        </div>
        <Amount value={balance} tone="neutral" className="text-[21px] lg:text-[26px]" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-3">
        <Detail label="Saldo inicial">
          <span className="font-mono text-[15px] tabular-nums">
            {formatEur(account.initial_balance)}
          </span>
        </Detail>
        <Detail label="Interés">{interestText(account)}</Detail>
        <Detail label={interestLabel}>
          {interestEarned === null ? (
            <span className="text-text-3">—</span>
          ) : (
            <Amount value={interestEarned} signed className="text-[15px]" />
          )}
        </Detail>
      </dl>

      {makePrimary.isError && (
        <div className="mt-4">
          <Notice tone="negative">
            {makePrimary.error instanceof ApiError && makePrimary.error.status === 0
              ? 'Sin conexión con el servidor. No se ha cambiado nada.'
              : 'No se pudo cambiar la cuenta principal. Inténtalo de nuevo.'}
          </Notice>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button type="button" onClick={onEdit} className={ACTION}>
          Editar
        </button>
        {!account.is_primary && (
          <button
            type="button"
            disabled={makePrimary.isPending}
            onClick={() => makePrimary.mutate(account.id)}
            className={ACTION}
          >
            {makePrimary.isPending ? 'Cambiando...' : 'Hacer principal'}
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto h-11 px-3 font-semibold text-negative"
        >
          Borrar
        </button>
      </div>
    </li>
  );
}
