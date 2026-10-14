# Deploying Evangadi Forum

The site has three parts to host: a MySQL database, the backend (a long-running Node process) and the frontend (static files).

## Before you choose a host

- **Backend must be a normal server process.** Socket.IO needs long-lived connections, so serverless hosts (for example Vercel functions) are not suitable for the backend. Render, Railway, Fly.io, a VPS or a cPanel Node app all work.
- **Uploaded files need persistent storage.** Chat attachments (`backend/uploads/chat`) and PDFs (`backend/uploads/rag`) are saved on disk. On hosts with a temporary disk they disappear on every redeploy. Attach a persistent volume at `backend/uploads`, or use a VPS.
- **The frontend can be on any static host** (Netlify, Vercel, Cloudflare Pages, Nginx). Refreshing a page such as `/discussion-rooms` needs a fallback to `index.html`. `frontend/public/_redirects` (Netlify, Cloudflare) and `frontend/vercel.json` (Vercel) already do this. For Nginx use `try_files $uri /index.html;`.

## Steps

1. **Database.** Create a MySQL database on your host. For a new database run `backend/db/schema.sql`. For an existing one run the missing files in `backend/db/migrations/` in order (see [tasks/database-migrations.md](tasks/database-migrations.md)). Do not run the full schema on a database that already holds data.
2. **Backend.** Deploy the `backend` folder with Node 18.18 or newer.
   - Build command: `npm ci`. Start command: `npm start`. Or use the included `backend/Dockerfile`.
   - Set these environment variables:
     `NODE_ENV=production`, `PORT` (if your host does not set it), `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, a new random `JWT_SECRET` of at least 32 characters, `CLIENT_ORIGIN` (the exact frontend URL, no trailing slash), `FRONTEND_URL` (same URL, used in password reset emails), `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY` with the two Gemini model names, and `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD` for password reset.
   - Open `https://your-backend/health`. It should return `{"status":"ok"}`.
3. **Frontend.** Build with `npm ci && npm run build` (output folder `dist`). Set these before building, because Vite bakes them in:
   `VITE_API_BASE_URL=https://your-backend` and `VITE_GOOGLE_CLIENT_ID=...`.
4. **Google sign-in.** In Google Cloud Console add your frontend URL to the OAuth client's Authorized JavaScript origins.
5. **HTTPS.** Use HTTPS for both sites. Voice messages need it, and browsers block mixed content.

## Checklist after deploying

- Register, sign in and reload a deep link such as `/discussion-rooms` (no 404).
- Post a question and run a search (confirms the database and Gemini key).
- Send a chat message from two accounts and see it arrive live (confirms Socket.IO and CORS).
- Attach a file, redeploy the backend, and check the file is still there (confirms persistent storage).
- Request a password reset email.

## Notes

- The server prints a warning at startup in production if `CLIENT_ORIGIN` is missing or `JWT_SECRET` is short.
- Rate limiting and security headers are already enabled. See [tasks/final-cleanup-and-hardening.md](tasks/final-cleanup-and-hardening.md).
- Keep database and `uploads` backups together.
