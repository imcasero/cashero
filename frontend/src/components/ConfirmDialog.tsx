import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notice } from './Notice';

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  /** Shown above the buttons when the action failed. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

/** Asks before a destructive action. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="flex flex-col gap-4 px-5 pb-5">
        <p className="text-text-2">{description}</p>
        {error && <Notice tone="negative">{error}</Notice>}
        <div className="flex flex-col gap-3">
          <Button variant="danger" block disabled={pending} onClick={onConfirm}>
            {pending ? 'Borrando...' : confirmLabel}
          </Button>
          <Button variant="secondary" block disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
