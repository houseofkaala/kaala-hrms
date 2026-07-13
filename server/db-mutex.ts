import type { Request, Response, NextFunction } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const MUTEX_EXEMPT = new Set([
  '/api/health',
]);

/** GET handlers that still persist state and must be serialized. */
const MUTEX_MUTATING_PATHS = new Set([
  '/api/auth/google/callback',
]);

let writeChain: Promise<void> = Promise.resolve();

function isMutatingRequest(req: Request): boolean {
  const path = req.originalUrl.split('?')[0];
  if (MUTEX_EXEMPT.has(path)) return false;
  if (MUTEX_MUTATING_PATHS.has(path)) return true;
  return MUTATING_METHODS.has(req.method.toUpperCase());
}

/**
 * Serializes mutating /api handlers so concurrent writes cannot race on the in-memory store.
 */
export function dbWriteMutex(req: Request, res: Response, next: NextFunction) {
  if (!isMutatingRequest(req)) return next();

  writeChain = writeChain.then(
    () =>
      new Promise<void>((resolve) => {
        let settled = false;
        const release = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        res.on('finish', release);
        res.on('close', release);
        next();
      }),
  );

  writeChain.catch((err) => {
    console.error('[HRMS] Write mutex chain error:', err);
  });
}