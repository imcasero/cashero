import type { Category } from '../../api/categories';
import { Dialog } from '../../components/Dialog';
import { CategoryForm } from './CategoryForm';

type CategoryDialogProps = {
  /** The category being edited; omitted to create one. */
  category?: Category;
  categories: Category[];
  onClose: () => void;
};

/** The category form in a modal: the only way to create on mobile and to edit anywhere. */
export function CategoryDialog({ category, categories, onClose }: CategoryDialogProps) {
  return (
    <Dialog title={category ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      <CategoryForm category={category} categories={categories} layout="dialog" onDone={onClose} />
    </Dialog>
  );
}
