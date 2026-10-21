import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';

type BudgetActionSheetProps = {
  categoryName: string;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

/** The "⋮" menu of a budget row: what can be done with it. */
export function BudgetActionSheet({
  categoryName,
  onEdit,
  onDelete,
  onClose,
}: BudgetActionSheetProps) {
  return (
    <Dialog title={categoryName} onClose={onClose}>
      <div className="flex flex-col gap-3 px-5 pb-5">
        <Button variant="secondary" block onClick={onEdit}>
          <Pencil className="size-4" aria-hidden="true" />
          Editar límite
        </Button>
        <Button variant="danger" block onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden="true" />
          Borrar
        </Button>
      </div>
    </Dialog>
  );
}
