import type { BudgetStatus } from '../../api/budgets';
import type { Category } from '../../api/categories';
import { Dialog } from '../../components/Dialog';
import { BudgetForm } from './BudgetForm';

type BudgetDialogProps = {
  /** The budget being edited; omitted to create one. */
  budget?: BudgetStatus;
  categoryName?: string;
  available: Category[];
  onClose: () => void;
};

/** The budget form in a modal: the only way to create on mobile and to edit anywhere. */
export function BudgetDialog({ budget, categoryName, available, onClose }: BudgetDialogProps) {
  return (
    <Dialog title={budget ? 'Editar presupuesto' : 'Nuevo presupuesto'} onClose={onClose}>
      <BudgetForm
        budget={budget}
        categoryName={categoryName}
        available={available}
        layout="dialog"
        onDone={onClose}
      />
    </Dialog>
  );
}
