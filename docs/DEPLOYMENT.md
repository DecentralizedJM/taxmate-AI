# TaxMate AI – Deployment Guide (Railway + Qdrant)

Deploy TaxMate AI on **Railway** with **Qdrant** as the vector store for RAG.

---

## Prerequisites

- [Railway](https://railway.app) account
- [Google AI Studio](https://aistudio.google.com) API key (Gemini)
- (Optional) Qdrant Cloud or Railway Qdrant plugin

---

## 1. Deploy to Railway

### Option A: Deploy from GitHub

1. **Connect repo**
   - Railway Dashboard → New Project → Deploy from GitHub
   - Select your `taxmate-AI` repository

2. **Build**
   - Railway uses `railway.toml` or Nixpacks/Dockerfile
   - With `railway.toml`: build runs `npm ci && npm run build && cd frontend && npm ci && npm run build`
   - With **Dockerfile**: Railway builds the image and runs `npm start` (serves backend + frontend)

3. **Variables**
   - Project → Variables → Add:
     - `GEMINI_API_KEY` (required for chat)
     - `QDRANT_URL` (see step 2 if using Qdrant)
     - Optional: `CORS_ORIGIN`, `LOG_LEVEL`, `RATE_LIMIT_MAX`

4. **Domain**
   - Settings → Generate Domain (e.g. `taxmate-ai.up.railway.app`)

### Option B: Deploy with Dockerfile

- Use the repo Dockerfile; Railway will build and run the container.
- Ensure `PORT` is used (Railway sets it); the app already reads `process.env.PORT`.
- No need to set a custom start command if `CMD ["node", "dist/server/index.js"]` is used and `npm start` runs that.

---

## 2. Qdrant Vector Store

### Option A: Railway Qdrant Plugin

1. In the same project: **New → Database → Add Qdrant**
2. Railway provisions Qdrant and sets `QDRANT_URL` (and optionally `QDRANT_API_KEY`) on your app service via **Variables** or **Reference**.
3. In your **Web Service** (TaxMate AI), add a variable reference:
   - Variable: `QDRANT_URL` → Reference: `QDRANT_PUBLIC_URL` (or the name Railway shows for the Qdrant service)
4. Redeploy the app so it gets the Qdrant URL.

### Option B: Qdrant Cloud

1. Create a cluster at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Copy cluster URL and API key
3. In Railway (TaxMate AI service) set:
   - `QDRANT_URL=https://xxx.xxx.xxx.qdrant.io`
   - `QDRANT_API_KEY=your_api_key`

### Option C: External / Self-hosted Qdrant

- Set `QDRANT_URL` to your Qdrant endpoint (e.g. `https://qdrant.example.com` or `http://host:6333` for private network).
- If using API key auth, set `QDRANT_API_KEY`.

### Ingest Knowledge After Qdrant Is Set

- Run ingestion **once** after first deploy (from your machine or a one-off job):

```bash
# Set same QDRANT_URL (and QDRANT_API_KEY if used) as in Railway
export QDRANT_URL=https://your-qdrant-url
export GEMINI_API_KEY=your_gemini_key
npm run ingest
```

- Optional: add a **one-off Railway job** or use Railway’s “Run Command” with the same env to run `npm run ingest` against the same `QDRANT_URL`.

---

## 3. Health & Readiness

- **Liveness:** `GET /health`  
  Returns `200` and basic status (env, gemini configured, qdrant URL set).
- **Readiness (with Qdrant check):** `GET /health?readiness=1`  
  If `QDRANT_URL` is set, also checks Qdrant connectivity. Returns `503` if Qdrant is unreachable.

In Railway Dashboard → your service → **Settings** → **Health Check**:

- **Health Check Path:** `/health`
- Optionally use **Custom** and path `/health?readiness=1` to also verify Qdrant before marking the deployment ready.

---

## 4. Environment Variables Summary

| Variable              | Required | Description |
|----------------------|----------|-------------|
| `PORT`               | Set by Railway | Server port |
| `GEMINI_API_KEY`     | Yes (for chat) | Google Gemini API key |
| `QDRANT_URL`         | No (for RAG)   | Qdrant endpoint (Railway plugin or Cloud URL) |
| `QDRANT_API_KEY`     | No             | Qdrant API key (Cloud / secured instance) |
| `QDRANT_COLLECTION`  | No             | Collection name (default: `tax_knowledge`) |
| `QDRANT_TIMEOUT_MS`  | No             | Timeout in ms (default: 10000) |
| `QDRANT_MAX_RETRIES` | No             | Init retries (default: 3) |
| `CORS_ORIGIN`        | No             | Allowed origins, comma-separated |
| `LOG_LEVEL`          | No             | `info` \| `debug` \| `warn` \| `error` |
| `RATE_LIMIT_MAX`     | No             | Max requests per window (default: 100) |
| `RATE_LIMIT_WINDOW_MS` | No           | Window in ms (default: 900000) |
| `SUPABASE_*`         | No             | For auth/persistence |

---

## 5. Post-Deploy Checklist

- [ ] `GEMINI_API_KEY` set; `/api/chat` works
- [ ] If using RAG: `QDRANT_URL` set; run `npm run ingest` once; `/health?readiness=1` returns 200
- [ ] Frontend loads at the Railway URL (same origin; no `CORS_ORIGIN` needed)
- [ ] If frontend is on another domain: set `CORS_ORIGIN` and test from that origin

---

## 6. Troubleshooting

- **Chat returns 500 / "GEMINI_API_KEY required"**  
  Add `GEMINI_API_KEY` in Railway Variables and redeploy.

- **RAG not used / no context in answers**  
  Ensure `QDRANT_URL` is set and ingestion was run. Check logs for “RAG retriever initialized” or “Qdrant not available”.

- **Readiness fails (503)**  
  Check `QDRANT_URL` and `QDRANT_API_KEY` (if required). Ensure Qdrant is reachable from Railway (same region / network if using Railway plugin).

- **Rate limit (429)**  
  Increase `RATE_LIMIT_MAX` or `RATE_LIMIT_WINDOW_MS` in Railway Variables.

- **CORS errors from custom frontend**  
  Set `CORS_ORIGIN` to the exact frontend origin(s), comma-separated.
