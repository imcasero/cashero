import { ArrowDownUp } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { type Account, useAccounts } from '../../api/accounts';
import { type Category, useCategories } from '../../api/categories';
import { type Movement, type MovementKind, useSaveMovement } from '../../api/movements';
import { Button } from '../../components/Button';
import { CategoryDot } from '../../components/CategoryDot';
import { Dialog } from '../../components/Dialog';
import { Field, FieldError, Select, TextInput } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { SegmentedControl } from '../../components/SegmentedControl';
import { Skeleton } from '../../components/Skeleton';
import { ApiError } from '../../lib/api';
import { formatAmountInput, parseAmount, todayKey } from '../../lib/format';

const KIND_OPTIONS: { value: MovementKind; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
];

const NEW_TITLE: Record<MovementKind, string> = {
  expense: 'Nuevo gasto',
  income: 'Nuevo ingreso',
  transfer: 'Nueva transferencia',
};

const EDIT_TITLE: Record<MovementKind, string> = {
  expense: 'Editar gasto',
  income: 'Editar ingreso',
  transfer: 'Editar transferencia',
};

type Errors = {
  amount?: string;
  account?: string;
  counterparty?: string;
  category?: string;
};

type FormValues = {
  kind: MovementKind;
  amount: string;
  date: string;
  description: string;
  accountId: string;
  counterpartyId: string;
  categoryId: string;
};

function validate(values: FormValues): Errors {
  const errors: Errors = {};
  const amount = parseAmount(values.amount);
  if (amount === null || amount <= 0) errors.amount = 'Introduce un importe mayor que 0.';
  if (!values.accountId) errors.account = 'Elige una cuenta.';

  if (values.kind === 'transfer') {
    if (!values.counterpartyId) errors.counterparty = 'Elige una cuenta de destino.';
    else if (values.counterpartyId === values.accountId)
      errors.counterparty = 'Elige una cuenta distinta de la de origen.';
  } else if (!values.categoryId) {
    errors.category = 'Elige una categoría.';
  }
  return errors;
}

function accountLabel(account: Account): string {
  return account.is_primary ? `${account.name} · principal` : account.name;
}

function saveErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 0) {
    return 'Sin conexión con el servidor. No se ha guardado nada.';
  }
  return 'No se pudo guardar el movimiento. Inténtalo de nuevo.';
}

type MovementDialogProps = {
  /** The movement being edited; omitted to create one. */
  movement?: Movement;
  onClose: () => void;
};

/** Waits for accounts and categories, so the form can start from real defaults. */
export function MovementDialog({ movement, onClose }: MovementDialogProps) {
  const accounts = useAccounts();
  const categories = useCategories();
  // The kind lives here because the dialog title follows it.
  const [kind, setKind] = useState<MovementKind>(movement?.kind ?? 'expense');

  const title = movement ? EDIT_TITLE[kind] : NEW_TITLE[kind];

  let body;
  if (accounts.isError || categories.isError) {
    body = (
      <div className="px-5 pb-5">
        <Notice tone="negative">No se pudieron cargar las cuentas y categorías.</Notice>
      </div>
    );
  } else if (accounts.isPending || categories.isPending) {
    body = <Skeleton className="mx-5 mb-5 h-72" />;
  } else {
    body = (
      <MovementForm
        movement={movement}
        kind={kind}
        onKindChange={setKind}
        accounts={accounts.data}
        categories={categories.data}
        onDone={onClose}
      />
    );
  }

  return (
    <Dialog title={title} onClose={onClose}>
      {body}
    </Dialog>
  );
}

type MovementFormProps = {
  movement?: Movement;
  kind: MovementKind;
  onKindChange: (kind: MovementKind) => void;
  accounts: Account[];
  categories: Category[];
  onDone: () => void;
};

