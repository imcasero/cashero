# Cashero

Monorepo with a FastAPI backend and a React + TypeScript (Vite) frontend.

```
cashero/
├── backend/   # FastAPI app, managed with uv
├── frontend/  # React 19 + Vite, managed with pnpm
└── dev.sh     # Local dev: installs dependencies and runs both services
```

## Requirements

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (installs Python 3.13 for you)
- [Node.js](https://nodejs.org) 20.19+ / 22.12+ or newer, and [pnpm](https://pnpm.io/installation)

## Quick start

```bash
./dev.sh
```

It installs the dependencies of both projects (`uv sync` and `pnpm install`),
starts both dev servers with hot reload, and prints their URLs:

| Service  | URL                        |
| -------- | -------------------------- |
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000      |
| API docs | http://localhost:8000/docs |
| ReDoc    | http://localhost:8000/redoc |

`Ctrl+C` stops both.

Useful variants:

```bash
./dev.sh backend                  # only the API
./dev.sh frontend                 # only the web app
BACKEND_PORT=8001 ./dev.sh        # change the API port
FRONTEND_PORT=5174 ./dev.sh       # change the web port
```

The frontend receives the API URL through `VITE_API_URL`, which the script
derives from `BACKEND_PORT`.

## Running the services by hand

### Backend

```bash
cd backend
uv sync                                   # create .venv and install dependencies
uv run fastapi dev main.py                # http://localhost:8000
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev                                  # http://localhost:5173
```

## Common commands

| Command                          | Where       | What it does                         |
| -------------------------------- | ----------- | ------------------------------------ |
| `uv sync`                        | `backend/`  | Install/refresh Python dependencies  |
| `uv add <package>`               | `backend/`  | Add a dependency and update the lock |
| `uv run fastapi dev main.py`     | `backend/`  | Dev server with auto-reload          |
| `pnpm dev`                       | `frontend/` | Vite dev server with HMR             |
| `pnpm build`                     | `frontend/` | Type-check and build for production  |
| `pnpm preview`                   | `frontend/` | Serve the production build           |
| `pnpm lint`                      | `frontend/` | Run Oxlint                           |

Always use `pnpm` for the frontend — mixing it with npm or yarn will desync
`pnpm-lock.yaml`.

## Troubleshooting

**`Port 5173/8000 already in use`** — the script refuses to start on a busy
port. Stop the process using it, or pick another one with `BACKEND_PORT` /
`FRONTEND_PORT`.

**`falta 'uv'` / `falta 'pnpm'`** — install the missing tool with the link the
script prints, then run `./dev.sh` again.

**Dependencies look stale** — the script runs `uv sync` and `pnpm install` on
every start, so restarting it is enough after editing `pyproject.toml` or
`package.json`.
