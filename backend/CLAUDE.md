# CLAUDE.md — backend

Conventions for the FastAPI backend. The monorepo-level guide (product, stack, ports, env, deploy,
engram usage) is in `../CLAUDE.md`; this file only covers the code under `backend/`.

## Commands

```bash
uv sync                          # install/refresh deps into .venv
uv add <package>                 # add a dep and update uv.lock
uv run fastapi dev app/main.py   # dev server on :8000, docs at /docs
uv run ruff check .              # lint
uv run ruff format .             # format
```

No test suite exists yet. Manual verification is done through `/docs` or `GET /db-check`, which runs
`select 1` against Postgres to prove the connection.

## Layout

`app/` is split by feature, with shared plumbing in `app/core/` and **all** ORM models centralized in
`app/models/`:

```
app/
├── main.py              # FastAPI instance, CORS, one include_router per feature
├── core/
│   ├── config.py        # Settings (pydantic-settings) + the single `settings` instance
│   ├── database.py      # async engine, get_session, SessionDep
│   └── security.py      # require_api_key
├── models/              # SQLAlchemy 2.0 declarative models, all subclassing base.Base
└── <feature>/           # accounts, categories, movements, system
    ├── router.py
    └── schemas.py
```

Models live in `app/models/`, **not** inside the feature folder, so one metadata object knows every
table. Schemas stay with the feature. A new feature means: `app/models/<feature>.py`,
`app/<feature>/{__init__,router,schemas}.py`, and one `app.include_router(...)` line in `main.py`.

Note: `backend/README.md` still documents an older flat layout (`app/config.py`, `app/db.py`,
`app/auth.py`). The paths above are the real ones.

## Core plumbing

**`core/config.py`** — a single `Settings` instance exported as `settings`. Precedence is shell env
> `.env` > field default; the defaults in the class are only the last-resort fallback. Import
`settings`, never re-instantiate `Settings()`.

**`core/database.py`** — the engine and sessionmaker are built lazily and cached with `@lru_cache`,
so there is exactly one connection pool per process. `statement_cache_size=0` is **mandatory**:
Supabase's pgbouncer pooler in transaction mode rejects prepared statements — removing it breaks
every query in production. `expire_on_commit=False` keeps ORM objects usable after commit.

Endpoints take the session through the alias, not a raw `Depends`:

```python
async def get_things(session: SessionDep) -> list[ThingRead]: ...
```

**`core/security.py`** — `require_api_key` compares the `X-API-Key` header with `settings.api_key`
using `secrets.compare_digest`. Apply it **at the router level**, not per endpoint:

```python
router = APIRouter(prefix="/things", tags=["things"], dependencies=[Depends(require_api_key)])
```

Only `GET /health` is public.

## Models

SQLAlchemy 2.0 declarative style — `Mapped[...]` + `mapped_column(...)`, subclassing
`app.models.base.Base`. The database owns its defaults, so use `server_default` (e.g.
`func.gen_random_uuid()`, `func.now()`, `"false"`) rather than Python-side defaults, and `refresh()`
after commit to read them back.

Postgres enums are declared in the migrations, not by SQLAlchemy. Mirror them as `enum.StrEnum` and
map them with `create_type=False` so the ORM never tries to create or drop the type:

```python
PgEnum(AccountInterestType, name="account_interest_type", create_type=False,
       values_callable=lambda enum_cls: [m.value for m in enum_cls])
```

`values_callable` matters: without it SQLAlchemy sends the member *names* (`SIMPLE`) instead of the
values (`simple`) the Postgres type expects.

Views get a read-only model (see `models/account_balances.py`): map it like a table with a primary
key, but never insert, update or delete through it.

## Schemas

Pydantic schemas are written by hand and kept separate from the models (SQLAlchemy, not SQLModel —
deliberate decision). Per feature, usually three:

- `XCreate` — required fields, validation constraints (`Field(gt=0)`), no server-generated columns.
- `XRead` — the response shape, with `model_config = {"from_attributes": True}` so endpoints can do
  `XRead.model_validate(db_obj)`.
- `XUpdate` — every field optional, consumed with `model_dump(exclude_unset=True)`.

Enums are imported from the model module so schema and table can't drift.

## Router conventions

Each router repeats a small set of local helpers. Copy the pattern into new features instead of
abstracting it into a shared base — the error messages and status codes are domain-specific.

**404 lookup** — `get_<thing>_or_404(session, id)` using `session.get(...)`, raising
`HTTPException(status.HTTP_404_NOT_FOUND, "Thing not found")`.

