-- Live balance per account: initial_balance +/- movements. Never stored on the table.

create view account_balances as
select
  a.id as account_id,
  (
    a.initial_balance
    + coalesce((
        select sum(m.amount)
        from movements m
        where m.account_id = a.id and m.kind = 'income'
      ), 0)
    - coalesce((
        select sum(m.amount)
        from movements m
        where m.account_id = a.id and m.kind = 'expense'
      ), 0)
    - coalesce((
        select sum(m.amount)
        from movements m
        where m.account_id = a.id and m.kind = 'transfer'
      ), 0)
    + coalesce((
        select sum(m.amount)
        from movements m
        where m.counterparty_account_id = a.id and m.kind = 'transfer'
      ), 0)
  ) as current_balance
from accounts a;

comment on view account_balances is
  'Computed current balance per account. Source of truth for balances; monthly_balances only snapshots this at month close.';
