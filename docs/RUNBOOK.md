# TaxMate AI – Runbook

Operational guide for running, deploying, and troubleshooting TaxMate AI.

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- npm 9+

### Backend + Example

```bash
# Install dependencies
npm install

# Run example (prints JSON to console)
npm run dev

# Run tests
npm test

# Build
npm run build
```

### HTTP API Server

```bash
# Development (with pretty logs)
npm run dev:server

# Production
npm run build
npm run start:server
```

Server starts on `http://localhost:3000` (or `PORT` env var).

### Frontend (React UI)

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # output in frontend/dist
```

---

## Deployment (Railway + Qdrant)

- **Full guide:** [docs/DEPLOYMENT.md](DEPLOYMENT.md)
- **Railway:** Deploy from GitHub; set `GEMINI_API_KEY`, `QDRANT_URL` (Railway Qdrant plugin or Qdrant Cloud).
- **Health:** `/health` (liveness); `/health?readiness=1` (checks Qdrant when `QDRANT_URL` is set).
- **Ingest:** Run `npm run ingest` once after deploy (same `QDRANT_URL` and `GEMINI_API_KEY`).

---

## CI Without Hosted Runners (Billing Locked)

If GitHub-hosted runners are blocked, add a **self-hosted runner** and point CI to it:

1) Repo → Settings → Actions → Runners → New self-hosted runner (Linux x64).  
2) Follow GitHub’s instructions (`config.sh` with repo URL/token, then `./run.sh`).  
3) In `.github/workflows/ci.yml`, set `runs-on: [self-hosted, linux, x64]` for the jobs you want to run.

Details: [docs/SELF_HOSTED_RUNNER.md](SELF_HOSTED_RUNNER.md)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (liveness; optional `?readiness=1` for Qdrant) |
| POST | `/api/calculate` | Calculate tax |
| POST | `/api/chat` | AI chat (requires GEMINI_API_KEY) |

### Health Check

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2025-..."}
```

### Calculate Tax

```bash
curl -X POST http://localhost:3000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "incomeHeads": {
      "salary": 1200000,
      "houseProperty": 0,
      "business": 0,
      "capitalGainsOther": 0,
      "otherSources": 50000,
      "vda": 0,
      "stcgListedEquity": 0,
      "ltcgListedEquity": 0
    },
    "deductions": {
      "section80C": 150000
    }
  }'
```

---

## Docker

### Build Image

```bash
docker build -t taxmate-ai .
```

### Run Container

```bash
docker run -p 3000:3000 -e PORT=3000 taxmate-ai
```

### Health Check (for orchestrators)

```bash
curl http://localhost:3000/health
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `LOG_LEVEL` | info | Pino log level (debug, info, warn, error) |
| `NODE_ENV` | production | Set to `development` for pretty logs |

---

## Deployment Checklist

1. **Build backend:** `npm run build`
2. **Build frontend:** `cd frontend && npm run build`
3. **Set PORT** if not 3000
4. **Start server:** `npm run start:server` or `node dist/server/index.js`
5. **Verify health:** `curl http://localhost:3000/health`

---

## Troubleshooting

### Server won't start

1. Check port is free: `lsof -i :3000`
2. Check logs for errors
3. Ensure `npm run build` completed successfully

### 400 Validation Error

- Check request body matches `CalculateTaxRequest` schema
- Ensure all income heads are non-negative numbers
- Check deduction caps (80C ≤ 1.5L, 80CCD1B ≤ 50k)

### 429 Rate Limited

- Default: 100 requests per 15 minutes per IP
- Wait and retry, or adjust rate limit in `src/server/index.ts`

### 500 Internal Error

- Check server logs for stack trace
- Likely a bug – report with request body (redact sensitive data)

### Frontend not loading

- Ensure `cd frontend && npm run build` was run
- Server serves `frontend/dist/` as static files

---

## Monitoring

- **Logs:** Structured JSON (Pino) to stdout
- **Health:** `GET /health` returns 200 if healthy
- **Metrics:** Not yet implemented (consider Prometheus in future)

---

## Rollback

1. Redeploy previous Docker image
2. Or: `git checkout <previous-commit> && npm run build && npm run start:server`
