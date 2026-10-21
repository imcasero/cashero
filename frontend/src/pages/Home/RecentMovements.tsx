import { Link } from 'react-router';
import { useAccounts } from '../../api/accounts';
import { useCategories } from '../../api/categories';
import {
  type Movement,
  type MovementOrigin,
  signedAmount,
  useMovements,
} from '../../api/movements';
import { Amount } from '../../components/Amount';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { CategoryDot } from '../../components/CategoryDot';
import { LoadError, Skeleton } from '../../components/Skeleton';
import { formatShortDay } from '../../lib/format';

const RECENT_COUNT = 7;

const ORIGIN_LABEL: Record<MovementOrigin, string> = {
  manual: 'manual',
  recurring: 'recurrente',
  month_close_surplus: 'cierre',
  month_close_deficit: 'cierre',
};

function sortNewestFirst(a: Movement, b: Movement): number {
  return b.occurred_on.localeCompare(a.occurred_on);
}

export function RecentMovements({ month }: { month: string }) {
  const movements = useMovements(month);
  const categories = useCategories();
  const accounts = useAccounts();

  let body;
  if (movements.isError || categories.isError || accounts.isError) {
    body = <LoadError what="los movimientos" />;
  } else if (movements.isPending || categories.isPending || accounts.isPending) {
    body = <Skeleton className="mt-4 h-60" />;
  } else if (movements.data.length === 0) {
    body = <p className="mt-4 text-text-2">Aún no hay movimientos este mes.</p>;
  } else {
    const categoryById = new Map(categories.data.map((category) => [category.id, category]));
    const accountById = new Map(accounts.data.map((account) => [account.id, account]));
    const recent = [...movements.data].sort(sortNewestFirst).slice(0, RECENT_COUNT);

    body = (
      <ul className="mt-2 -mx-5">
        {recent.map((movement) => {
          const isTransfer = movement.kind === 'transfer';
          const category = movement.category_id
            ? categoryById.get(movement.category_id)
            : undefined;
          const from = accountById.get(movement.account_id)?.name ?? '';
          const to = movement.counterparty_account_id
            ? (accountById.get(movement.counterparty_account_id)?.name ?? '')
            : '';
          const detail = isTransfer ? `${from} → ${to}` : (category?.name ?? 'Sin categoría');

          return (
            <li
              key={movement.id}
              className="flex items-start justify-between gap-3 border-t border-line px-5 py-3 first:border-t-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{movement.description || detail}</p>
                <p className="mt-1 flex items-center gap-2 text-[13px] text-text-2">
                  <CategoryDot color={isTransfer ? null : category?.color} />
                  <span className="truncate">
                    {formatShortDay(movement.occurred_on)} · {detail}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Amount
                  value={signedAmount(movement)}
                  tone={isTransfer ? 'neutral' : 'auto'}
                  signed={!isTransfer}
                />
                <Badge tone={ORIGIN_LABEL[movement.origin] === 'cierre' ? 'close' : 'neutral'}>
                  {ORIGIN_LABEL[movement.origin]}
                </Badge>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">Últimos movimientos</h2>
        <Link to="/movimientos" className="font-semibold text-accent">
          Ver todos
        </Link>
      </div>
      {body}
    </Card>
  );
}
