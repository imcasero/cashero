import { Amount } from '../../components/Amount';
import { Card } from '../../components/Card';
import { EXAMPLE_SURPLUS, splitSurplus } from './allocation';

type AllocationExampleProps = {
  shares: { accountId: string; name: string; share: number }[];
  /** False while the percentages can't be saved (bad text or above 100 %). */
  valid: boolean;
};

/** What the current percentages would do to a month that closes with a surplus of 1.000 €. */
export function AllocationExample({ shares, valid }: AllocationExampleProps) {
  const { lines, stays } = splitSurplus(EXAMPLE_SURPLUS, shares);
  const nameOf = new Map(shares.map(({ accountId, name }) => [accountId, name]));

  return (
    <Card>
      <h2 className="text-[17px] font-semibold">Un ejemplo</h2>
      {valid ? (
        <>
          <p className="mt-3 text-[15px] text-text-2">
            Si un mes cierra con <Amount value={EXAMPLE_SURPLUS} signed /> de sobrante, al cerrarlo
            pasaría esto:
          </p>
          <dl className="mt-4 flex flex-col gap-3 text-[15px]">
            {lines.map((line) => (
              <div key={line.accountId} className="flex items-baseline justify-between gap-3">
                <dt className="text-text-2">Pasan a {nameOf.get(line.accountId)}</dt>
                <dd>
                  <Amount value={line.amount} tone="neutral" />
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-text-2">Se quedan en la principal</dt>
              <dd>
                <Amount value={stays} tone="neutral" />
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-3 text-[15px] text-text-2">
          Corrige los porcentajes para ver cómo se repartiría.
        </p>
      )}
    </Card>
  );
}
