import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, isConfigured } from './env.js';
import { applicationsRouter } from './routes/applications.js';

/** Build the Express app (exported so tests can import it without listening). */
export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : true }));
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'agrijoin-api', time: new Date().toISOString(), supabaseConfigured: isConfigured });
  });

  app.use('/api/applications', applicationsRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}
