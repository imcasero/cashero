import { useState } from 'react';
import { type Account, interestSummary } from '../../api/accounts';
import { type SurplusRule, useSaveSurplusRules } from '../../api/surplusRules';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { FieldError, UnitInput } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { ApiError } from '../../lib/api';
import { formatShare } from '../../lib/format';
import { AllocationExample } from './AllocationExample';
import { formatShareInput, parseShare, segmentColor, totalShare } from './allocation';

type AllocationEditorProps = {
  primary: Account;
  /** Every other account, in the order the rest of the app lists them. */
  others: Account[];
  rules: SurplusRule[];
};

function saveErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Sin conexión con el servidor. No se ha guardado nada.';
    if (error.status === 422) return 'Algún porcentaje o cuenta no es válido. Revisa el reparto.';
  }
  return 'No se pudo guardar el reparto. Inténtalo de nuevo.';
}

export function AllocationEditor({ primary, others, rules }: AllocationEditorProps) {
  const save = useSaveSurplusRules();

  // Only what the person has typed; every other field shows the stored value, so saving or
  // discarding is just emptying this.
  const [edits, setEdits] = useState<Record<string, string>>({});

  // A stored rule on the primary account is ignored: the backend skips it at close (it would be a
  // transfer to itself) and saving replaces the whole set without it.
  const stored = new Map(rules.map((rule) => [rule.account_id, rule.percentage]));

  const rows = others.map((account, index) => {
    const text = edits[account.id] ?? formatShareInput(stored.get(account.id) ?? 0);
    return { account, index, text, share: parseShare(text), stored: stored.get(account.id) ?? 0 };
  });

  const hasBadText = rows.some((row) => row.share === null);
  const total = totalShare(rows.map((row) => row.share ?? 0));
  const over = total > 100;
  const remainder = over ? 0 : totalShare([100, -total]);
  const dirty = rows.some((row) => row.share === null || row.share !== row.stored);
  const valid = !hasBadText && !over;

  function edit(accountId: string, text: string) {
    setEdits((previous) => ({ ...previous, [accountId]: text }));
    save.reset();
  }

  function discard() {
    setEdits({});
    save.reset();
  }

  function submit() {
    // An account without a share is left out: the API rejects 0 and treats absence as "nothing".
    const payload = rows.flatMap((row) =>
      row.share ? [{ account_id: row.account.id, percentage: row.share }] : [],
    );
    save.mutate(payload, { onSuccess: () => setEdits({}) });
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
      <Card className="p-5 lg:p-6">
        <h2 className="text-[17px] font-semibold">Porcentajes</h2>

        <div
          role="img"
          aria-label="Porcentaje del sobrante que recibe cada cuenta"
          className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-sunken"
        >
          {rows.map(
            (row) =>
              row.share !== null &&
              row.share > 0 && (
                <span
                  key={row.account.id}
                  style={{
                    flex: `${row.share} 1 0`,
                    backgroundColor: segmentColor(row.index),
                  }}
                />
              ),
          )}
          {remainder > 0 && (
            <span style={{ flex: `${remainder} 1 0`, backgroundColor: segmentColor('primary') }} />
          )}
        </div>

        <ul className="mt-2 divide-y divide-line">
          {rows.map((row) => (
            <li key={row.account.id} className="py-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-[4px]"
                  style={{ backgroundColor: segmentColor(row.index) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{row.account.name}</p>
                  <p className="text-[13px] text-text-2">{interestSummary(row.account)}</p>
                </div>
                <div className="w-28 shrink-0">
                  <UnitInput
                    unit="%"
                    aria-label={`Porcentaje para ${row.account.name}`}
                    placeholder="0"
                    value={row.text}
                    aria-invalid={row.share === null || over}
                    onChange={(event) => edit(row.account.id, event.target.value)}
                  />
                </div>
              </div>
              {row.share === null && (
                <FieldError message="Introduce un porcentaje entre 0 y 100." />
              )}
            </li>
          ))}
          <li className="flex items-center gap-3 py-4">
            <span
              aria-hidden="true"
              className="size-4 shrink-0 rounded-[4px]"
              style={{ backgroundColor: segmentColor('primary') }}
            />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                {primary.name}
                <Badge tone="accent">Principal</Badge>
              </p>
              <p className="text-[13px] text-text-2">Recibe lo que no repartes</p>
            </div>
            <span className="w-28 shrink-0 pr-4 text-right font-mono text-text-2 tabular-nums">
              {formatShare(remainder)} %
            </span>
          </li>
        </ul>

        <div className={`mt-2 rounded-control p-4 ${over ? 'bg-negative/15' : 'bg-sunken'}`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">Suma repartida</p>
            <p
              className={`font-mono text-[28px] font-medium tabular-nums ${over ? 'text-negative' : ''}`}
            >
              {formatShare(total)} %
            </p>
          </div>
          {over ? (
            <p role="alert" className="mt-1 text-[14px] font-semibold text-negative">
              La suma supera el 100 %. Baja algún porcentaje en{' '}
              {formatShare(totalShare([total, -100]))} %.
            </p>
          ) : (
            <p className="mt-1 text-[14px] text-text-2">
              El resto (<span className="font-mono">{formatShare(remainder)} %</span>) se queda en
              la cuenta principal.
            </p>
          )}
        </div>

        {save.isError && (
          <div className="mt-4">
            <Notice
              tone={
                save.error instanceof ApiError && save.error.status === 0 ? 'offline' : 'negative'
              }
            >
              {saveErrorMessage(save.error)}
            </Notice>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <Button block disabled={!dirty || !valid || save.isPending} onClick={submit}>
            {save.isPending ? 'Guardando…' : 'Guardar reparto'}
          </Button>
          <Button variant="secondary" block disabled={!dirty || save.isPending} onClick={discard}>
            Descartar cambios
          </Button>
          {save.isSuccess && !dirty && (
            <p role="status" className="text-center text-[14px] text-positive">
              Reparto guardado.
            </p>
          )}
        </div>
      </Card>

      <aside className="mt-5 flex flex-col gap-3 lg:mt-0">
        <AllocationExample
          valid={valid}
          shares={rows.map((row) => ({
            accountId: row.account.id,
            name: row.account.name,
            share: row.share ?? 0,
          }))}
        />
        <p className="px-1 text-[14px] text-text-2">
          Si el mes cierra en déficit ocurre al revés: cada cuenta devuelve a la principal su
          porcentaje del déficit.
        </p>
      </aside>
    </div>
  );
}
