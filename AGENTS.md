# AGENTS.md

## Cursor Cloud specific instructions

LogixMitra is a single product with two dev services. See `README.md` for the
product overview and the canonical run/login details.

### Services

| Service | Location | Dev command | URL |
|---|---|---|---|
| Backend (Django REST API) | `logixmitra_backend` | `logixmitra_backend/.venv/bin/python manage.py runserver 0.0.0.0:8000` | http://127.0.0.1:8000 (API base `…/api`) |
| Frontend (React + Vite) | `logixmitra_web` | `npm run dev` (from `logixmitra_web`) | http://localhost:8080 |

The frontend hardcodes the API base to `http://127.0.0.1:8000/api` by default, so
run the backend on port 8000. Login with `admin@logixmitra.com` / `admin123`
(created by `python manage.py seed_data`).

### Non-obvious notes

- Python deps live in a virtualenv at `logixmitra_backend/.venv` (the update
  script creates it and installs `requirements.txt`). Always invoke the backend
  with `logixmitra_backend/.venv/bin/python`, not the system `python3`.
- The repo is Windows-oriented: `start-backend.bat` / `start-frontend.bat` and
  `tools/python312/` are Windows-only; on Linux use the venv + system Node.
- `db.sqlite3` is committed and pre-seeded, so no DB server is needed. Running
  the app mutates `db.sqlite3` and Django recompiles committed `*.pyc` files —
  do NOT commit those incidental changes.
- Frontend uses **npm** (`package-lock.json`). A stale `bun.lockb` also exists;
  ignore it and use npm.
- Lint: `npm run lint` (from `logixmitra_web`) passes with warnings only.
  Tests: `npm test` (Vitest, 1 placeholder test); backend `manage.py test` has
  no tests yet.
- Known pre-existing app bug (not an environment issue): the in-UI "Create
  Order" form can return a 500 due to a frontend/backend payload mismatch;
  login and browsing all work through the UI.
