import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { monthLabel, monthName } from '../../lib/format';

/** Warning shown while the previous month has not been closed. */
export function MonthBanner({ month }: { month: string }) {
  return (
    <section
      role="alert"
      className="flex flex-col gap-4 rounded-card border border-warning/40 bg-warning-soft p-5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex gap-4">
        <TriangleAlert className="mt-0.5 size-6 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <h2 className="text-[17px] font-semibold text-warning">
            {monthLabel(month)} sigue sin cerrar
          </h2>
          <p className="mt-0.5 text-text-2">
            Sus recurrentes no se han generado y su sobrante no se ha repartido.
          </p>
        </div>
      </div>
      <Link
        to="/cierre"
        className="grid h-12 shrink-0 place-items-center rounded-control bg-warning px-5 font-semibold text-bg"
      >
        Cerrar {monthName(month)}
      </Link>
    </section>
  );
}
