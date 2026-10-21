import { Pencil, Trash2 } from 'lucide-react';
import type { Movement } from '../../api/movements';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { formatEur } from '../../lib/format';

type MovementActionSheetProps = {
  movement: Movement;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

/** The mobile "⋮" menu: what can be done with one movement. */
export function MovementActionSheet({
  movement,
  onEdit,
  onDelete,
  onClose,
}: MovementActionSheetProps) {
  return (
    <Dialog title={movement.description || formatEur(movement.amount)} onClose={onClose}>
      <div className="flex flex-col gap-3 px-5 pb-5">
        <Button variant="secondary" block onClick={onEdit}>
          <Pencil className="size-4" aria-hidden="true" />
          Editar
        </Button>
        <Button variant="danger" block onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden="true" />
          Borrar
        </Button>
      </div>
    </Dialog>
  );
}
