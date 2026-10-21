import { Menu, Plus } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useMonthStatus } from '../api/monthClose';
import { Logo } from '../components/Logo';
import { monthLabel, monthName } from '../lib/format';
import { BUDGETS, HOME, MORE_ITEMS, MOVEMENTS, type NavItem, SIDEBAR_ITEMS } from './nav';

function PendingChip({ className = '' }: { className?: string }) {
  const { pendingMonth } = useMonthStatus();
  if (!pendingMonth) return null;

  const name = monthName(pendingMonth);
  return (
    <span className={`font-medium text-warning ${className}`}>
      {name.charAt(0).toUpperCase()}
      {name.slice(1)} sin cerrar
    </span>
  );
}

function Sidebar() {
  const { currentMonth } = useMonthStatus();

  return (
    <aside className="sticky top-0 hidden h-svh w-[260px] shrink-0 flex-col gap-6 p-3 lg:flex">
      <div className="px-3 pt-4">
        <Logo />
      </div>
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {SIDEBAR_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex h-12 items-center gap-3 rounded-control border px-3 text-[15px] font-medium ${
                isActive
                  ? 'border-line bg-surface text-text'
                  : 'border-transparent text-text-2 hover:text-text'
              }`
            }
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mx-3 border-t border-line pt-4 text-[13px]">
        <p className="text-[12px] font-semibold tracking-wider text-text-3 uppercase">
          Mes en curso
        </p>
        <p className="mt-1 font-medium text-text">{monthLabel(currentMonth)}</p>
        <PendingChip />
      </div>
    </aside>
  );
}

function BottomNavLink({ item }: { item: NavItem }) {
  const { to, label, icon: Icon } = item;
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${
          isActive ? 'text-text' : 'text-text-3'
        }`
      }
    >
      <Icon className="size-6" aria-hidden="true" />
      {label}
    </NavLink>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const moreActive = pathname === '/mas' || MORE_ITEMS.some((item) => item.to === pathname);

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-10 flex items-center border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <BottomNavLink item={HOME} />
      <BottomNavLink item={MOVEMENTS} />
      {/* The add-movement dialog is a later task; the button is in place for it. */}
      <button
        type="button"
        aria-label="Añadir movimiento"
        className="-mt-6 grid size-14 shrink-0 place-items-center rounded-sheet bg-accent text-on-accent"
      >
        <Plus className="size-7" aria-hidden="true" />
      </button>
      <BottomNavLink item={BUDGETS} />
      <NavLink
        to="/mas"
        className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${
          moreActive ? 'text-text' : 'text-text-3'
        }`}
      >
        <Menu className="size-6" aria-hidden="true" />
        Más
      </NavLink>
    </nav>
  );
}

function Layout() {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between px-4 pt-4 text-[14px] lg:hidden">
          <Logo />
          <PendingChip />
        </div>
        <main className="mx-auto max-w-[1200px] px-4 pt-6 pb-28 lg:px-10 lg:pt-8 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default Layout;
