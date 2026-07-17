# LogixMitra

Smart logistics management platform. Two services in one repo:

- `logixmitra_backend/` — Django REST API (Python 3.12, SQLite by default), served on `:8000`.
- `logixmitra_web/` — React + Vite + TypeScript SPA, dev server on `:8080`.

The frontend talks to the backend at `http://127.0.0.1:8000/api` (see `logixmitra_web/services/config.js`). See `README.md` for the feature overview and login credentials.

## Cursor Cloud specific instructions

Dependencies (backend venv at `logixmitra_backend/.venv` and frontend `node_modules`) are installed by the startup update script; do not reinstall them manually unless something is broken.

### Running the services (dev mode)

- Backend: from `logixmitra_backend/`, run `.venv/bin/python manage.py runserver 0.0.0.0:8000`. Always use the venv interpreter (`.venv/bin/python`), not system `python3`.
- Frontend: from `logixmitra_web/`, run `npm run dev` (Vite on port `8080`, configured in `vite.config.ts`).

Ignore `README.md`'s Windows instructions (`start-backend.bat`, `tools/python312/`); that bundled Python is Windows-only `.dll`/`.pyd` binaries and does not run on Linux.

### Database / login

- Default DB is SQLite (`logixmitra_backend/db.sqlite3`), which is committed and already seeded. No external DB is needed. PostgreSQL is only used when `USE_POSTGRES=true`.
- Running the app mutates the committed `db.sqlite3` and regenerates committed `__pycache__/*.pyc`; these show up as `git` changes. Do not commit those runtime artifacts.
- Seeded admin login: `admin@logixmitra.com` / `admin123`. To re-seed: `.venv/bin/python manage.py seed_data`.
- Login API is `POST /api/auth/login` (note: no trailing slash; the trailing-slash variant 404s). It returns `{ data: { token } }`; the SPA stores the JWT in `localStorage`.

### Lint / test / build

- Frontend lint: `npm run lint` (currently passes with warnings only, 0 errors).
- Frontend tests: `npm run test` (Vitest).
- Frontend build: `npm run build`.
- Backend: `.venv/bin/python manage.py check`; `.venv/bin/python manage.py test` (test suite is currently empty stubs).

### Known gotchas

- `manage.py migrate` reports the `accounts` app has model changes not captured in a migration. The committed DB already matches the running code, so the app works without running `makemigrations`. Do not add migrations unless intentionally changing models.
- Backend integrations (Shopify/WooCommerce/Amazon) and some tracking endpoints are stubs/mocks; external courier APIs (eKART/Delhivery/SMC) require credentials via env vars and are optional for local dev.
