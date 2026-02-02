/**
 * Auth Routes
 * Handle authentication with Supabase
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseClient, isSupabaseConfigured } from '../../db/supabase';
import { UserRepository } from '../../db/repositories';
import pino from 'pino';

const logger = pino({ name: 'auth-api' });

/**
 * Middleware to extract and verify JWT token
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip auth if Supabase not configured
  if (!isSupabaseConfigured()) {
    req.user = { id: 'anonymous', email: null };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || null,
    };

    next();
  } catch (error) {
    logger.error({ error }, 'Auth error');
    res.status(500).json({ error: { code: 'AUTH_ERROR', message: 'Authentication failed' } });
  }
}

/**
 * Optional auth - sets user if token present, continues if not
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isSupabaseConfigured()) {
    req.user = { id: 'anonymous', email: null };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = undefined;
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) {
      req.user = {
        id: user.id,
        email: user.email || null,
      };
    }
  } catch {
    // Ignore auth errors in optional mode
  }

  next();
}

/**
 * Create the auth router
 */
export function createAuthRouter(): Router {
  const router = Router();

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  router.get('/me', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.id === 'anonymous') {
        res.json({ authenticated: false, user: null });
        return;
      }

      const supabase = getSupabaseClient();
      const userRepo = new UserRepository(supabase);
      const profile = await userRepo.getOrCreate(req.user.id, req.user.email || undefined);

      res.json({
        authenticated: true,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          assesseeType: profile.assessee_type,
          preferredRegime: profile.preferred_regime,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PATCH /api/auth/profile
   * Update user profile
   */
  router.patch('/profile', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.id === 'anonymous') {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const { name, assesseeType, preferredRegime } = req.body;

      const supabase = getSupabaseClient();
      const userRepo = new UserRepository(supabase);

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (assesseeType !== undefined) updates.assessee_type = assesseeType;
      if (preferredRegime !== undefined) updates.preferred_regime = preferredRegime;

      const profile = await userRepo.update(req.user.id, updates);

      res.json({
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          assesseeType: profile.assessee_type,
          preferredRegime: profile.preferred_regime,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/auth/status
   * Check if Supabase auth is configured
   */
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      supabaseConfigured: isSupabaseConfigured(),
      authEnabled: isSupabaseConfigured(),
    });
  });

  return router;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string | null;
      };
    }
  }
}
