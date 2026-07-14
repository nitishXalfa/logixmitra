<<<<<<< HEAD
# LogixMitra

Smart logistics management platform — orders, couriers, COD remittance, finance & reports.

## Project Structure

```
logixmitra/
├── logixmitra_backend/   # Django REST API (Python)
├── logixmitra_web/       # React + Vite frontend
├── logixmitra_api/       # Legacy Node.js API (deprecated)
├── tools/python312/      # Portable Python for local dev
├── start-backend.bat     # Start Django server
└── start-frontend.bat    # Start Vite dev server
```

## Quick Start (Local)

### 1. Backend (Django)
```bat
start-backend.bat
```
Or manually:
```bat
tools\python312\python.exe logixmitra_backend\manage.py runserver 8000
```

### 2. Frontend (React)
```bat
start-frontend.bat
```
Or manually:
```bat
cd logixmitra_web
npm install
npm run dev
```

### 3. Login
- **URL:** http://localhost:8080
- **Email:** admin@logixmitra.com
- **Password:** admin123

## Features

- **Auto Order Reference ID:** `LMX-YYYYMMDD-XXXXXXXX` (unique)
- **Server-side Pagination:** Orders & wallet APIs
- **Tracking Cron:** Auto status updates every 50 minutes (APScheduler)
- **Reports:** Dashboard & analytics with revenue, courier, seller, RTO data
- **Finance & COD:** Wallet ledger + COD remittance reports
- **Branding:** LogixMitra (no third-party copyright)

## API Base URL
- Local: `http://127.0.0.1:8000/api`
- Configure via `logixmitra_web/.env.local`

## Seed Data
```bat
tools\python312\python.exe logixmitra_backend\manage.py seed_data
```
=======
"# logixmitra" 
"# logixmitra" 
"# logixmitra" 
>>>>>>> be0fdedaad8ecd46a6c0f1ae12cf604144f1fc05
