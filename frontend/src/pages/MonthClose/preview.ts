import type { Account } from '../../api/accounts';
import type { Movement } from '../../api/movements';
import type { SurplusRule } from '../../api/surplusRules';
import { dueOccurrences, endsAtClose, type MovementTemplate } from '../../api/templates';
import { monthRange } from '../../lib/format';

const round2 = (value: number) => Math.round(value * 100) / 100;
const MONTHS_PER_YEAR = 12;

export type ClosePreview = {
  /** Movements the templates would generate, and how many templates produce them. */
  recurringCount: number;
  templateCount: number;
  /** Income minus expenses of the month, with the recurring ones that are still owed. */
  surplus: number;
  /** Accounts that receive a share (the primary one never does) and the % they add up to. */
  shareAccounts: number;
  shareTotal: number;
  /** What moves between accounts: handed out with a surplus, returned with a deficit. */
  moved: number;
  interestAccounts: number;
  interestTotal: number;
  ending: MovementTemplate[];
};

type PreviewInput = {
  month: string;
  /** Every movement already stored for the month. */
  movements: Movement[];
  /** Active templates only: a paused one is skipped by the close. */
  templates: MovementTemplate[];
  accounts: Account[];
  rules: SurplusRule[];
  /** Closing balance of each account in the previous month, when that month was closed. */
  previousClosing: Map<string, number>;
};

/**
 * What closing `month` would do, computed here because the API has no preview. It mirrors the
 * backend (`recurrence.py`, `surplus.py`, `interest.py`), so treat the figures as "previsto".
 */
export function buildClosePreview({
  month,
  movements,
  templates,
  accounts,
  rules,
  previousClosing,
}: PreviewInput): ClosePreview {
  const { start, end } = monthRange(month);

  let recurringCount = 0;
  let templateCount = 0;
  let surplus = 0;

  for (const movement of movements) {
    if (movement.kind === 'income') surplus += movement.amount;
    if (movement.kind === 'expense') surplus -= movement.amount;
  }

  for (const template of templates) {
    const due = dueOccurrences(template, end);
    if (due.length === 0) continue;
    recurringCount += due.length;
    templateCount += 1;
    const signed = template.kind === 'expense' ? -template.amount : template.amount;
    // A catch-up occurrence lands in an earlier month, so it does not change this month's result.
    const inMonth = due.filter((day) => day >= start && day <= end).length;
    surplus += signed * inMonth;
  }
  surplus = round2(surplus);

  const primary = accounts.find((account) => account.is_primary);
  const shared = rules.filter(
    (rule) => rule.account_id !== primary?.id && accounts.some((a) => a.id === rule.account_id),
  );
  const moved = round2(
    shared.reduce((sum, rule) => sum + round2((Math.abs(surplus) * rule.percentage) / 100), 0),
  );

  let interestAccounts = 0;
  let interestTotal = 0;
  for (const account of accounts) {
    if (account.interest_type === null || account.interest_rate === null) continue;
    // Compound interest grows on the previous close; without one it starts from the initial balance.
    const base =
      account.interest_type === 'compound'
        ? (previousClosing.get(account.id) ?? account.initial_balance)
        : account.initial_balance;
    const amount = round2((base * account.interest_rate) / 100 / MONTHS_PER_YEAR);
    if (amount === 0) continue;
    interestAccounts += 1;
    interestTotal += amount;
  }

  return {
    recurringCount,
    templateCount,
    surplus,
    shareAccounts: shared.length,
    shareTotal: round2(shared.reduce((sum, rule) => sum + rule.percentage, 0)),
    moved,
    interestAccounts,
    interestTotal: round2(interestTotal),
    ending: templates.filter((template) => endsAtClose(template, end)),
  };
}
