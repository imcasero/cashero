import { type Account, useDeleteAccount } from '../../api/accounts';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ApiError } from '../../lib/api';

type DeleteAccountDialogProps = {
  account: Account;
  onClose: () => void;
};

export function DeleteAccountDialog({ account, onClose }: DeleteAccountDialogProps) {
  const remove = useDeleteAccount();

  let error: string | null = null;
  if (remove.isError) {
    // The API answers 500 when the database refuses: movements and templates keep their account.
    error =
      remove.error instanceof ApiError && remove.error.status === 0
        ? 'Sin conexión con el servidor. No se ha borrado nada.'
        : 'No se pudo borrar la cuenta. Si tiene movimientos o plantillas, bórralos o pásalos a otra cuenta antes.';
  }

  const primaryWarning = account.is_primary
    ? ' Es la cuenta principal: el cierre de mes no funcionará hasta que marques otra.'
    : '';

  return (
    <ConfirmDialog
      title="¿Borrar esta cuenta?"
      description={`Se borrará «${account.name}», junto con su reparto del sobrante y el historial de saldos de cierre. Solo se puede borrar si no tiene movimientos ni plantillas.${primaryWarning}`}
      confirmLabel="Borrar cuenta"
      pending={remove.isPending}
      error={error}
      onConfirm={() => remove.mutate(account.id, { onSuccess: onClose })}
      onClose={onClose}
    />
  );
}
