-- Recurring definitions and the real ledger of money moving.

create table movement_templates (
  id uuid primary key default gen_random_uuid(),
  kind category_kind not null,               -- expense | income only; transfers cannot be templated
  amount numeric(14, 2) not null,
  description text,
  account_id uuid not null references accounts(id) on delete restrict,
  category_id uuid not null references categories(id) on delete restrict,
  frequency template_frequency not null,
  interval_count integer not null default 1, -- every N periods (e.g. frequency=monthly, interval=2 => bimonthly)
  start_date date not null,
  end_date date,
  next_run_on date not null,                 -- next date a movement should be generated
  last_run_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movement_templates_amount_positive check (amount > 0),
  constraint movement_templates_interval_positive check (interval_count > 0),
  constraint movement_templates_date_range check (end_date is null or end_date >= start_date)
);

comment on table movement_templates is
  'Definition of a recurring expense/income (rent, salary...). Generates real movements according to its frequency; is not itself a movement of money.';

create index movement_templates_due on movement_templates (next_run_on) where is_active;
create index movement_templates_account on movement_templates (account_id);
create index movement_templates_category on movement_templates (category_id);

create trigger movement_templates_set_updated_at
  before update on movement_templates
  for each row execute function set_updated_at();

alter table movement_templates disable row level security;

create table movements (
  id uuid primary key default gen_random_uuid(),
  kind movement_kind not null,
  amount numeric(14, 2) not null,            -- always the positive magnitude; direction comes from kind
  occurred_on date not null,
  description text,
  account_id uuid not null references accounts(id) on delete restrict,
  counterparty_account_id uuid references accounts(id) on delete restrict, -- transfers only: destination
  category_id uuid references categories(id) on delete restrict,           -- expense/income only
  origin movement_origin not null default 'manual',
  template_id uuid references movement_templates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movements_amount_positive check (amount > 0),
  constraint movements_shape check (
    (kind = 'transfer'
      and category_id is null
      and counterparty_account_id is not null
      and counterparty_account_id <> account_id)
    or
    (kind in ('expense', 'income')
      and counterparty_account_id is null
      and category_id is not null)
  )
);

comment on column movements.account_id is
  'The account money moves in/out of. For transfers, the source account.';
comment on column movements.counterparty_account_id is
  'Transfers only: the destination account.';
comment on column movements.origin is
  'Where the movement came from: manual, recurring template, or automatic month close (surplus split / deficit cover). Distinguishes new money from money that only changes location.';

create index movements_account_date on movements (account_id, occurred_on);
create index movements_counterparty on movements (counterparty_account_id) where kind = 'transfer';
create index movements_category on movements (category_id);
create index movements_occurred_on on movements (occurred_on);
create index movements_template on movements (template_id);

create trigger movements_set_updated_at
  before update on movements
  for each row execute function set_updated_at();

alter table movements disable row level security;
