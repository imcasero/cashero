-- Monthly budgeting, surplus routing, and historical month-close snapshots.

create table budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  monthly_limit numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_limit_positive check (monthly_limit > 0),
  constraint budgets_one_per_category unique (category_id)
);

comment on table budgets is
  'Standing monthly spending limit per category. Resets every month by design: no carry-over, no stored counter. Spent amount is computed on the fly from the current month''s movements.';

create trigger budgets_set_updated_at
  before update on budgets
  for each row execute function set_updated_at();

alter table budgets disable row level security;

create table surplus_allocation_rules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  percentage numeric(5, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surplus_rules_percentage_range check (percentage > 0 and percentage <= 100),
  constraint surplus_rules_one_per_account unique (account_id)
);

comment on table surplus_allocation_rules is
  'How each month''s surplus is split across accounts, in percentages that need not sum to 100. Whatever is left uncovered goes to the primary account.';

create trigger surplus_rules_set_updated_at
  before update on surplus_allocation_rules
  for each row execute function set_updated_at();

alter table surplus_allocation_rules disable row level security;

create table monthly_balances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  period_month date not null,               -- always the first day of the month
  closing_balance numeric(14, 2) not null,  -- calculated balance at month close, interest included
  interest_accrued numeric(14, 2) not null default 0, -- interest generated that month (part of closing_balance)
  created_at timestamptz not null default now(),
  constraint monthly_balances_period_is_month_start
    check (period_month = date_trunc('month', period_month)::date),
  constraint monthly_balances_one_per_account_month unique (account_id, period_month)
);

comment on table monthly_balances is
  'Snapshot of each account''s balance at month close, including that month''s interest. Enables compound interest (needs the previous month''s balance) and future evolution charts.';

alter table monthly_balances disable row level security;
