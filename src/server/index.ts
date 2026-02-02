/**
 * TaxMate AI - HTTP API Server
 * Optimized for Railway + Qdrant deployment.
 * - Trust proxy, CORS, security headers
 * - Health + readiness for /health?readiness=1
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import path from 'node:path';
import { calculateTaxApi, type CalculateTaxRequest } from '../api/taxApi';
import { ValidationError } from '../errors';
import { createChatRouter } from './routes/chat';
import { createAuthRouter } from './routes/auth';
import { checkQdrantConnection } from '../rag/qdrant';

// Logger (JSON in production for Railway logs)
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// Create Express app
const app = express();

// Trust proxy (Railway / reverse proxy)
app.set('trust proxy', 1);

// Security headers (deployment-ready)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS (same-origin by default; CORS_ORIGIN for separate frontend on Railway)
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && corsOrigin.split(',').some((o) => o.trim() === origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

// Request logging (no body logging to avoid PII)
app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, _res) => `${req.method} ${req.url} completed`,
    customErrorMessage: (req, _res) => `${req.method} ${req.url} failed`,
  })
);

// Body parser with size limit
app.use(express.json({ limit: '10kb' }));

// Rate limiting on /api/* (configurable for Railway)
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
const apiLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Health check (liveness); ?readiness=1 checks Qdrant when QDRANT_URL is set
app.get('/health', async (req: Request, res: Response) => {
  const checkReadiness = req.query.readiness === '1' || req.query.readiness === 'true';
  const payload: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    gemini: !!process.env.GEMINI_API_KEY,
    qdrantUrl: process.env.QDRANT_URL ? '(set)' : null,
  };

  if (checkReadiness && process.env.QDRANT_URL) {
    const qdrant = await checkQdrantConnection();
    payload.qdrant = qdrant.ok ? 'ok' : qdrant.error;
    if (!qdrant.ok) {
      res.status(503).json(payload);
      return;
    }
  }

  res.json(payload);
});

// Calculate tax endpoint (direct calculation without AI)
app.post('/api/calculate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = req.body as CalculateTaxRequest;
    logger.info('Tax calculation requested');
    const result = calculateTaxApi(request);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Chat endpoint (AI-powered conversational interface)
app.use('/api/chat', createChatRouter());

// Auth endpoints (Supabase authentication)
app.use('/api/auth', createAuthRouter());

// Serve frontend static files in production
// In dist/, the frontend will be at ../../frontend/dist relative to dist/server/
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA fallback - serve index.html for non-API routes
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      // Frontend not built yet or not found
      res.status(404).json({ error: { message: 'Frontend not found. Run: cd frontend && npm run build' } });
    }
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ValidationError) {
    logger.warn({ code: err.code, field: err.field }, 'Validation error');
    res.status(400).json({
      error: {
        code: err.code,
        message: err.message,
        field: err.field,
      },
    });
    return;
  }

  // Unexpected error
  logger.error({ err }, 'Unexpected error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// Start server (Railway sets PORT)
const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      nodeEnv: process.env.NODE_ENV,
      gemini: !!process.env.GEMINI_API_KEY,
      qdrantUrl: process.env.QDRANT_URL ? '(set)' : null,
      supabase: !!process.env.SUPABASE_URL,
    },
    'TaxMate AI server started'
  );
});

export default app;
