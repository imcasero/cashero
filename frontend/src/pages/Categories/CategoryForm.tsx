import { type FormEvent, useState } from 'react';
import { type Category, type CategoryKind, useSaveCategory } from '../../api/categories';
import { Button } from '../../components/Button';
import { CategoryDot } from '../../components/CategoryDot';
import { Field, FieldError, TextInput } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ApiError } from '../../lib/api';
import { CATEGORY_COLORS, sameColor } from './palette';

type CategoryFormProps = {
  /** The category being edited; omitted to create one. */
  category?: Category;
  /** Every category, to spot a repeated name and to suggest a colour nobody uses yet. */
  categories: Category[];
  /** `dialog` scrolls its fields above a fixed footer; `panel` is a plain block. */
  layout: 'panel' | 'dialog';
  onDone: () => void;
};

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
];

export function CategoryForm({ category, categories, layout, onDone }: CategoryFormProps) {
  const save = useSaveCategory();

  const [name, setName] = useState(category?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? 'expense');
  const [color, setColor] = useState(
    () =>
      category?.color ??
      CATEGORY_COLORS.find((swatch) => !categories.some((c) => sameColor(c.color, swatch.hex)))
        ?.hex ??
      CATEGORY_COLORS[0].hex,
  );
  // Errors appear after the first attempt to save, not while the person is still typing.
  const [submitted, setSubmitted] = useState(false);

  // A colour the palette does not have (set elsewhere) stays selectable while editing.
  const swatches: { name: string; hex: string }[] = [...CATEGORY_COLORS];
  if (category?.color && !swatches.some((swatch) => sameColor(swatch.hex, category.color))) {
    swatches.unshift({ name: 'Actual', hex: category.color });
  }

  const trimmed = name.trim();
  const repeated = categories.some((other) => other.id !== category?.id && other.name === trimmed);

  // The API answers 409 for a repeated name and for changing the kind of a category in use;
  // its detail is not exposed, so the message follows what was changed.
  const kindChanged = category !== undefined && category.kind !== kind;
  const nameChanged = category === undefined || category.name !== trimmed;
  const conflict = save.error instanceof ApiError && save.error.status === 409;

  let nameError: string | undefined;
  if (submitted && trimmed === '') nameError = 'Escribe un nombre.';
  else if (submitted && repeated) nameError = 'Ya existe una categoría con ese nombre.';
  else if (conflict && !kindChanged) nameError = 'Ya existe una categoría con ese nombre.';

  let kindError: string | undefined;
  if (conflict && kindChanged) {
    kindError = nameChanged
      ? 'No se pudo guardar: el nombre ya existe o la categoría está en uso y no puede cambiar de tipo.'
      : 'Esta categoría ya tiene movimientos, plantillas o presupuesto: no se puede cambiar su tipo.';
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (trimmed === '' || repeated) return;
    save.mutate({ id: category?.id, input: { name: trimmed, kind, color } }, { onSuccess: onDone });
  }

  let saveError: string | null = null;
  if (save.isError && !conflict) {
    saveError =
      save.error instanceof ApiError && save.error.status === 0
        ? 'Sin conexión con el servidor. No se ha guardado nada.'
        : 'No se pudo guardar la categoría. Inténtalo de nuevo.';
  }

  const fields = (
    <div
      className={`flex flex-col gap-5 ${layout === 'dialog' ? 'overflow-y-auto px-5 pb-5' : ''}`}
    >
      <div>
        <SegmentedControl
          label="Tipo de categoría"
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
        />
        <FieldError message={kindError} />
      </div>

      <Field label="Nombre" error={nameError}>
        <TextInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Por ejemplo, Regalos"
          autoComplete="off"
          aria-invalid={nameError ? true : undefined}
        />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-text-2">Color</legend>
        <div role="radiogroup" aria-label="Color" className="grid grid-cols-6 gap-2">
          {swatches.map((swatch) => {
            const selected = sameColor(swatch.hex, color);
            return (
              <button
                key={swatch.hex}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={swatch.name}
                onClick={() => setColor(swatch.hex)}
                className={`grid aspect-square place-items-center rounded-control border bg-bg ${
                  selected ? 'border-2 border-text' : 'border-line'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="size-6 rounded-[6px]"
                  style={{ backgroundColor: swatch.hex }}
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="flex items-center gap-2 rounded-control bg-bg px-4 py-3 text-[14px] text-text-2">
        Vista previa
        <CategoryDot color={color} square />
        <span className="truncate font-medium text-text">{trimmed || 'Nombre'}</span>
      </p>
    </div>
  );

  const footer = (
    <div
      className={`flex flex-col gap-3 ${layout === 'dialog' ? 'shrink-0 border-t border-line p-4' : 'mt-5'}`}
    >
      {saveError && <Notice tone="negative">{saveError}</Notice>}
      <Button type="submit" block disabled={save.isPending}>
        {save.isPending ? 'Guardando...' : category ? 'Guardar categoría' : 'Crear categoría'}
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
