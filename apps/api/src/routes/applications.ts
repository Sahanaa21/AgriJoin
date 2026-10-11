import { Router } from 'express';
import { applicationSchema, applicationStatusSchema } from '@agrijoin/shared';
import { userClient } from '../supabase.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

/**
 * Thin application endpoints that run the SAME transactional RPCs the client
 * can call directly. They exist to demonstrate the server-side pattern and to
 * give future privileged logic a home. The web/mobile apps call the RPCs
 * directly by default — see docs/architecture.md.
 */
export const applicationsRouter = Router();

applicationsRouter.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }
  const db = userClient(req.accessToken!);
  const { data, error } = await db.rpc('apply_to_job', {
    p_job_id: parsed.data.job_id,
    p_message: parsed.data.message ?? null,
  });
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ application: data });
});

applicationsRouter.patch('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = applicationStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }
  const db = userClient(req.accessToken!);
  const { data, error } = await db.rpc('set_application_status', {
    p_application_id: req.params.id,
    p_status: parsed.data.status,
  });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ application: data });
});
