-- Core reference tables: where money lives, and how movements are classified.

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,                       -- free text, defined by the user
  currency text not null default 'EUR',     -- MVP: always EUR; no conversion logic yet
  initial_balance numeric(14, 2) not null default 0,
  interest_type account_interest_type,      -- null => account bears no interest
  interest_rate numeric(7, 4),              -- annual rate as a fraction, e.g. 0.025 = 2.5%
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_name_not_blank check (length(trim(name)) > 0),
  constraint accounts_type_not_blank check (length(trim(type)) > 0),
  constraint accounts_currency_not_blank check (length(trim(currency)) > 0),
  constraint accounts_interest_consistent check (
    (interest_type is null and interest_rate is null)
    or (interest_type is not null and interest_rate is not null and interest_rate >= 0)
  )
);

comment on column accounts.type is
  'Free-text account type defined by the user; not interpreted by the system.';
comment on column accounts.currency is
  'MVP: always EUR. Present as an inert field so multi-currency can be added later without revisiting historical amounts.';
comment on column accounts.interest_rate is
  'Annual rate as a decimal fraction (0.025 = 2.5%). NULL when the account bears no interest.';
comment on column accounts.is_primary is
  'Exactly one account is primary: it absorbs the monthly deficit and any surplus not routed by a rule. At-most-one is enforced here; the backend guarantees at-least-one.';

-- At most one primary account.
create unique index accounts_one_primary on accounts (is_primary) where is_primary;

create trigger accounts_set_updated_at
  before update on accounts
  for each row execute function set_updated_at();

alter table accounts disable row level security;

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind category_kind not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (length(trim(name)) > 0),
  constraint categories_name_unique unique (name)
);

comment on table categories is
  'User-defined classification for expense/income movements. Transfers are never categorised. No seed data.';

create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();

alter table categories disable row level security;
