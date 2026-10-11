import type { NextFunction, Request, Response } from 'express';
import { userClient } from '../supabase.js';

export interface AuthedRequest extends Request {
  accessToken?: string;
  userId?: string;
}

/**
 * Verifies the Bearer token by asking Supabase who it belongs to. We never
 * trust a user id sent in the body — identity always comes from the verified
 * token. Attaches the token + user id for downstream handlers.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization bearer token' });
  }
  try {
    const { data, error } = await userClient(token).auth.getUser();
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.accessToken = token;
    req.userId = data.user.id;
    next();
  } catch {
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}
