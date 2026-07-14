# AGENTS.md

## Cursor Cloud specific instructions

LogixMitra is a two-service app: a Django REST API (`logixmitra_backend`) and a Vite/React/TypeScript frontend (`logixmitra_web`). The Windows `.bat` scripts and the bundled `tools/python312` are for local Windows dev only — ignore them on Linux.

### Environment
- Python deps live in a virtualenv at `/workspace/.venv` (gitignored). Activate with `source /workspace/.venv/bin/activate` before running any `manage.py` command.
- The update script recreates/refreshes `/workspace/.venv` and runs `npm install` in `logixmitra_web`.
- Backend uses SQLite by default (`logixmitra_backend/db.sqlite3`, already committed & seeded). No separate DB service is needed. Set `USE_POSTGRES=true` (plus `DB_*` env vars) only if you want Postgres.

### Running (dev)
- Backend: from `logixmitra_backend`, `python manage.py runserver 0.0.0.0:8000` (activate venv first).
- Frontend: from `logixmitra_web`, `npm run dev` → serves on port 8080 (configured in `vite.config.ts`, not Vite's default 5173).
- Frontend talks to the API at `VITE_API_URL` (default `http://127.0.0.1:8000/api`); defaults work without any `.env`.

### Gotchas
- Auth API routes have NO trailing slash (e.g. `POST /api/auth/login`, `/api/auth/me`). Health check is `GET /api/health/` (with trailing slash).
- Seeded login: `admin@logixmitra.com` / `admin123`. Re-seed after a DB reset with `python manage.py seed_data`.
- `manage.py migrate` warns that `accounts` has model changes not in a migration; this is a pre-existing repo state and does not block running the app (the committed SQLite DB is already in sync). Do not run `makemigrations` unless intentionally changing models.
- An in-process APScheduler tracking cron starts automatically with the backend; it no-ops without courier API credentials (`EKART_*`, `SMC_*`, `DELHIVERY_TOKEN`).

### Lint / test
- Frontend lint: `npm run lint` (ESLint; currently 0 errors, warnings only).
- Frontend tests: `npm run test` (Vitest).
- Backend has no automated test suite yet (`python manage.py test` finds 0 tests). Use `python manage.py check` for a quick sanity check.
