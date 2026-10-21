import { createContext, useContext } from 'react';
import type { Movement } from '../../api/movements';

type MovementDialogApi = {
  openNew: () => void;
  openEdit: (movement: Movement) => void;
};

export const MovementDialogContext = createContext<MovementDialogApi | null>(null);

/** Opens the add/edit movement dialog from anywhere under the layout. */
export function useMovementDialog(): MovementDialogApi {
  const api = useContext(MovementDialogContext);
  if (!api) throw new Error('useMovementDialog needs a MovementDialogProvider');
  return api;
}
