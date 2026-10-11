import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

const app = createApp();

describe('API', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('agrijoin-api');
  });

  it('POST /api/applications without a token is rejected', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ job_id: '11111111-1111-1111-1111-111111111111' });
    expect(res.status).toBe(401);
  });

  it('POST /api/applications with a fake token never succeeds', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', 'Bearer fake')
      .send({ not: 'valid' });
    // Auth is verified against Supabase first; a fake/unverifiable token must
    // be rejected (401), or fail closed if Supabase is unreachable (5xx).
    // The one thing that must never happen is a 2xx success.
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('unknown route returns 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
  });
});
