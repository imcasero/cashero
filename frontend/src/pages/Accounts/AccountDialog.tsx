import type { Account } from '../../api/accounts';
import { Dialog } from '../../components/Dialog';
import { AccountForm } from './AccountForm';

type AccountDialogProps = {
  /** The account being edited; omitted to create one. */
  account?: Account;
  accounts: Account[];
  onClose: () => void;
};

/** The account form in a modal: the only way to create on mobile and to edit anywhere. */
export function AccountDialog({ account, accounts, onClose }: AccountDialogProps) {
  return (
    <Dialog title={account ? 'Editar cuenta' : 'Nueva cuenta'} onClose={onClose}>
      <AccountForm account={account} accounts={accounts} layout="dialog" onDone={onClose} />
    </Dialog>
  );
}
