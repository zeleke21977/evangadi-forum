# Evangadi Forum

A full-stack forum: React (Vite) frontend and an Express + MySQL backend with Socket.IO.

- `frontend/` the web app
- `backend/` the API, database scripts and file uploads
- `docs/` all task notes, milestone detail and the deployment guide. Start with [docs/README.md](docs/README.md).

## Run locally

```bash
# backend
cd backend && cp .env.example .env   # fill in the values
npm ci && npm run dev                # http://localhost:3777

# frontend
cd frontend && cp .env.example .env
npm ci && npm run dev                # http://localhost:5173
```

Create the database from `backend/db/schema.sql`, or apply the migrations in `backend/db/migrations/` to an existing one.
