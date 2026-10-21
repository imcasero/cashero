import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { signedAmount, useMovements } from '../../api/movements';
import { projectedTemplatesNet, useActiveTemplates } from '../../api/templates';
import { Amount } from '../../components/Amount';
import { Card } from '../../components/Card';
import { LoadError, Skeleton } from '../../components/Skeleton';
import { monthName } from '../../lib/format';

export function MonthResult({ month }: { month: string }) {
  const movements = useMovements(month);
  const templates = useActiveTemplates();
  const name = monthName(month);
  // Frozen at mount: the "del 1 al N" caption doesn't need to tick over while the page is open.
  const [today] = useState(() => new Date().getDate());

  let body;
  if (movements.isError) {
    body = <LoadError what="el resultado" />;
  } else if (movements.isPending) {
    body = <Skeleton className="h-28" />;
  } else {
    // Transfers move money between accounts without changing the total, so they don't count.
    const flows = movements.data.filter((movement) => movement.kind !== 'transfer');
    const income = flows
      .filter((movement) => movement.kind === 'income')
      .reduce((sum, movement) => sum + signedAmount(movement), 0);
    const expenses = flows
      .filter((movement) => movement.kind === 'expense')
      .reduce((sum, movement) => sum + signedAmount(movement), 0);
    const result = income + expenses;
    const pending = templates.data ? projectedTemplatesNet(templates.data, month) : 0;

    body = (
      <>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between">
            <dt className="text-text-2">Ingresos</dt>
            <dd>
              <Amount value={income} signed />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-2">Gastos</dt>
            <dd>
              <Amount value={expenses} signed />
            </dd>
          </div>
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <p className="font-semibold">
            {result < 0 ? 'Déficit hasta hoy' : 'Superávit hasta hoy'}
          </p>
          <Amount value={result} signed className="text-[21px]" />
        </div>
        {pending !== 0 && (
          <p className="mt-4 flex gap-3 text-[13px] text-text-2">
            <RefreshCw className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
            <span>
              Con los recurrentes de {name} (<Amount value={pending} signed />) cerrarías en{' '}
              <Amount value={result + pending} signed />.
            </span>
          </p>
        )}
      </>
    );
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">Resultado de {name}</h2>
        <span className="text-[13px] text-text-3">del 1 al {today}</span>
      </div>
      {body}
    </Card>
  );
}
