import { Pencil, Trash2 } from 'lucide-react';
import type { Account } from '../../api/accounts';
import type { Category } from '../../api/categories';
import { isLastInstallment, type MovementTemplate } from '../../api/templates';
import { Amount } from '../../components/Amount';
import { CategoryDot } from '../../components/CategoryDot';
import { Toggle } from '../../components/Toggle';
import { formatDayWithYear, monthName } from '../../lib/format';
import { frequencyLabel } from './frequency';

type ListProps = {
  templates: MovementTemplate[];
  categoryById: Map<string, Category>;
  accountById: Map<string, Account>;
  /** `YYYY-MM` of today: a next run in this month or earlier is waiting for its close. */
  currentMonth: string;
  /** The template whose pause/resume request is in flight, so only its switch is disabled. */
  togglingId: string | null;
  onToggle: (template: MovementTemplate, isActive: boolean) => void;
  onEdit: (template: MovementTemplate) => void;
  onDelete: (template: MovementTemplate, label: string) => void;
};

type Note = { text: string; tone: 'muted' | 'warning' };

/** What a row shows for a template: its labels, resolved from the ids. */
function describe(
  template: MovementTemplate,
  { categoryById, accountById, currentMonth }: ListProps,
) {
  const category = categoryById.get(template.category_id);
  const nextMonth = template.next_run_on.slice(0, 7);

  let nextDate: string | null = null;
  let note: Note | null = null;
  if (!template.is_active) {
    note = { text: 'en pausa: no se generará', tone: 'muted' };
  } else {
    nextDate = formatDayWithYear(template.next_run_on);
    if (isLastInstallment(template)) {
      note = { text: 'última cuota', tone: 'warning' };
    } else if (nextMonth <= currentMonth) {
      // A run dated in a month that is not closed yet is generated when that month closes.
      note = { text: `al cerrar ${monthName(nextMonth)}`, tone: 'muted' };
    }
  }

  const categoryName = category?.name ?? 'Sin categoría';
  return {
    label: template.description || categoryName,
    categoryName,
    color: category?.color,
    accountName: accountById.get(template.account_id)?.name ?? '',
    frequency: frequencyLabel(template.frequency, template.interval_count),
    value: template.kind === 'expense' ? -template.amount : template.amount,
    nextDate,
    note,
  };
}

function NoteText({ note }: { note: Note | null }) {
  if (!note) return null;
  return (
    <span
      className={`block text-[13px] ${note.tone === 'warning' ? 'text-warning' : 'text-text-2'}`}
    >
      {note.text}
    </span>
  );
}

function StateToggle({
  template,
  label,
  disabled,
  onToggle,
}: {
  template: MovementTemplate;
  label: string;
  disabled: boolean;
  onToggle: ListProps['onToggle'];
}) {
  return (
    <span className="flex items-center gap-1">
      <Toggle
        checked={template.is_active}
        onChange={(isActive) => onToggle(template, isActive)}
        label={`${label}: ${template.is_active ? 'activa' : 'en pausa'}`}
        disabled={disabled}
      />
      <span className="text-text-2">{template.is_active ? 'Activa' : 'En pausa'}</span>
    </span>
  );
}

function Actions({
  template,
  label,
  onEdit,
  onDelete,
}: {
  template: MovementTemplate;
  label: string;
  onEdit: ListProps['onEdit'];
  onDelete: ListProps['onDelete'];
}) {
  return (
    <span className="flex">
      <button
        type="button"
        onClick={() => onEdit(template)}
        aria-label={`Editar ${label}`}
        className="grid size-11 place-items-center rounded-control text-text-2 hover:text-text"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(template, label)}
        aria-label={`Borrar ${label}`}
        className="grid size-11 place-items-center rounded-control text-text-2 hover:text-negative"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}

/** The mobile list: one block per template, with its switch and actions on the last line. */
export function TemplateCards(props: ListProps) {
  const { templates, togglingId, onToggle, onEdit, onDelete } = props;
  return (
    <ul className="overflow-hidden rounded-card border border-line bg-surface lg:hidden">
      {templates.map((template) => {
        const row = describe(template, props);
        return (
          <li key={template.id} className="border-t border-line px-4 py-4 first:border-t-0">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 font-semibold">{row.label}</p>
              <Amount value={row.value} signed />
            </div>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-text-2">
              <CategoryDot color={row.color} />
              <span className="truncate">
                {row.categoryName} · {row.accountName}
              </span>
            </p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <span className="text-text-2">{row.frequency}</span>
              <span className="text-right">
                <span className="block font-medium">{row.nextDate ?? '—'}</span>
                <NoteText note={row.note} />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <StateToggle
                template={template}
                label={row.label}
                disabled={togglingId === template.id}
                onToggle={onToggle}
              />
              <Actions template={template} label={row.label} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The desktop table, with the switch, edit and delete on each row. */
export function TemplateTable(props: ListProps) {
  const { templates, togglingId, onToggle, onEdit, onDelete } = props;
  return (
    <div className="hidden overflow-hidden rounded-card border border-line bg-surface lg:block">
      <table className="w-full text-left text-[14px]">
        <thead className="text-[13px] font-medium text-text-2">
          <tr className="border-b border-line">
            <th className="px-5 py-3 font-medium">Descripción</th>
            <th className="py-3 pr-4 text-right font-medium">Importe</th>
            <th className="py-3 font-medium">Categoría</th>
            <th className="py-3 font-medium">Cuenta</th>
            <th className="py-3 font-medium">Frecuencia</th>
            <th className="py-3 font-medium">Próximo cobro</th>
            <th className="py-3 font-medium">Estado</th>
            <th className="w-24 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => {
            const row = describe(template, props);
            return (
              <tr key={template.id} className="border-t border-line first:border-t-0">
                <td className="px-5 py-3 font-medium">{row.label}</td>
                <td className="py-3 pr-4 text-right">
                  <Amount value={row.value} signed />
                </td>
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2 text-text-2">
                    <CategoryDot color={row.color} square />
                    {row.categoryName}
                  </span>
                </td>
                <td className="py-3 pr-4 text-text-2">{row.accountName}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-text-2">{row.frequency}</td>
                <td className="py-3 pr-4">
                  <span className="block whitespace-nowrap">{row.nextDate ?? '—'}</span>
                  <NoteText note={row.note} />
                </td>
                <td className="py-1 pr-4">
                  <StateToggle
                    template={template}
                    label={row.label}
                    disabled={togglingId === template.id}
                    onToggle={onToggle}
                  />
                </td>
                <td className="py-1 pr-3">
                  <div className="flex justify-end">
                    <Actions
                      template={template}
                      label={row.label}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
