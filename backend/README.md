# Cashero — backend

FastAPI application managed with [uv](https://docs.astral.sh/uv/).

```bash
cp .env.example .env   # once per clone
uv sync
uv run fastapi dev app/main.py   # http://localhost:8000, docs at /docs
```

## Layout

Everything lives in the `app/` package:

| Module          | Responsibility                                             |
| --------------- | --------------------------------------------------------- |
| `app/main.py`   | FastAPI instance, middleware, route wiring                 |
| `app/config.py` | `Settings` (pydantic-settings), loads `.env`               |
| `app/db.py`     | Async SQLAlchemy engine + `get_session` dependency         |
| `app/auth.py`   | `require_api_key` dependency (static `X-API-Key` header)   |

When a domain grows, give it its own folder (`app/transactions/{router,models,service,schemas}.py`).

## Environment

Environment variables override `.env`.

| Variable       | Default                 | What it does                                          |
| -------------- | ----------------------- | ---------------------------------------------------- |
| `ENVIRONMENT`  | `local`                 | Environment name the API reports itself as            |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated origins allowed by CORS               |
| `DATABASE_URL` | –                       | Supabase Postgres URL for SQLAlchemy (`postgresql+asyncpg://…`, pooler on port 6543) |
| `API_KEY`      | –                       | Static secret the client must send in `X-API-Key`     |

## Auth

Single-user app: every non-public endpoint depends on `require_api_key`, which
compares the `X-API-Key` header against `API_KEY`. `GET /health` is public;
`GET /db-check` requires the key and runs `select 1` to prove the DB connection.

Generate a key with `python -c "import secrets; print(secrets.token_urlsafe(32))"`.

## Database

`app/db.py` connects straight to Supabase's Postgres (Supabase *is* Postgres).
Inject `Depends(get_session)` to get an `AsyncSession`. The engine is created
lazily and once per process; `statement_cache_size=0` is required because the
Supabase pooler (pgbouncer) does not support prepared statements.

Schema lives in versioned migrations under `../supabase/migrations/` (mirrored
in the Supabase project). RLS is disabled on every table on purpose: this
backend is the only client and the sole security boundary.
