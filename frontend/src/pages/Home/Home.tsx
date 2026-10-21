import { Plus } from 'lucide-react';
import { useMonthStatus } from '../../api/monthClose';
import { PageHeader } from '../../components/PageHeader';
import { monthLabel } from '../../lib/format';
import { useMovementDialog } from '../Movements/MovementDialogContext';
import { AccountCards } from './AccountCards';
import { BudgetsCard } from './BudgetsCard';
import { MonthBanner } from './MonthBanner';
import { MonthResult } from './MonthResult';
import { RecentMovements } from './RecentMovements';
import { TotalBalance } from './TotalBalance';

function Home() {
  const { currentMonth, pendingMonth } = useMonthStatus();
  const { openNew } = useMovementDialog();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Inicio"
        title={monthLabel(currentMonth)}
        action={
          <button
            type="button"
            onClick={openNew}
            className="hidden h-12 items-center gap-2 rounded-control bg-accent px-5 font-semibold text-on-accent lg:flex"
          >
            <Plus className="size-5" aria-hidden="true" />
            Añadir movimiento
          </button>
        }
      />
      {pendingMonth && <MonthBanner month={pendingMonth} />}
      <div className="grid gap-6 lg:grid-cols-2">
        <TotalBalance />
        <MonthResult month={currentMonth} />
      </div>
      <AccountCards />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <BudgetsCard month={currentMonth} />
        <RecentMovements month={currentMonth} />
      </div>
    </div>
  );
}

export default Home;
