import { Lock } from 'lucide-react';
import { useState } from 'react';
import type { Category } from '../../api/categories';
import { Amount } from '../../components/Amount';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Notice } from '../../components/Notice';
import { monthLabel, monthName } from '../../lib/format';
import { templateLabel } from './helpers';
import type { ClosePreview } from './preview';

type CloseMonthDialogProps = {
  month: string;
  preview: ClosePreview;
  categories: Map<string, Category>;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt>{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

/** Last stop before the close: it cannot be undone, so it has to be acknowledged. */
export function CloseMonthDialog({
  month,
  preview,
  categories,
  pending,
  error,
  onConfirm,
  onClose,
}: CloseMonthDialogProps) {
  const [understood, setUnderstood] = useState(false);
  const name = monthName(month);

  return (
    <Dialog title={`¿Cerrar ${monthLabel(month)}?`} onClose={onClose}>
      <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-5">
        <p className="text-text-2">
          Se harán estos cambios de una vez.{' '}
          <strong className="text-text">No se pueden deshacer</strong> y {name} no se podrá reabrir.
        </p>

        <dl className="divide-y divide-line rounded-control border border-line">
          <Line label="Generar recurrentes">
            <span className="font-mono font-medium tabular-nums">{preview.recurringCount}</span>
          </Line>
          <Line label="Aplicar intereses">
            <Amount value={preview.interestTotal} signed />
          </Line>
          <Line label={preview.surplus < 0 ? 'Devolver el déficit' : 'Repartir el sobrante'}>
            <Amount value={preview.moved} tone="neutral" />
          </Line>
          <Line label="Finalizar plantillas">
            <span className="font-medium">
              {preview.ending.length === 0
                ? '—'
                : preview.ending.map((template) => templateLabel(template, categories)).join(', ')}
            </span>
          </Line>
        </dl>

        <p className="text-[13px] text-text-3">
          Son cifras previstas. Si falta algún movimiento de {name}, añádelo antes.
        </p>

        <label className="flex items-center gap-3 rounded-control bg-sunken px-4 py-3">
          <input
            type="checkbox"
            checked={understood}
            onChange={(event) => setUnderstood(event.target.checked)}
            className="size-5 shrink-0 accent-(--accent)"
          />
          Entiendo que el cierre es definitivo
        </label>

        {error && <Notice tone="negative">{error}</Notice>}

        <div className="flex flex-col gap-3">
          <Button block disabled={!understood || pending} onClick={onConfirm}>
            <Lock className="size-4" aria-hidden="true" />
            {pending ? 'Cerrando...' : `Cerrar ${name}`}
          </Button>
          <Button variant="secondary" block disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
