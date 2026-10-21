import { type FormEvent, useState } from 'react';
import { type BudgetStatus, useSaveBudget } from '../../api/budgets';
import type { Category } from '../../api/categories';
import { Button } from '../../components/Button';
import { Field, Select, UnitInput } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { ApiError } from '../../lib/api';
import { formatAmountInput, parseAmount } from '../../lib/format';

type BudgetFormProps = {
  /** The budget being edited; omitted to create one. */
  budget?: BudgetStatus;
  /** Name of the edited budget's category, shown instead of the select. */
  categoryName?: string;
  /** Expense categories that have no budget yet: the ones that can be picked when creating. */
  available: Category[];
  /** `dialog` scrolls its fields above a fixed footer; `panel` is a plain block. */
  layout: 'panel' | 'dialog';
  onDone: () => void;
};

export function BudgetForm({ budget, categoryName, available, layout, onDone }: BudgetFormProps) {
  const save = useSaveBudget();

  const [chosenId, setChosenId] = useState('');
  const [limit, setLimit] = useState(budget ? formatAmountInput(budget.monthly_limit) : '');
  // Errors appear after the first attempt to save, not while the person is still typing.
  const [submitted, setSubmitted] = useState(false);

  // Falls back to the first free category if the chosen one got a budget in the meantime.
  const categoryId = budget
    ? budget.category_id
    : available.some((category) => category.id === chosenId)
      ? chosenId
      : (available[0]?.id ?? '');

  const parsedLimit = parseAmount(limit);
  const limitError =
    submitted && (parsedLimit === null || parsedLimit <= 0)
      ? 'Introduce un límite mayor que 0.'
      : undefined;

  // The API answers 409 when another budget took the category first (e.g. from another tab).
  const duplicate = save.error instanceof ApiError && save.error.status === 409;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!categoryId || parsedLimit === null || parsedLimit <= 0) return;
    save.mutate({ id: budget?.id, categoryId, limit: parsedLimit }, { onSuccess: onDone });
  }

  let saveError: string | null = null;
  if (save.isError && !duplicate) {
    saveError =
      save.error instanceof ApiError && save.error.status === 0
        ? 'Sin conexión con el servidor. No se ha guardado nada.'
        : 'No se pudo guardar el presupuesto. Inténtalo de nuevo.';
  }

  const fields = (
    <div
      className={`flex flex-col gap-5 ${layout === 'dialog' ? 'overflow-y-auto px-5 pb-5' : ''}`}
    >
      {budget ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-2">Categoría de gasto</span>
          <p className="text-[16px] font-medium">{categoryName ?? 'Sin categoría'}</p>
        </div>
      ) : (
        <div>
          <Field
            label="Categoría de gasto"
            error={duplicate ? 'Esta categoría ya tiene presupuesto.' : undefined}
          >
            <Select
              value={categoryId}
              onChange={(event) => setChosenId(event.target.value)}
              aria-invalid={duplicate ? true : undefined}
            >
              {available.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          {!duplicate && (
            <p className="mt-1.5 text-[13px] text-text-2">
              Cada categoría admite un solo presupuesto.
            </p>
          )}
        </div>
      )}

      <Field label="Límite mensual" error={limitError}>
        <UnitInput
          unit="€"
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          placeholder="0,00"
          aria-invalid={limitError ? true : undefined}
        />
      </Field>
    </div>
  );

  const footer = (
    <div
      className={`flex flex-col gap-3 ${layout === 'dialog' ? 'shrink-0 border-t border-line p-4' : 'mt-5'}`}
    >
      {saveError && <Notice tone="negative">{saveError}</Notice>}
      <Button type="submit" block disabled={save.isPending}>
        {save.isPending ? 'Guardando...' : budget ? 'Guardar límite' : 'Crear presupuesto'}
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
