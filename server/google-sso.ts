import crypto from 'crypto';
import type { Express, Request, Response } from 'express';
import { getDb } from './db';
import { createSession } from './sessions';
import { portalForRole } from './portal-config';

export interface GoogleSsoConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  allowedDomain: string;
}

type PortalId = 'employee' | 'admin';

interface OAuthState {
  portal: PortalId;
  nonce: string;
}

function normalizePortal(raw: unknown): PortalId {
  const value = String(raw || 'employee');
  if (value === 'manager' || value === 'admin') return 'admin';
  return 'employee';
}

export function getGoogleSsoConfig(): GoogleSsoConfig | null {
  const db = getDb() as ReturnType<typeof getDb> & {
    integrations?: { googleSso?: Partial<GoogleSsoConfig> };
  };
  const google = db.integrations?.googleSso;
  const clientSecret = String(google?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '').trim();
  if (!google?.enabled || !google.clientId?.trim() || !clientSecret) return null;
  return {
    enabled: true,
    clientId: google.clientId.trim(),
    clientSecret,
    allowedDomain: String(google.allowedDomain || 'bymarketingonly.com').trim().toLowerCase(),
  };
}

export function sanitizeGoogleSsoForClient(google: Partial<GoogleSsoConfig>) {
  const hasClientSecret = Boolean(
    String(google.clientSecret || '').trim() || process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
  return {
    enabled: Boolean(google.enabled),
    clientId: String(google.clientId || ''),
    allowedDomain: String(google.allowedDomain || 'bymarketingonly.com'),
    hasClientSecret,
    clientSecret: hasClientSecret ? '••••••••' : '',
  };
}

function getRedirectUri(req: Request): string {
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}/api/auth/google/callback`;
}

function portalLoginUrl(req: Request, portal: PortalId, query: Record<string, string>): string {
  const baseDomain = process.env.VITE_BASE_DOMAIN || 'bymarketingonly.com';
  const host = String(req.headers.host || '');
  const qs = new URLSearchParams(query);

  if (host.includes('localhost') || host.startsWith('127.0.0.1')) {
    qs.set('portal', portal);
    const proto = req.protocol;
    const hostname = host.split(':')[0];
    const port = host.includes(':') ? `:${host.split(':')[1]}` : '';
    return `${proto}://${hostname}${port}/login?${qs.toString()}`;
  }

  const sub = portal === 'admin' ? 'admin' : 'employee';
  return `https://${sub}.${baseDomain}/login?${qs.toString()}`;
}

function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

function decodeState(raw: string): OAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')) as OAuthState;
    if (!parsed?.nonce || !parsed.portal) return null;
    return { portal: normalizePortal(parsed.portal), nonce: String(parsed.nonce) };
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(config: GoogleSsoConfig, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForProfile(
  config: GoogleSsoConfig,
  code: string,
  redirectUri: string,
): Promise<{ email: string; name: string; emailVerified: boolean }> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenBody = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
  if (!tokenRes.ok || !tokenBody.access_token) {
    throw new Error(tokenBody.error_description || tokenBody.error || 'Google token exchange failed');
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` },
  });
  const profile = await profileRes.json() as {
    email?: string;
    name?: string;
    verified_email?: boolean;
  };
  if (!profileRes.ok || !profile.email) {
    throw new Error('Could not read Google profile');
  }

  return {
    email: profile.email.trim().toLowerCase(),
    name: String(profile.name || profile.email).trim(),
    emailVerified: profile.verified_email !== false,
  };
}

function redirectWithError(req: Request, res: Response, portal: PortalId, message: string) {
  res.redirect(portalLoginUrl(req, portal, { error: message }));
}

export function registerGoogleSsoRoutes(app: Express) {
  app.get('/api/auth/google/status', (_req, res) => {
    const config = getGoogleSsoConfig();
    res.json({
      enabled: Boolean((getDb() as ReturnType<typeof getDb> & { integrations?: { googleSso?: { enabled?: boolean } } })
        .integrations?.googleSso?.enabled),
      configured: Boolean(config),
    });
  });

  app.get('/api/auth/google', (req, res) => {
    const config = getGoogleSsoConfig();
    if (!config) {
      return res.status(503).json({
        error: 'Google SSO not configured',
        hint: 'Enable Google SSO in Admin → Settings → Integrations and set Client ID + Client Secret',
      });
    }

    const portal = normalizePortal(req.query.portal || req.headers['x-portal']);
    const redirectUri = getRedirectUri(req);
    const state = encodeState({ portal, nonce: crypto.randomUUID() });
    const url = buildGoogleAuthUrl(config, redirectUri, state);

    if (req.query.redirect === '1') return res.redirect(url);
    res.json({ url, configured: true });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const config = getGoogleSsoConfig();
    const fallbackPortal: PortalId = 'employee';

    if (!config) {
      return redirectWithError(req, res, fallbackPortal, 'Google SSO is not configured');
    }

    const oauthError = typeof req.query.error === 'string' ? req.query.error : null;
    if (oauthError) {
      return redirectWithError(req, res, fallbackPortal, 'Google sign-in was cancelled');
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const stateRaw = typeof req.query.state === 'string' ? req.query.state : '';
    const state = decodeState(stateRaw);
    const portal = state?.portal || fallbackPortal;

    if (!code || !state) {
      return redirectWithError(req, res, portal, 'Invalid Google sign-in response');
    }

    try {
      const redirectUri = getRedirectUri(req);
      const profile = await exchangeCodeForProfile(config, code, redirectUri);

      if (!profile.emailVerified) {
        return redirectWithError(req, res, portal, 'Google email is not verified');
      }

      const domain = profile.email.split('@')[1]?.toLowerCase();
      if (!domain || domain !== config.allowedDomain) {
        return redirectWithError(req, res, portal, `Only @${config.allowedDomain} accounts are allowed`);
      }

      const user = getDb().users.find(u => u.email?.toLowerCase() === profile.email);
      if (!user) {
        return redirectWithError(req, res, portal, 'No HRMS account found for this Google email. Contact HR.');
      }
      if (user.status === 'Inactive') {
        return redirectWithError(req, res, portal, 'Account is inactive. Contact HR.');
      }

      const rolePortal = portalForRole(user.role);
      if (portal !== rolePortal) {
        const label = rolePortal === 'admin' ? 'Admin' : 'Employee';
        return redirectWithError(
          req,
          res,
          rolePortal,
          `Wrong portal. Use the ${label} portal for this account.`,
        );
      }

      const token = createSession(user.id);
      res.redirect(portalLoginUrl(req, portal, { token }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      redirectWithError(req, res, portal, message);
    }
  });
}