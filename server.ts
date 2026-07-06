import express from 'express';
import path from 'path';
import { registerRoutes } from './server/routes';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  const PORT = Number(process.env.PORT) || 3000;

  // Fast health check before heavy route registration
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: 'connected', uptime: process.uptime() });
  });

  registerRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`House of Kaala HRMS running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});