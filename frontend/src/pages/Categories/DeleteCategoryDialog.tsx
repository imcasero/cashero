import { type Category, useDeleteCategory } from '../../api/categories';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ApiError } from '../../lib/api';

type DeleteCategoryDialogProps = {
  category: Category;
  /** Whether the category has a budget, which goes away with it. */
  hasBudget: boolean;
  onClose: () => void;
};

export function DeleteCategoryDialog({ category, hasBudget, onClose }: DeleteCategoryDialogProps) {
  const remove = useDeleteCategory();

  let error: string | null = null;
  if (remove.isError) {
    // The API answers 409 when movements or templates still use the category.
    const status = remove.error instanceof ApiError ? remove.error.status : null;
    if (status === 0) error = 'Sin conexión con el servidor. No se ha borrado nada.';
    else if (status === 409)
      error =
        'La categoría tiene movimientos o plantillas. Bórralos o pásalos a otra categoría antes.';
    else error = 'No se pudo borrar la categoría. Inténtalo de nuevo.';
  }

  const budgetNote = hasBudget ? ' Su presupuesto se borrará con ella.' : '';

  return (
    <ConfirmDialog
      title="¿Borrar esta categoría?"
      description={`Se borrará «${category.name}». Solo se puede borrar si no tiene movimientos ni plantillas.${budgetNote}`}
      confirmLabel="Borrar categoría"
      pending={remove.isPending}
      error={error}
      onConfirm={() => remove.mutate(category.id, { onSuccess: onClose })}
      onClose={onClose}
    />
  );
}
