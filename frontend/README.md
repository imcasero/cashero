# Cashero — frontend

React 19 + TypeScript on Vite, talking to the FastAPI backend in `../backend`.

```bash
cp .env.example .env   # once per clone
pnpm install
pnpm dev               # http://localhost:5173
```

Use `pnpm` only — mixing in npm or yarn desyncs `pnpm-lock.yaml`.

## Environment

| Variable       | Default                 | What it does                          |
| -------------- | ----------------------- | ------------------------------------- |
| `VITE_API_URL` | `http://localhost:8000` | Base URL the browser calls the API on |

Only `VITE_`-prefixed variables reach the browser, and Vite inlines them at
build time — restart the dev server after editing `.env`. `src/lib/env.ts`
reads and normalizes the value, and throws at startup if it is missing, so a
misconfigured environment fails loudly instead of firing requests at
`undefined/health`. `../dev.sh` passes `VITE_API_URL` in the shell environment,
which overrides `.env`.

## Layout

```
src/
├── lib/env.ts   # env parsing + validation
├── lib/api.ts   # fetch wrapper (ApiError) and typed endpoints
├── App.tsx      # backend connection status
└── index.css    # base styles, light/dark
```

Add endpoints next to `getHealth` in `src/lib/api.ts` so every call shares the
base URL, JSON headers, and error handling.

## Commands

| Command        | What it does                        |
| -------------- | ----------------------------------- |
| `pnpm dev`     | Dev server with HMR                 |
| `pnpm build`   | Type-check (`tsc -b`) and build      |
| `pnpm preview` | Serve the production build          |
| `pnpm lint`    | Run Oxlint                          |
