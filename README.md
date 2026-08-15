# speedtype

A Monkeytype-style typing speed test with login and persisted per-user stats.

```
├── backend/     FastAPI + PostgreSQL REST API (auth, results, stats)
└── frontend/    Vite + TypeScript single-page app
```

## Running locally

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SECRET_KEY; DATABASE_URL can point at local Postgres or sqlite:///./dev.db
uvicorn app.main:app --reload
```

Generate a secret key with `python -c "import secrets; print(secrets.token_hex(32))"`.

API docs at `http://127.0.0.1:8000/docs`. Run tests with `python -m pytest app/tests/ -v` (uses an isolated SQLite DB).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # VITE_API_URL should point at the backend above
npm run dev
```

Open `http://localhost:5173`.

## Deployment

1. Push this repo to GitHub.
2. **Railway** (backend): new service with root directory `backend/`. Attach a Postgres plugin (sets `DATABASE_URL` automatically), set `SECRET_KEY`. Deploy and note the public URL.
3. **Vercel** (frontend): new project with root directory `frontend/`. Set env var `VITE_API_URL` to the Railway URL. Deploy and note the public URL.
4. Back in Railway, set `CORS_ORIGINS` to the Vercel URL (comma-separate with `http://localhost:5173` to keep local dev working) and redeploy.

## API overview

| Method | Endpoint          | Auth | Description                            |
| ------ | ----------------- | ---- | --------------------------------------- |
| GET    | `/health`         | No   | Health check.                           |
| POST   | `/auth/register`  | No   | Create a new user account.              |
| POST   | `/auth/login`     | No   | Log in, receive a JWT (30 min expiry).  |
| POST   | `/results`        | Yes  | Submit a typing test result.            |
| GET    | `/results`        | Yes  | List the current user's results.        |
| GET    | `/results/stats`  | Yes  | Aggregate stats (avg/best WPM, accuracy). |

Auth endpoints are rate limited (5/min); `/results` write is 10/min, reads 5/min.
