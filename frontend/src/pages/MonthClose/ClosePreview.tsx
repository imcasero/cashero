import { Link } from 'react-router';
import type { Category } from '../../api/categories';
import { Amount } from '../../components/Amount';
import { formatShare, monthName } from '../../lib/format';
import { templateLabel } from './helpers';
import type { ClosePreview as Preview } from './preview';

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-text-2">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

type ClosePreviewProps = {
  month: string;
  preview: Preview;
  categories: Map<string, Category>;
};

/** "Al cerrar <mes>": what the close is going to do, labelled as a forecast. */
export function ClosePreview({ month, preview, categories }: ClosePreviewProps) {
  const deficit = preview.surplus < 0;

  return (
    <div>
      <p className="text-[13px] font-semibold text-text-2">
        Al cerrar {monthName(month)} <span className="font-normal text-text-3">· previsto</span>
      </p>
      <dl className="mt-2 divide-y divide-line border-t border-line">
        <Row label="Recurrentes que se generarán">
          <span className="font-mono tabular-nums">
            <strong className="font-semibold">{preview.recurringCount}</strong>
            {preview.recurringCount === 1 ? ' movimiento' : ' movimientos'} de{' '}
            {preview.templateCount}
            {preview.templateCount === 1 ? ' plantilla' : ' plantillas'}
          </span>
        </Row>
        <Row label={deficit ? 'Déficit previsto' : 'Sobrante previsto'}>
          <Amount value={preview.surplus} signed />
        </Row>
        <Row
          label={
            <>
              {deficit ? 'Devuelto a la principal' : 'Reparto'} a {preview.shareAccounts}{' '}
              {preview.shareAccounts === 1 ? 'cuenta' : 'cuentas'}
              {' · '}
              <Link to="/reparto" className="text-accent underline">
                {formatShare(preview.shareTotal)} %
              </Link>
            </>
          }
        >
          <Amount value={preview.moved} tone="neutral" />
        </Row>
        <Row
          label={`Intereses en ${preview.interestAccounts} ${
            preview.interestAccounts === 1 ? 'cuenta' : 'cuentas'
          }`}
        >
          <Amount value={preview.interestTotal} signed />
        </Row>
        <Row label="Plantillas que terminan">
          {preview.ending.length === 0 ? (
            <span className="text-text-3">Ninguna</span>
          ) : (
            <span className="font-medium">
              {preview.ending.map((template) => templateLabel(template, categories)).join(', ')}
            </span>
          )}
        </Row>
      </dl>
    </div>
  );
}
