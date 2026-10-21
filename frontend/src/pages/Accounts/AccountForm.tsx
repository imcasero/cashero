import { type FormEvent, useState } from 'react';
import { type Account, type InterestType, useSaveAccount } from '../../api/accounts';
import { Button } from '../../components/Button';
import { Field, Select, TextInput } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ApiError } from '../../lib/api';
import { formatAmountInput, parseAmount } from '../../lib/format';

type InterestKind = 'none' | InterestType;

const INTEREST_OPTIONS: { value: InterestKind; label: string }[] = [
  { value: 'none', label: 'Sin interés' },
  { value: 'simple', label: 'Simple' },
  { value: 'compound', label: 'Compuesto' },
];

const INTEREST_HINT: Record<InterestType, string> = {
  simple: 'Cada mes se calcula sobre el saldo inicial: paga lo mismo todos los meses.',
  compound: 'Cada mes se calcula sobre el saldo del último cierre: el interés se acumula.',
};

// The type is free text in the API; these are the ones the design offers.
const TYPES = ['Corriente', 'Ahorro', 'Inversión'];

type Errors = { name?: string; balance?: string; rate?: string };

function saveErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 0) {
    return 'Sin conexión con el servidor. No se ha guardado nada.';
  }
  return 'No se pudo guardar la cuenta. Inténtalo de nuevo.';
}

/** An input with a unit (`€`, `%`) sitting inside its right edge. */
function UnitInput({
  unit,
  ...props
}: { unit: string } & Omit<React.ComponentProps<typeof TextInput>, 'className'>) {
  return (
    <span className="relative block">
      <TextInput
        inputMode="decimal"
        autoComplete="off"
        className="pr-10 text-right font-mono"
        {...props}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-text-2"
      >
        {unit}
      </span>
    </span>
  );
}

type AccountFormProps = {
  /** The account being edited; omitted to create one. */
  account?: Account;
  /** Every account, to know which one is primary today. */
  accounts: Account[];
  /** `dialog` scrolls its fields above a fixed footer; `panel` is a plain block. */
  layout: 'panel' | 'dialog';
  onDone: () => void;
};

export function AccountForm({ account, accounts, layout, onDone }: AccountFormProps) {
  const save = useSaveAccount();

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState(account?.type ?? TYPES[0]);
  const [balance, setBalance] = useState(account ? formatAmountInput(account.initial_balance) : '');
  const [interest, setInterest] = useState<InterestKind>(account?.interest_type ?? 'none');
  const [rate, setRate] = useState(
    account?.interest_rate != null ? formatAmountInput(account.interest_rate) : '',
  );
  // The first account ever has to be the primary one, so it starts checked and locked.
  const isFirstAccount = accounts.length === 0;
  const [primary, setPrimary] = useState(account?.is_primary ?? isFirstAccount);
  // Errors appear after the first attempt to save, not while the person is still typing.
  const [submitted, setSubmitted] = useState(false);

  const currentPrimary = accounts.find((candidate) => candidate.is_primary);
  const isCurrentPrimary = account?.is_primary === true;
  // An edited type outside the list (set through the API) must stay selectable.
  const typeOptions = TYPES.includes(type) ? TYPES : [type, ...TYPES];

  function validate(): Errors {
    const errors: Errors = {};
    if (!name.trim()) errors.name = 'Escribe un nombre.';
    // An empty balance means zero; anything typed has to be a number.
    if (balance.trim() && parseAmount(balance) === null) errors.balance = 'Introduce un importe.';
    if (interest !== 'none' && parseAmount(rate) === null) errors.rate = 'Introduce la tasa anual.';
    return errors;
  }

  const errors = submitted ? validate() : {};

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate()).length > 0) return;

    save.mutate(
      {
        id: account?.id,
        input: {
          name: name.trim(),
          type,
          initial_balance: balance.trim() ? (parseAmount(balance) ?? 0) : 0,
          // The API wants both interest fields or neither.
          interest_type: interest === 'none' ? null : interest,
          interest_rate: interest === 'none' ? null : parseAmount(rate),
          is_primary: primary,
        },
      },
      { onSuccess: onDone },
    );
  }

  const fields = (
    <div
      className={`flex flex-col gap-5 ${layout === 'dialog' ? 'overflow-y-auto px-5 pb-5' : ''}`}
    >
      <Field label="Nombre" error={errors.name}>
        <TextInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Por ejemplo, Ahorro vivienda"
          aria-invalid={errors.name ? true : undefined}
        />
      </Field>

      <Field label="Tipo">
        <Select value={type} onChange={(event) => setType(event.target.value)}>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Saldo inicial" error={errors.balance}>
        <UnitInput
          unit="€"
          value={balance}
          onChange={(event) => setBalance(event.target.value)}
          placeholder="0,00"
          aria-invalid={errors.balance ? true : undefined}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-text-2">Interés</span>
        <SegmentedControl
          label="Tipo de interés"
          options={INTEREST_OPTIONS}
          value={interest}
          onChange={setInterest}
        />
        {interest !== 'none' && (
          <p className="text-[13px] text-text-2">{INTEREST_HINT[interest]}</p>
        )}
      </div>

      {interest !== 'none' && (
        <div>
          <Field label="Tasa anual" error={errors.rate}>
            <UnitInput
              unit="%"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              placeholder="0,00"
              aria-invalid={errors.rate ? true : undefined}
            />
          </Field>
          <p className="mt-1.5 text-[13px] text-text-2">
            Se aplica al cerrar cada mes, a razón de un doceavo de la tasa anual.
          </p>
        </div>
      )}

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={primary}
          // Only one account can be primary, so the way to change it is to mark another one.
          disabled={isFirstAccount || isCurrentPrimary}
          onChange={(event) => setPrimary(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 accent-accent"
        />
        <span className="text-[14px]">
          <span className="block font-medium">Usar como cuenta principal</span>
          <span className="text-text-2">
            {isFirstAccount
              ? 'Será la principal: aquí se queda el dinero que no se reparte.'
              : isCurrentPrimary
                ? 'Ahora lo es esta. Para cambiarlo, marca otra cuenta como principal.'
                : currentPrimary
                  ? `Ahora lo es ${currentPrimary.name}. Solo puede haber una: aquí se queda el dinero que no se reparte.`
                  : 'Solo puede haber una: aquí se queda el dinero que no se reparte.'}
          </span>
        </span>
      </label>
    </div>
  );

  const footer = (
    <div
      className={`flex flex-col gap-3 ${layout === 'dialog' ? 'shrink-0 border-t border-line p-4' : 'mt-5'}`}
    >
      {save.isError && <Notice tone="negative">{saveErrorMessage(save.error)}</Notice>}
      <Button type="submit" block disabled={save.isPending}>
        {save.isPending ? 'Guardando...' : account ? 'Guardar cambios' : 'Crear cuenta'}
      </Button>
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className={layout === 'dialog' ? 'flex min-h-0 flex-1 flex-col' : ''}
    >
      {fields}
      {footer}
    </form>
  );
}
