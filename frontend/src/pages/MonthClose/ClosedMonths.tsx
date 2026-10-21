import { Lock } from 'lucide-react';
import { Link } from 'react-router';
import { useMonthlyBalances } from '../../api/monthClose';
import { useMovementsOfMonths } from '../../api/movements';
import { Amount } from '../../components/Amount';
import { EmptyState } from '../../components/EmptyState';
import { LoadError, Skeleton } from '../../components/Skeleton';
import { formatEur, monthLabel } from '../../lib/format';
import { type ClosedMonthFigures, closedMonthFigures, MONTHS_SHOWN } from './helpers';

function distributedLabel(figures: ClosedMonthFigures): string {
  if (figures.distributed > 0) return formatEur(figures.distributed);
  if (figures.returned > 0) return `devuelto ${formatEur(figures.returned)}`;
  return 'nada';
}

const HEAD = 'px-4 py-3 text-right font-medium';
const CELL = 'px-4 py-3 text-right';

/** "Meses cerrados": a table from 960px, stacked cards below. */
export function ClosedMonths({
  figures,
  highlight,
}: {
  figures: ClosedMonthFigures[];
  highlight?: string;
}) {
  return (
    <>
      <ul className="overflow-hidden rounded-card border border-line bg-surface lg:hidden">
        {figures.map((row) => (
          <li key={row.month} className="border-b border-line p-4 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <Link to={`/cierre/${row.month}`} className="font-semibold">
                {monthLabel(row.month)}
              </Link>
              <Amount value={row.result} signed className="text-[17px]" />
            </div>
            <div className="mt-1 flex justify-between text-[13px] text-text-2">
              <span>
                Ingresos <Amount value={row.income} signed className="text-[13px]" />
              </span>
              <span>
                Gastos <Amount value={row.expenses} signed className="text-[13px]" />
              </span>
            </div>
            <p className="mt-1 text-[13px] text-text-2">
              Repartido <span className="font-mono tabular-nums">{distributedLabel(row)}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-card border border-line bg-surface lg:block">
        <table className="w-full text-[14px]">
          <thead className="border-b border-line text-[13px] text-text-2">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mes</th>
              <th className={HEAD}>Ingresos</th>
              <th className={HEAD}>Gastos</th>
              <th className={HEAD}>Resultado</th>
              <th className={HEAD}>Repartido</th>
            </tr>
          </thead>
          <tbody>
            {figures.map((row) => (
              <tr
                key={row.month}
                className={`border-b border-line last:border-b-0 ${
                  row.month === highlight ? 'bg-positive/10' : ''
                }`}
              >
                <td className="px-4 py-3 font-semibold">
                  <Link to={`/cierre/${row.month}`}>{monthLabel(row.month)}</Link>
                </td>
                <td className={CELL}>
                  <Amount value={row.income} signed />
                </td>
                <td className={CELL}>
                  <Amount value={row.expenses} signed />
                </td>
                <td className={CELL}>
                  <Amount value={row.result} signed className="font-semibold" />
                </td>
                <td className={`${CELL} font-mono text-text-2 tabular-nums`}>
                  {distributedLabel(row)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** "Meses cerrados" with its own loading, empty and error states; `highlight` marks one month. */
export function ClosedMonthsSection({ highlight }: { highlight?: string }) {
  const balances = useMonthlyBalances();
  const closedMonths = [
    ...new Set((balances.data ?? []).map((balance) => balance.period_month.slice(0, 7))),
  ]
    .sort()
    .reverse()
    .slice(0, MONTHS_SHOWN);
  const history = useMovementsOfMonths(closedMonths);

  let body;
  if (balances.isError) {
    body = <LoadError what="los meses cerrados" />;
  } else if (balances.isPending) {
    body = <Skeleton className="h-40" />;
  } else if (closedMonths.length === 0) {
    body = (
      <EmptyState
        icon={Lock}
        title="Aún no has cerrado ningún mes"
        description="Cuando cierres el primero, aquí verás su resultado y el de los siguientes."
      />
    );
  } else if (history.isError) {
    body = <LoadError what="los meses cerrados" />;
  } else if (history.isPending) {
    body = <Skeleton className="h-40" />;
  } else {
    body = (
      <ClosedMonths
        highlight={highlight}
        figures={closedMonths.map((month) =>
          closedMonthFigures(month, history.byMonth.get(month) ?? []),
        )}
      />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[17px] font-semibold">Meses cerrados</h2>
      {body}
    </section>
  );
}
