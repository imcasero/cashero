import { type BudgetStatus, useDeleteBudget } from '../../api/budgets';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ApiError } from '../../lib/api';

type DeleteBudgetDialogProps = {
  budget: BudgetStatus;
  categoryName: string;
  onClose: () => void;
};

export function DeleteBudgetDialog({ budget, categoryName, onClose }: DeleteBudgetDialogProps) {
  const remove = useDeleteBudget();

  let error: string | null = null;
  if (remove.isError) {
    error =
      remove.error instanceof ApiError && remove.error.status === 0
        ? 'Sin conexión con el servidor. No se ha borrado nada.'
        : 'No se pudo borrar el presupuesto. Inténtalo de nuevo.';
  }

  return (
    <ConfirmDialog
      title="¿Borrar este presupuesto?"
      description={`Se borrará el límite de «${categoryName}» en todos los meses. Los movimientos no cambian.`}
      confirmLabel="Borrar presupuesto"
      pending={remove.isPending}
      error={error}
      onConfirm={() => remove.mutate(budget.id, { onSuccess: onClose })}
      onClose={onClose}
    />
  );
}
