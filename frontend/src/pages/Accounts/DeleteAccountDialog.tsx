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
    // The API answers 409 when movements or templates still reference the account.
    const status = remove.error instanceof ApiError ? remove.error.status : null;
    if (status === 0) error = 'Sin conexión con el servidor. No se ha borrado nada.';
    else if (status === 409)
      error = 'La cuenta tiene movimientos o plantillas. Bórralos o pásalos a otra cuenta antes.';
    else error = 'No se pudo borrar la cuenta. Inténtalo de nuevo.';
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
