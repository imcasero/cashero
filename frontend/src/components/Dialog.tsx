import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

type DialogProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * A modal on the native <dialog>, so focus trapping and Esc come from the browser.
 * It is a bottom sheet on mobile and a 560px dialog from 960px up. The parent mounts it
 * only while it is open.
 */
export function Dialog({ title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        // Let React unmount it instead of the browser closing it behind our back.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> itself, not on its content.
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 mt-auto w-full max-w-full overflow-hidden rounded-t-sheet border border-line bg-surface p-0 text-text backdrop:bg-black/60 lg:m-auto lg:max-w-[560px] lg:rounded-sheet"
    >
      <div className="flex max-h-[92svh] flex-col">
        <header className="relative flex h-14 shrink-0 items-center justify-center px-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute left-2 grid size-12 place-items-center rounded-control text-text-2 hover:text-text"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <h2 className="text-[17px] font-semibold">{title}</h2>
        </header>
        {children}
      </div>
    </dialog>
  );
}
