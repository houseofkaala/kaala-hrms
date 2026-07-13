import type { Express, Request, Response, NextFunction } from 'express';

const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ||
    'https://employee.bymarketingonly.com,https://admin.bymarketingonly.com,https://sales.bymarketingonly.com,https://manager.bymarketingonly.com,https://bymarketingonly.com,https://www.bymarketingonly.com')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
);

const PROBE_PATTERNS = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/wp-admin/i,
  /^\/wp-login/i,
  /^\/phpmyadmin/i,
  /^\/admin\.php/i,
  /^\/xmlrpc\.php/i,
  /^\/\.well-known\/(?!acme-challenge)/i,
  /\.\./,
  /\/etc\/passwd/i,
];

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.removeHeader('X-Powered-By');

  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    );
  }

  next();
}

export function corsGuard(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!origin) return next();

  const allowed =
    !IS_PROD ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    ALLOWED_ORIGINS.has(origin);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Portal');
  }

  if (req.method === 'OPTIONS') {
    return allowed ? res.status(204).end() : res.status(403).json({ error: 'Forbidden' });
  }

  if (!allowed) return res.status(403).json({ error: 'Forbidden origin' });
  next();
}

export function blockProbePaths(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  if (PROBE_PATTERNS.some(p => p.test(path))) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}

export function applyHardening(app: Express) {
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(corsGuard);
  app.use(blockProbePaths);
}