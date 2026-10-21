import { useAccountBalances, useAccounts } from '../../api/accounts';
import { Amount } from '../../components/Amount';
import { LoadError, Skeleton } from '../../components/Skeleton';

export function TotalBalance() {
  const accounts = useAccounts();
  const balances = useAccountBalances(accounts.data);

  if (accounts.isError || balances.isError) return <LoadError what="el saldo" />;
  if (accounts.isPending || balances.isPending) return <Skeleton className="h-24 w-64" />;

  const total = [...balances.balances.values()].reduce((sum, balance) => sum + balance, 0);
  const count = accounts.data.length;

  return (
    <div>
      <p className="font-medium text-text-2">Saldo total</p>
      <Amount value={total} tone="neutral" className="mt-1 block text-[40px] leading-tight" />
      <p className="mt-1 text-text-3">
        Suma de {count === 1 ? 'tu cuenta' : `tus ${count} cuentas`}
      </p>
    </div>
  );
}
