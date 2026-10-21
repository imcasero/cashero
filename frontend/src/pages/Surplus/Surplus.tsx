import { Split } from 'lucide-react';
import { Link } from 'react-router';
import { useAccounts } from '../../api/accounts';
import { useSurplusRules } from '../../api/surplusRules';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { ApiError } from '../../lib/api';
import { AllocationEditor } from './AllocationEditor';

const LINK_BUTTON =
  'inline-flex h-12 items-center rounded-control border border-line px-5 font-semibold hover:bg-sunken';

function Surplus() {
  const accounts = useAccounts();
  const rules = useSurplusRules();

  const failed = accounts.isError || rules.isError;
  const loading = accounts.isPending || rules.isPending;

  let content;
  if (failed) {
    const offline = [accounts.error, rules.error].some(
      (error) => error instanceof ApiError && error.status === 0,
    );
    content = (
      <Notice
        tone={offline ? 'offline' : 'negative'}
        action={
          <Button
            variant="secondary"
            className="h-10 px-4"
            onClick={() => {
              void accounts.refetch();
              void rules.refetch();
            }}
          >
            {offline ? 'Reintentar ahora' : 'Reintentar'}
          </Button>
        }
      >
        {offline
          ? 'Sin conexión con el servidor. No se guardará nada hasta que vuelva.'
          : 'No se pudo cargar el reparto.'}
      </Notice>
    );
  } else if (loading) {
    content = <Skeleton className="h-96" />;
  } else {
    const primary = accounts.data.find((account) => account.is_primary);
    const others = accounts.data.filter((account) => !account.is_primary);

    if (accounts.data.length === 0) {
      content = (
        <EmptyState
          icon={Split}
          title="Aún no tienes cuentas"
          description="Para repartir lo que sobra necesitas una cuenta principal y otra donde enviarlo."
          action={
            <Link to="/cuentas" className={LINK_BUTTON}>
              Crear cuenta principal
            </Link>
          }
        />
      );
    } else if (!primary) {
      // Not in the design: the close needs a primary account to take what is not handed out.
      content = (
        <EmptyState
          icon={Split}
          title="Falta la cuenta principal"
          description="Lo que no repartes se queda en la cuenta principal. Marca una de tus cuentas como principal."
          action={
            <Link to="/cuentas" className={LINK_BUTTON}>
              Ir a cuentas
            </Link>
          }
        />
      );
    } else if (others.length === 0) {
      content = (
        <EmptyState
          icon={Split}
          title="Solo tienes la cuenta principal"
          description="Para repartir lo que sobra necesitas otra cuenta. Mientras tanto, todo se queda en la principal."
          action={
            <Link to="/cuentas" className={LINK_BUTTON}>
              Añadir otra cuenta
            </Link>
          }
        />
      );
    } else {
      content = <AllocationEditor primary={primary} others={others} rules={rules.data} />;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Reparto del sobrante" title="¿A dónde va lo que sobra cada mes?" />
      <p className="-mt-2 max-w-2xl text-[15px] text-text-2">
        Al cerrar un mes con sobrante, se transfiere desde la cuenta principal el porcentaje que
        indiques a cada cuenta.
      </p>
      {content}
    </div>
  );
}

export default Surplus;
