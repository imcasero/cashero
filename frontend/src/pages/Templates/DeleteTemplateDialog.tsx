import { type MovementTemplate, useDeleteTemplate } from '../../api/templates';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ApiError } from '../../lib/api';

type DeleteTemplateDialogProps = {
  template: MovementTemplate;
  /** What the list shows for the template: its description or, failing that, its category. */
  label: string;
  onClose: () => void;
};

export function DeleteTemplateDialog({ template, label, onClose }: DeleteTemplateDialogProps) {
  const remove = useDeleteTemplate();

  let error: string | null = null;
  if (remove.isError) {
    error =
      remove.error instanceof ApiError && remove.error.status === 0
        ? 'Sin conexión con el servidor. No se ha borrado nada.'
        : 'No se pudo borrar la plantilla. Inténtalo de nuevo.';
  }

  return (
    <ConfirmDialog
      title="¿Borrar esta plantilla?"
      description={`Se borrará «${label}» y no se generarán más cobros. Los movimientos que ya creó se conservan.`}
      confirmLabel="Borrar plantilla"
      pending={remove.isPending}
      error={error}
      onConfirm={() => remove.mutate(template.id, { onSuccess: onClose })}
      onClose={onClose}
    />
  );
}
