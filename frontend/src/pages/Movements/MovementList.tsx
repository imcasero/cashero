import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import type { Account } from '../../api/accounts';
import type { Category } from '../../api/categories';
import { type Movement, type MovementOrigin, signedAmount } from '../../api/movements';
import { Amount } from '../../components/Amount';
import { Badge } from '../../components/Badge';
import { CategoryDot } from '../../components/CategoryDot';
import { formatShortDay } from '../../lib/format';

const ORIGIN_LABEL: Record<MovementOrigin, string> = {
  manual: 'manual',
  recurring: 'recurrente',
  month_close_surplus: 'cierre',
  month_close_deficit: 'cierre',
};

type RowData = {
  categoryById: Map<string, Category>;
  accountById: Map<string, Account>;
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
};

/** What a row shows for a movement: its labels, resolved from the ids. */
function describe(movement: Movement, { categoryById, accountById }: RowData) {
  const isTransfer = movement.kind === 'transfer';
  const category = movement.category_id ? categoryById.get(movement.category_id) : undefined;
  const from = accountById.get(movement.account_id)?.name ?? '';
  const to = movement.counterparty_account_id
    ? (accountById.get(movement.counterparty_account_id)?.name ?? '')
    : '';

  return {
    isTransfer,
    categoryName: isTransfer ? 'Transferencia' : (category?.name ?? 'Sin categoría'),
    color: isTransfer ? null : category?.color,
    accountName: isTransfer ? `${from} → ${to}` : from,
  };
}

function OriginBadge({ origin }: { origin: MovementOrigin }) {
  return (
    <Badge tone={ORIGIN_LABEL[origin] === 'cierre' ? 'close' : 'neutral'}>
      {ORIGIN_LABEL[origin]}
    </Badge>
  );
}

function MovementAmount({ movement }: { movement: Movement }) {
  const isTransfer = movement.kind === 'transfer';
  return (
    <Amount
      value={signedAmount(movement)}
      tone={isTransfer ? 'neutral' : 'auto'}
      signed={!isTransfer}
    />
  );
}

type RowsProps = RowData & {
  movements: Movement[];
  onOpenActions: (movement: Movement) => void;
};

/** The mobile list: two lines per movement and a "⋮" that opens its actions. */
export function MovementRows({ movements, onOpenActions, ...data }: RowsProps) {
  return (
    <ul className="overflow-hidden rounded-card border border-line bg-surface lg:hidden">
      {movements.map((movement) => {
        const { isTransfer, categoryName, color, accountName } = describe(movement, data);
        const label = movement.description || categoryName;
        return (
          <li
            key={movement.id}
            className="flex items-center gap-1 border-t border-line py-3 pr-1 pl-4 first:border-t-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{label}</p>
              <p className="mt-1 flex items-center gap-2 text-[13px] text-text-2">
                <CategoryDot color={color} />
                <span className="truncate">
                  {formatShortDay(movement.occurred_on)} · {isTransfer ? accountName : categoryName}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <MovementAmount movement={movement} />
              <OriginBadge origin={movement.origin} />
            </div>
            <button
              type="button"
              onClick={() => onOpenActions(movement)}
              aria-label={`Acciones de ${label}`}
              className="grid size-11 shrink-0 place-items-center rounded-control text-text-2"
            >
              <EllipsisVertical className="size-5" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The desktop table, with edit and delete on each row. */
export function MovementTable({ movements, ...data }: RowData & { movements: Movement[] }) {
  return (
    <div className="hidden overflow-hidden rounded-card border border-line bg-surface lg:block">
      <table className="w-full text-left text-[14px]">
        <thead className="text-[13px] font-medium text-text-2">
          <tr className="border-b border-line">
            <th className="px-5 py-3 font-medium">Fecha</th>
            <th className="py-3 font-medium">Descripción</th>
            <th className="py-3 font-medium">Categoría</th>
            <th className="py-3 font-medium">Cuenta</th>
            <th className="py-3 font-medium">Origen</th>
            <th className="py-3 text-right font-medium">Importe</th>
            <th className="w-24 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => {
            const { categoryName, color, accountName } = describe(movement, data);
            const label = movement.description || categoryName;
            return (
              <tr key={movement.id} className="border-t border-line first:border-t-0">
                <td className="px-5 py-3.5 whitespace-nowrap text-text-2">
                  {formatShortDay(movement.occurred_on)}
                </td>
                <td className="py-3.5 pr-4 font-medium">{label}</td>
                <td className="py-3.5 pr-4">
                  <span className="flex items-center gap-2 text-text-2">
                    <CategoryDot color={color} />
                    {categoryName}
                  </span>
                </td>
                <td className="py-3.5 pr-4 text-text-2">{accountName}</td>
                <td className="py-3.5 pr-4">
                  <OriginBadge origin={movement.origin} />
                </td>
                <td className="py-3.5 text-right">
                  <MovementAmount movement={movement} />
                </td>
                <td className="py-1">
                  <div className="flex justify-end pr-3">
                    <button
                      type="button"
                      onClick={() => data.onEdit(movement)}
                      aria-label={`Editar ${label}`}
                      className="grid size-11 place-items-center rounded-control text-text-2 hover:text-text"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => data.onDelete(movement)}
                      aria-label={`Borrar ${label}`}
                      className="grid size-11 place-items-center rounded-control text-text-2 hover:text-negative"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