function MovementForm({
  movement,
  kind,
  onKindChange,
  accounts,
  categories,
  onDone,
}: MovementFormProps) {
  const save = useSaveMovement();
  const defaultAccount = accounts.find((account) => account.is_primary) ?? accounts[0];

  const [amount, setAmount] = useState(movement ? formatAmountInput(movement.amount) : '');
  const [date, setDate] = useState(movement?.occurred_on ?? todayKey());
  const [description, setDescription] = useState(movement?.description ?? '');
  const [accountId, setAccountId] = useState(movement?.account_id ?? defaultAccount?.id ?? '');
  const [counterpartyId, setCounterpartyId] = useState(movement?.counterparty_account_id ?? '');
  const [categoryId, setCategoryId] = useState(movement?.category_id ?? '');
  // Errors appear after the first attempt to save, not while the person is still typing.
  const [submitted, setSubmitted] = useState(false);

  const isTransfer = kind === 'transfer';
  const kindCategories = categories.filter((category) => category.kind === kind);
  const errors = submitted
    ? validate({ kind, amount, date, description, accountId, counterpartyId, categoryId })
    : {};

  // A transfer needs two accounts and an expense or income needs a category of its kind.
  const blocker =
    accounts.length === 0
      ? 'Aún no tienes cuentas.'
      : isTransfer && accounts.length < 2
        ? 'Una transferencia necesita al menos dos cuentas.'
        : !isTransfer && kindCategories.length === 0
          ? `Antes de registrar un ${kind === 'expense' ? 'gasto' : 'ingreso'} necesitas una categoría de ese tipo.`
          : null;

  function changeKind(next: MovementKind) {
    onKindChange(next);
    // Drop a category that belongs to the other kind.
    if (categories.find((category) => category.id === categoryId)?.kind !== next) setCategoryId('');
    if (next === 'transfer' && !counterpartyId) {
      setCounterpartyId(accounts.find((account) => account.id !== accountId)?.id ?? '');
    }
  }

  function swapAccounts() {
    setAccountId(counterpartyId);
    setCounterpartyId(accountId);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const values = { kind, amount, date, description, accountId, counterpartyId, categoryId };
    if (blocker || Object.keys(validate(values)).length > 0) return;

    save.mutate(
      {
        id: movement?.id,
        input: {
          kind,
          amount: parseAmount(amount) ?? 0,
          occurred_on: date,
          description: description.trim() || null,
          account_id: accountId,
          // The API rejects a category on a transfer and a counterparty on anything else.
          counterparty_account_id: isTransfer ? counterpartyId : null,
          category_id: isTransfer ? null : categoryId,
        },
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
        <SegmentedControl
          label="Tipo de movimiento"
          options={KIND_OPTIONS}
          value={kind}
          onChange={changeKind}
        />

        {blocker && (
          <Notice
            tone="negative"
            action={
              <Link
                to={accounts.length === 0 || isTransfer ? '/cuentas' : '/categorias'}
                className="font-semibold text-accent underline"
              >
                {accounts.length === 0 || isTransfer ? 'Ir a cuentas' : 'Ir a categorías'}
              </Link>
            }
          >
            {blocker}
          </Notice>
        )}

        <div className="text-center">
          <label className="text-[13px] font-medium text-text-2" htmlFor="movement-amount">
            Importe
          </label>
          <div className="mt-2 flex items-baseline justify-center gap-2">
            {!isTransfer && (
              <span
                aria-hidden="true"
                className={`font-mono text-[32px] ${kind === 'expense' ? 'text-negative' : 'text-positive'}`}
              >
                {kind === 'expense' ? '−' : '+'}
              </span>
            )}
            <input
              id="movement-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={errors.amount ? true : undefined}
              className="w-40 border-b border-line bg-transparent text-center font-mono text-[40px] font-medium text-text placeholder:text-text-3 aria-invalid:border-negative"
            />
            <span aria-hidden="true" className="text-text-2">
              €
            </span>
          </div>
          <div className="flex justify-center">
            <FieldError message={errors.amount} />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
          <Field label="Fecha">
            <TextInput
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </Field>
          <Field label="Descripción">
            <TextInput
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>

        <Field label={isTransfer ? 'Desde' : 'Cuenta'} error={errors.account}>
          <Select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            aria-invalid={errors.account ? true : undefined}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {accountLabel(account)}
              </option>
            ))}
          </Select>
        </Field>

        {isTransfer ? (
          <>
            <button
              type="button"
              onClick={swapAccounts}
              aria-label="Intercambiar cuentas"
              className="-my-2 grid size-11 place-items-center self-center rounded-full border border-line text-text-2 hover:text-text"
            >
              <ArrowDownUp className="size-4" aria-hidden="true" />
            </button>
            <Field label="Hacia" error={errors.counterparty}>
              <Select
                value={counterpartyId}
                onChange={(event) => setCounterpartyId(event.target.value)}
                aria-invalid={errors.counterparty ? true : undefined}
              >
                <option value="" disabled>
                  Elige una cuenta
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountLabel(account)}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="rounded-control bg-bg px-4 py-3 text-[14px] text-text-2">
              Sin categoría: una transferencia no cuenta como gasto ni como ingreso.
            </p>
          </>
        ) : (
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-text-2">Categoría</legend>
            <div role="radiogroup" aria-label="Categoría" className="flex flex-wrap gap-2">
              {kindCategories.map((category) => {
                const selected = category.id === categoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setCategoryId(category.id)}
                    className={`flex h-11 items-center gap-2 rounded-full border px-4 text-[14px] font-medium ${
                      selected ? 'border-text bg-text text-bg' : 'border-line text-text'
                    }`}
                  >
                    <CategoryDot color={category.color} />
                    {category.name}
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.category} />
          </fieldset>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-line p-4">
        {save.isError && <Notice tone="negative">{saveErrorMessage(save.error)}</Notice>}
        <Button type="submit" block disabled={save.isPending}>
          {save.isPending ? 'Guardando...' : 'Guardar movimiento'}
        </Button>
      </div>
    </form>
  );
}
