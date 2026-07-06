import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { registerRoutes } from './server/routes';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  const PORT = Number(process.env.PORT) || 3000;

  registerRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
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
    console.log(`House of Kaala HRMS running on http://localhost:${PORT}`);
  });
}

startServer();