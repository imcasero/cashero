import { Link } from 'react-router';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { MORE_ITEMS } from './nav';

/** Stand-in for screens that are built in later tasks. */
export function ComingSoon({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <Card className="mt-6 text-text-2">Esta pantalla todavía no está construida.</Card>
    </>
  );
}

/** "Más" on mobile: the screens that don't fit in the bottom bar. */
export function More() {
  return (
    <>
      <PageHeader eyebrow="Más" title="Todas las secciones" />
      <Card className="mt-6 p-2">
        <ul>
          {MORE_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex h-12 items-center gap-3 rounded-control px-3 font-medium"
              >
                <Icon className="size-5 text-text-2" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
