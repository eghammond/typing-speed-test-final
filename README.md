# speedtype

A Monkeytype-style typing speed test with login and persisted per-user stats.

**Live:** https://frontend-ashy-one-89.vercel.app (backend: https://typing-speed-test-backend-xt1x.onrender.com)

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

Currently deployed on Render (backend) + Vercel (frontend), both free tiers:

1. Push this repo to GitHub.
2. **Render** (backend): create a Postgres instance, then a Web Service with root directory `backend/`, build command `pip install -r requirements.txt`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and a **health check path of `/health`** (without this, Render's free-tier edge routing intermittently 404s even while the app is healthy). Env vars: `SECRET_KEY` (random), `DATABASE_URL` (the Postgres instance's internal connection string), `CORS_ORIGINS` (start with `http://localhost:5173`).
3. **Vercel** (frontend): new project with root directory `frontend/`. Set env var `VITE_API_URL` to the Render URL. Deploy.
4. Back on Render, update `CORS_ORIGINS` to include the Vercel URL and redeploy (env var changes need an explicit redeploy, not just a restart, to take effect).

**Known free-tier caveats:**
- Render's free Postgres expires 30 days after creation — back up or upgrade before then.
- Render's free web service spins down after inactivity; the first request after idle can take ~30-50s.
- Railway was the original target (see `backend/Procfile`) but requires a paid plan once the trial expires; the app runs unmodified on either.

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

## Acknowledgements

Built by [Claude Code](https://claude.com/claude-code), drawing on two earlier repos: a prototype frontend ([typing-speed-test](https://github.com/eghammond/typing-speed-test)) and a backend built with Claude's guidance ([typing-stats-tracker-backend](https://github.com/eghammond/typing-stats-tracker-backend)).
