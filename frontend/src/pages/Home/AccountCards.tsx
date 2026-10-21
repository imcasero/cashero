import { Link } from 'react-router';
import { type Account, useAccountBalances, useAccounts } from '../../api/accounts';
import { Amount } from '../../components/Amount';
import { Badge } from '../../components/Badge';
import { LoadError, Skeleton } from '../../components/Skeleton';
import { formatPercent } from '../../lib/format';

function interestLabel(account: Account): string {
  if (account.interest_type && account.interest_rate !== null) {
    const kind = account.interest_type === 'compound' ? 'compuesto' : 'simple';
    return `${formatPercent(account.interest_rate)} % ${kind}`;
  }
  return `${account.type} · sin interés`;
}

export function AccountCards() {
  const accounts = useAccounts();
  const balances = useAccountBalances(accounts.data);

  let body;
  if (accounts.isError || balances.isError) {
    body = <LoadError what="las cuentas" />;
  } else if (accounts.isPending || balances.isPending) {
    body = <Skeleton className="h-28" />;
  } else {
    body = (
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {accounts.data.map((account) => (
          <li
            key={account.id}
            className={`min-w-[210px] shrink-0 snap-start rounded-card border bg-surface p-4 lg:min-w-0 ${
              account.is_primary ? 'border-accent' : 'border-line'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{account.name}</p>
              {account.is_primary && <Badge tone="accent">Principal</Badge>}
            </div>
            <Amount
              value={balances.balances.get(account.id) ?? 0}
              tone="neutral"
              className="mt-2 block text-[21px]"
            />
            <p className="mt-1 text-[13px] text-text-3">{interestLabel(account)}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">Cuentas</h2>
        <Link to="/cuentas" className="font-semibold text-accent">
          Gestionar
        </Link>
      </div>
      {body}
    </section>
  );
}
