import type { Account } from '../../api/accounts';
import type { Category } from '../../api/categories';
import type { MovementTemplate } from '../../api/templates';
import { Dialog } from '../../components/Dialog';
import { TemplateForm } from './TemplateForm';

type TemplateDialogProps = {
  /** The template being edited; omitted to create one. */
  template?: MovementTemplate;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
};

/** The template form in a modal: the way to create on mobile and to edit anywhere. */
export function TemplateDialog({ template, accounts, categories, onClose }: TemplateDialogProps) {
  return (
    <Dialog title={template ? 'Editar plantilla' : 'Nueva plantilla'} onClose={onClose}>
      <TemplateForm
        template={template}
        accounts={accounts}
        categories={categories}
        layout="dialog"
        onDone={onClose}
      />
    </Dialog>
  );
}
