import { type Movement, useDeleteMovement } from '../../api/movements';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ApiError } from '../../lib/api';
import { formatEur, formatShortDay } from '../../lib/format';

type DeleteMovementDialogProps = {
  movement: Movement;
  onClose: () => void;
};

export function DeleteMovementDialog({ movement, onClose }: DeleteMovementDialogProps) {
  const remove = useDeleteMovement();

  const name = movement.description || 'este movimiento';
  let error: string | null = null;
  if (remove.isError) {
    error =
      remove.error instanceof ApiError && remove.error.status === 0
        ? 'Sin conexión con el servidor. No se ha borrado nada.'
        : 'No se pudo borrar el movimiento. Inténtalo de nuevo.';
  }

  return (
    <ConfirmDialog
      title="¿Borrar este movimiento?"
      description={`Se borrará «${name}» del ${formatShortDay(movement.occurred_on)} por ${formatEur(movement.amount)}. Los saldos y presupuestos se recalculan.`}
      confirmLabel="Borrar movimiento"
      pending={remove.isPending}
      error={error}
      onConfirm={() => remove.mutate(movement.id, { onSuccess: onClose })}
      onClose={onClose}
    />
  );
}
