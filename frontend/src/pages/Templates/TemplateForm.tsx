import { type FormEvent, useState } from 'react';
import type { Account } from '../../api/accounts';
import type { Category, CategoryKind } from '../../api/categories';
import {
  type MovementTemplate,
  type TemplateFrequency,
  type TemplateInput,
  useSaveTemplate,
} from '../../api/templates';
import { Button } from '../../components/Button';
import { Field, Select, TextInput, UnitInput } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ApiError } from '../../lib/api';
import { formatAmountInput, formatDayWithYear, parseAmount, todayKey } from '../../lib/format';
import { FREQUENCIES, frequencyLabel, unitLabel } from './frequency';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type TemplateFormProps = {
  /** The template being edited; omitted to create one. */
  template?: MovementTemplate;
  accounts: Account[];
  categories: Category[];
  /**
   * `panel` is the wide desktop card under the table, with its own title row;
   * `dialog` scrolls its fields above a fixed footer.
   */
  layout: 'panel' | 'dialog';
  onDone: () => void;
};

export function TemplateForm({
  template,
  accounts,
  categories,
  layout,
  onDone,
}: TemplateFormProps) {
  const save = useSaveTemplate();

  const [kind, setKind] = useState<CategoryKind>(template?.kind ?? 'expense');
  const [description, setDescription] = useState(template?.description ?? '');
  const [amount, setAmount] = useState(template ? formatAmountInput(template.amount) : '');
  const [chosenAccountId, setChosenAccountId] = useState(template?.account_id ?? '');
  const [chosenCategoryId, setChosenCategoryId] = useState(template?.category_id ?? '');
  const [frequency, setFrequency] = useState<TemplateFrequency>(template?.frequency ?? 'monthly');
  const [count, setCount] = useState(String(template?.interval_count ?? 1));
  const [startDate, setStartDate] = useState(template?.start_date ?? todayKey());
  const [endDate, setEndDate] = useState(template?.end_date ?? '');
  // Errors appear after the first attempt to save, not while the person is still typing.
  const [submitted, setSubmitted] = useState(false);

  // Falls back to the primary account, then the first one, if the chosen one is not available.
  const accountId = accounts.some((account) => account.id === chosenAccountId)
    ? chosenAccountId
    : (accounts.find((account) => account.is_primary) ?? accounts[0])?.id;

  // Only categories of the template's kind can be picked; switching kind picks the first of the new.
  const kindCategories = categories.filter((category) => category.kind === kind);
  const categoryId = kindCategories.some((category) => category.id === chosenCategoryId)
    ? chosenCategoryId
    : kindCategories[0]?.id;

  // Once a template has run, the API leaves its schedule alone when `start_date` changes.
  const startLocked = template?.last_run_on != null;

  const parsedAmount = parseAmount(amount);
  const parsedCount = /^\d+$/.test(count.trim()) ? Number(count) : null;
  const countValid = parsedCount !== null && parsedCount >= 1;
  const startValid = DAY_PATTERN.test(startDate);
  const endValid = endDate === '' || DAY_PATTERN.test(endDate);

  const errors = {
    description: description.trim() ? undefined : 'Escribe una descripción.',
    amount:
      parsedAmount !== null && parsedAmount > 0 ? undefined : 'Introduce un importe mayor que 0.',
    count: countValid ? undefined : 'Introduce un número entero mayor que 0.',
    start: startValid ? undefined : 'Elige una fecha de inicio.',
    end:
      !endValid || (startValid && endDate !== '' && endDate < startDate)
        ? 'La fecha de fin debe ser igual o posterior a la de inicio.'
        : undefined,
    category: categoryId
      ? undefined
      : `Crea antes una categoría de ${kind === 'expense' ? 'gasto' : 'ingreso'}.`,
  };
  const hasErrors = Object.values(errors).some(Boolean) || !accountId;
  const shown = (message?: string) => (submitted ? message : undefined);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors || parsedAmount === null || parsedCount === null || !accountId || !categoryId) {
      return;
    }

    const input: TemplateInput = {
      kind,
      amount: parsedAmount,
      description: description.trim(),
      account_id: accountId,
      category_id: categoryId,
      frequency,
      interval_count: parsedCount,
      end_date: endDate || null,
    };
    if (!startLocked) input.start_date = startDate;

    save.mutate({ id: template?.id, input }, { onSuccess: onDone });
  }

  let saveError: string | null = null;
  if (save.isError) {
    const status = save.error instanceof ApiError ? save.error.status : null;
    if (status === 0) saveError = 'Sin conexión con el servidor. No se ha guardado nada.';
    else if (status === 422)
      saveError = 'La cuenta o la categoría ya no existe. Recarga la página.';
    else saveError = 'No se pudo guardar la plantilla. Inténtalo de nuevo.';
  }

  const summary = (
    <p className="text-[14px] text-text-2">
      Resumen:{' '}
      <strong className="font-semibold text-text">
        {frequencyLabel(frequency, countValid ? parsedCount : 1)}
      </strong>
      {startValid && `, desde el ${formatDayWithYear(startDate)}`}
      {endValid && endDate ? `, hasta el ${formatDayWithYear(endDate)}` : ', sin fecha de fin'}.
    </p>
  );

  const kindControl = (
    <SegmentedControl
      label="Tipo de plantilla"
      value={kind}
      onChange={setKind}
      options={[
        { value: 'expense', label: 'Gasto' },
        { value: 'income', label: 'Ingreso' },
      ]}
    />
  );

  const isPanel = layout === 'panel';

  const fields = (
    <div
      className={
        isPanel
          ? 'grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-4'
          : 'flex flex-col gap-5 overflow-y-auto px-5 pb-5'
      }
    >
      {!isPanel && kindControl}

      <Field label="Descripción" error={shown(errors.description)}>
        <TextInput
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Clases de inglés"
          aria-invalid={shown(errors.description) ? true : undefined}
        />
      </Field>

      <Field label="Importe" error={shown(errors.amount)}>
        <UnitInput
          unit="€"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0,00"
          aria-invalid={shown(errors.amount) ? true : undefined}
        />
      </Field>

      <Field label="Cuenta">
        <Select value={accountId} onChange={(event) => setChosenAccountId(event.target.value)}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Categoría" error={shown(errors.category)}>
        <Select
          value={categoryId ?? ''}
          onChange={(event) => setChosenCategoryId(event.target.value)}
          disabled={kindCategories.length === 0}
          aria-invalid={shown(errors.category) ? true : undefined}
        >
          {kindCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <span className="text-[13px] font-medium text-text-2">Se repite</span>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="text-text-2">cada</span>
          <TextInput
            value={count}
            onChange={(event) => setCount(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            aria-label="Cada cuántas unidades se repite"
            aria-invalid={shown(errors.count) ? true : undefined}
            className="w-20 shrink-0 text-center"
          />
          <Select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as TemplateFrequency)}
            aria-label="Unidad de tiempo"
          >
            {FREQUENCIES.map((option) => (
              <option key={option} value={option}>
                {unitLabel(option, countValid ? parsedCount : 1)}
              </option>
            ))}
          </Select>
        </div>
        {shown(errors.count) && (
          <p role="alert" className="mt-1.5 text-[13px] text-negative">
            {errors.count}
          </p>
        )}
      </div>

      <div>
        <Field label="Fecha de inicio" error={shown(errors.start)}>
          <TextInput
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={startLocked}
            aria-invalid={shown(errors.start) ? true : undefined}
          />
        </Field>
        {startLocked && (
          <p className="mt-1.5 text-[13px] text-text-2">
            Ya se ha generado: la fecha de inicio no se puede cambiar.
          </p>
        )}
      </div>

      <Field label="Fecha de fin" error={shown(errors.end)}>
        <TextInput
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          aria-invalid={shown(errors.end) ? true : undefined}
        />
        <span className="text-[12px] font-normal text-text-3">Opcional</span>
      </Field>
    </div>
  );

  const submitLabel = save.isPending
    ? 'Guardando...'
    : template
      ? 'Guardar cambios'
      : 'Crear plantilla';

  if (isPanel) {
    return (
      <form noValidate onSubmit={handleSubmit}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-[17px] font-semibold">Nueva plantilla</h2>
          <div className="w-64">{kindControl}</div>
        </div>
        {fields}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          {summary}
          <div className="flex items-center gap-3">
            {saveError && <Notice tone="negative">{saveError}</Notice>}
            <Button type="submit" disabled={save.isPending}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      {fields}
      <div className="flex shrink-0 flex-col gap-3 border-t border-line p-4">
        {summary}
        {saveError && <Notice tone="negative">{saveError}</Notice>}
        <Button type="submit" block disabled={save.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
