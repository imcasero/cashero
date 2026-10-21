import { type ReactNode, useMemo, useState } from 'react';
import type { Movement } from '../../api/movements';
import { MovementDialog } from './MovementDialog';
import { MovementDialogContext } from './MovementDialogContext';

/** Owns the open/closed state of the movement dialog so the "+" buttons can share it. */
export function MovementDialogProvider({ children }: { children: ReactNode }) {
  // `null` is closed; an object is open, with the movement being edited if there is one.
  const [open, setOpen] = useState<{ movement?: Movement } | null>(null);

  const api = useMemo(
    () => ({
      openNew: () => setOpen({}),
      openEdit: (movement: Movement) => setOpen({ movement }),
    }),
    [],
  );

  return (
    <MovementDialogContext value={api}>
      {children}
      {open && <MovementDialog movement={open.movement} onClose={() => setOpen(null)} />}
    </MovementDialogContext>
  );
}
