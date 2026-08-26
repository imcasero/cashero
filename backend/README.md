# Cashero — backend

FastAPI application managed with [uv](https://docs.astral.sh/uv/).

```bash
cp .env.example .env   # once per clone
uv sync
uv run fastapi dev main.py   # http://localhost:8000, docs at /docs
```

## Environment

Settings live in `settings.py` (pydantic-settings), which loads `.env`
automatically when the process runs from this directory. Environment variables
override the file.

| Variable       | Default                 | What it does                               |
| -------------- | ----------------------- | ------------------------------------------ |
| `ENVIRONMENT`  | `local`                 | Environment name the API reports itself as |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated origins allowed by CORS    |

The browser blocks cross-origin API calls unless the frontend's origin is in
`CORS_ORIGINS`, so update it if you move the frontend off port 5173.
