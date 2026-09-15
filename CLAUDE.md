# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scope: this file covers the monorepo as a whole — product, stack, ports, environment and deploy.
Each workspace has its own `CLAUDE.md` with the conventions for the code inside it:

- `backend/CLAUDE.md` — FastAPI, SQLAlchemy and router conventions.

## Memory (engram) — always on

Persistent memory via the engram MCP server is **mandatory** in this repo, not optional:

- At the start of a session (and after any compaction), call `mem_context` before doing work, and
  `mem_search` whenever the user refers to past work ("como hicimos antes", a previous endpoint, an
  earlier decision).
- Call `mem_save` **proactively** — without being asked — after every architectural decision, bug
  fix, new convention, config change, or non-obvious discovery. Do not batch it to the end.
- Before saying "done", call `mem_session_summary`.
- Memory is bookkeeping, never the answer: save first, then reply. If a memory call fails, deliver
  the answer anyway.

Much of the project's rationale (why SQLAlchemy and not SQLModel, why an API key and not JWT, the
Linear task being worked on) lives only in engram, not in the code.

## Product

Cashero is a **single-user** personal finance app: accounts, categories and movements (expenses,
income and transfers between accounts), plus recurring templates, budgets, a surplus-allocation
mechanism and an automatic month close that snapshots balances.

Being single-user drives most of the architecture: one static API key instead of real auth, RLS
disabled in Postgres, and no per-user scoping anywhere in the schema. Do not add multi-tenancy
concepts unless the user explicitly asks for them.

Work is tracked in Linear (project "Cashero", team Imcasero).

## Repository layout

```
cashero/
├── backend/            # FastAPI + SQLAlchemy async, managed with uv  (see backend/CLAUDE.md)
├── frontend/           # React 19 + Vite + TypeScript, managed with pnpm
├── supabase/migrations # Versioned SQL — the single source of truth for the schema
└── dev.sh              # Installs deps and runs both services
```

## Stack

**Backend** — Python 3.13, FastAPI, SQLAlchemy 2.0 async with asyncpg, pydantic-settings, Ruff.
Dependencies managed with **uv** (`uv sync`, `uv add`, `uv run`).

**Frontend** — React 19 (with the React Compiler babel plugin), Vite 8, TypeScript, Biome for
formatting and oxlint for linting. Dependencies managed with **pnpm** — never npm or yarn, it
desyncs `pnpm-lock.yaml`.

**Database** — Supabase used **only as Postgres** (project ref `sooipuhltfkzlkivwhtt`). No Supabase
client, no Supabase Auth, no Storage, no Edge Functions. RLS is off on every table on purpose: the
backend is the only client and the sole security boundary. The `supabase` MCP server is configured
in `.mcp.json` for inspecting the remote schema.

There is no test suite yet in either workspace.

## Running locally

```bash
./dev.sh              # both services
./dev.sh backend      # API only
./dev.sh frontend     # web only
```

`dev.sh` runs `uv sync` and `pnpm install` on every start, so restarting it is enough after editing
`pyproject.toml` or `package.json`. `Ctrl+C` stops both. It refuses to start if a port is busy.

| Service  | URL                         | Port var         |
| -------- | --------------------------- | ---------------- |
| Frontend | http://localhost:5173       | `FRONTEND_PORT`  |
| Backend  | http://localhost:8000       | `BACKEND_PORT`   |
| API docs | http://localhost:8000/docs  |                  |
| ReDoc    | http://localhost:8000/redoc |                  |

Two coupling rules that bite when changing ports:

- `dev.sh` exports `VITE_API_URL` derived from `BACKEND_PORT`, which **overrides** `frontend/.env`.
- Changing `FRONTEND_PORT` requires adding the new origin to `CORS_ORIGINS` in `backend/.env`, or
  the browser blocks every API call.

Running each service by hand: `cd backend && uv run fastapi dev app/main.py` /
`cd frontend && pnpm dev`.

## Environment

Each workspace ships a tracked `.env.example`; the real `.env` files are gitignored. Copy them once
per clone (`cp backend/.env.example backend/.env`, same for `frontend/`).

| Variable        | Where       | What it does                                                  |
| --------------- | ----------- | ------------------------------------------------------------- |
| `ENVIRONMENT`   | `backend/`  | Environment name the API reports (`local`/`staging`/`production`) |
| `CORS_ORIGINS`  | `backend/`  | Comma-separated allowed origins                                |
| `DATABASE_URL`  | `backend/`  | `postgresql+asyncpg://…` via the Supabase pooler (port 6543)    |
| `API_KEY`       | `backend/`  | Static secret required in the `X-API-Key` header                |
| `VITE_API_URL`  | `frontend/` | Base URL the browser calls                                     |
| `VITE_API_KEY`  | `frontend/` | Must match backend `API_KEY`                                   |

Backend settings are read through `app/core/config.py` (precedence: shell env > `.env` > field
default). On the frontend only `VITE_*` vars reach the browser and Vite **inlines them at build
time**, so restart the dev server after editing `.env`. That also means `VITE_API_KEY` is visible in
the bundle — it's a gate for a single-user app, not a real secret.

## Auth model

Every non-public endpoint requires the static `X-API-Key` header; only `GET /health` is public. The
frontend sends it from `src/lib/api.ts` on every request. Generate a key with
`python -c "import secrets; print(secrets.token_urlsafe(32))"`.

## Frontend

Still minimal. Two files carry the conventions:

- `src/lib/env.ts` — reads and validates `VITE_API_URL` / `VITE_API_KEY`, throwing at import time if
  either is missing, and normalizes the URL. Always read env through this module, never
  `import.meta.env` directly.
- `src/lib/api.ts` — `apiFetch<T>` wraps `fetch` with the JSON and `X-API-Key` headers and raises a
  typed `ApiError` (status `0` means the API is unreachable). All API calls go through it.

## Deploy

Not set up yet: there is no Vercel/Docker/CI configuration in the repo, and the only Postgres is the
remote Supabase project (already shared by local development). When deploy work starts, the decisions
to make are hosting for the FastAPI app, a build/host target for the Vite bundle, and setting
`ENVIRONMENT`, `CORS_ORIGINS` and a production `API_KEY` per environment. Don't assume a platform —
ask the user, and record the choice in engram.

## Tooling

| Command                 | Where       | What                                    |
| ----------------------- | ----------- | --------------------------------------- |
| `uv run ruff check .`   | `backend/`  | Lint (line-length 100, `E,F,I,UP,B,SIM`) |
| `uv run ruff format .`  | `backend/`  | Format (double quotes)                  |
| `pnpm lint`             | `frontend/` | oxlint                                  |
| `pnpm format`           | `frontend/` | Biome write (single quotes, width 100)  |
| `pnpm format:check`     | `frontend/` | Biome check                             |
| `pnpm build`            | `frontend/` | `tsc -b && vite build`                  |

Biome's linter is disabled on purpose — it formats, oxlint lints. Zed (`.zed/settings.json`) is
configured to format on save with Biome (TS/TSX/CSS/JSON) and Ruff (Python).

## Working conventions

- Code comments in English.
- Commit messages: `feat: …`, `refactor(backend): …`. No co-author trailer, no Linear reference in
  the message.
- One task at a time: implement it, let the user review, and commit only after their OK.
- The user reviews and learns from the code — prefer explaining the reasoning behind a change over
  landing large silent refactors.
