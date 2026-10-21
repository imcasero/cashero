import {
  ArrowDownUp,
  ChartPie,
  House,
  Landmark,
  Lock,
  type LucideIcon,
  RefreshCw,
  Split,
  Tag,
} from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const HOME: NavItem = { to: '/', label: 'Inicio', icon: House };
export const MOVEMENTS: NavItem = { to: '/movimientos', label: 'Movimientos', icon: ArrowDownUp };
export const BUDGETS: NavItem = { to: '/presupuestos', label: 'Presupuestos', icon: ChartPie };
export const ACCOUNTS: NavItem = { to: '/cuentas', label: 'Cuentas', icon: Landmark };
export const RECURRING: NavItem = { to: '/recurrentes', label: 'Recurrentes', icon: RefreshCw };
export const SURPLUS: NavItem = { to: '/reparto', label: 'Reparto del sobrante', icon: Split };
export const MONTH_CLOSE: NavItem = { to: '/cierre', label: 'Cierre de mes', icon: Lock };
export const CATEGORIES: NavItem = { to: '/categorias', label: 'Categorías', icon: Tag };

/** Sidebar order on desktop. */
export const SIDEBAR_ITEMS: NavItem[] = [
  HOME,
  MOVEMENTS,
  ACCOUNTS,
  BUDGETS,
  RECURRING,
  SURPLUS,
  MONTH_CLOSE,
  CATEGORIES,
];

/** Reached through "Más" on mobile. */
export const MORE_ITEMS: NavItem[] = [ACCOUNTS, RECURRING, SURPLUS, MONTH_CLOSE, CATEGORIES];