**Commit wrapper** — never call `session.commit()` directly in an endpoint. Wrap it so an
`IntegrityError` becomes a meaningful response: catch, `await session.rollback()`, then raise. The
status depends on what the constraint means:

| Situation                                   | Status | Example                       |
| ------------------------------------------- | ------ | ----------------------------- |
| Unique clash (a name already taken)         | 409    | `categories.commit_or_409`    |
| Foreign key pointing nowhere                | 422    | `movements.commit_or_422`     |
| Named check constraint with a business rule | 409    | `accounts.commit_or_409`      |

`accounts/router.py` goes one step further: it reads `constraint_name` off the asyncpg cause
(`exc.orig.__cause__`) and maps it through a module-level `_CONSTRAINT_MESSAGES` dict to a human
message, falling back to a generic one. Extend that dict when adding named constraints.

**Endpoint shape**

- `POST` → `status_code=status.HTTP_201_CREATED`, build the model with `Thing(**payload.model_dump())`,
  `session.add`, commit wrapper, `await session.refresh(db_obj)`, return `ThingRead.model_validate(...)`.
- `PATCH` → load via the 404 helper, `payload = thing.model_dump(exclude_unset=True)`, `setattr` each
  key, commit, refresh, validate.
- `DELETE` → `status_code=status.HTTP_204_NO_CONTENT` with a `-> None` handler.
- `GET` list → build a `select()` and chain `.where(...)` per optional filter so they combine
  (see `get_movements`); return a list comprehension of `model_validate`.

Return types are declared on the function (`-> list[ThingRead]`), not via `response_model=`.

## Cross-field validation (the important one)

Rules involving more than one field live as **plain functions in `schemas.py`** that raise
`ValueError` — e.g. `check_category_shape`, `check_counterparty_account_shape` in
`movements/schemas.py`. They are called from two places:

1. On create, from a Pydantic `@model_validator(mode="after")` on `XCreate`. FastAPI turns the
   `ValueError` into a 422 automatically.
2. On PATCH, **from the router**, against the merged old + new values, wrapping the `ValueError` in
   an `HTTPException(422)` by hand.

The second is not redundant: a partial patch doesn't know the row's current `kind`, so validating
the payload alone would let `{"category_id": null}` through on an expense. Merge first
(`payload.get("kind", db_obj.kind)`), validate, then apply. Keep this split for any new conditional
rule.

Some invariants are enforced imperatively rather than by the database — `clear_other_primary_accounts`
runs an `UPDATE` unsetting `is_primary` on the other rows before saving a new primary account.

## Database and migrations

The schema's source of truth is `../supabase/migrations/NNNN_*.sql`, mirrored into the Supabase
project (the `supabase` MCP server can inspect the remote side). There is no Alembic: write the SQL
migration, apply it, then update the model to match. Never let SQLAlchemy create or alter tables.

Tables: `accounts`, `categories`, `movement_templates`, `movements`, `budgets`,
`surplus_allocation_rules`, `monthly_balances`. Enum types: `movement_kind`, `movement_origin`,
`category_kind`, `account_interest_type`, `template_frequency`. `updated_at` is maintained by the
`set_updated_at()` trigger, so don't set it from Python.

`account_balances` is a **view**, not a table: `initial_balance` + income − expenses − outgoing
transfers + incoming transfers. It is the source of truth for balances — never store a balance in a
column; `monthly_balances` only snapshots the view at month close.

## Current API surface

| Feature      | Endpoints                                                                 |
| ------------ | ------------------------------------------------------------------------- |
| `system`     | `GET /health` (public), `GET /db-check`                                    |
| `categories` | `GET /categories`, `POST`, `PATCH /{id}`, `DELETE /{id}`                   |
| `accounts`   | `GET /accounts`, `GET /{id}`, `GET /{id}/balance`, `POST`, `PATCH`, `DELETE` |
| `movements`  | `GET /movements` (filters: `account_id`, `category_id`, `month=YYYY-MM`), `POST`, `PATCH /{id}`, `DELETE /{id}` |

`movement_templates`, `budgets`, `surplus_allocation_rules` and `monthly_balances` exist in SQL but
have no API yet — that's the remaining backend work.

## Style

Ruff with line-length 100 and `E,F,I,UP,B,SIM`, double quotes, target `py313`. Modern typing
throughout: `str | None`, `list[X]`, `Annotated[...]` for dependencies, no `Optional`/`List`. Code
comments in English, and short docstrings explaining *why* on the non-obvious helpers — that's the
house style here, since the user reads this code to learn FastAPI.
