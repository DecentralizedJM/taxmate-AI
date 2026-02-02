/**
 * TaxMate AI - HTTP API Server
 * Express server with POST /api/calculate and GET /health endpoints.
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import path from 'node:path';
import { calculateTaxApi, type CalculateTaxRequest } from '../src/api/taxApi';
import { ValidationError } from '../src/errors';

// Logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// Create Express app
const app = express();

// Request logging (no body logging to avoid PII)
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} completed`,
    customErrorMessage: (req, res) => `${req.method} ${req.url} failed`,
  })
);

// Body parser with size limit
app.use(express.json({ limit: '10kb' }));

// Rate limiting on /api/* (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Calculate tax endpoint
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

// Serve frontend static files in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
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

// Start server
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'TaxMate AI server started');
});

export default app;
