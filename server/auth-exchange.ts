import crypto from 'crypto';
import { getDb, saveDb } from './db';

const TTL_MS = 60_000;

interface ExchangeRecord {
  code: string;
  token: string;
  expiresAt: string;
}

function exchangeStore(): ExchangeRecord[] {
  const db = getDb() as ReturnType<typeof getDb> & { authExchangeCodes?: ExchangeRecord[] };
  if (!db.authExchangeCodes) db.authExchangeCodes = [];
  return db.authExchangeCodes;
}

function pruneExchanges(list: ExchangeRecord[]) {
  const now = Date.now();
  const before = list.length;
  const kept = list.filter(e => new Date(e.expiresAt).getTime() > now);
  if (kept.length !== before) {
    list.length = 0;
    list.push(...kept);
    saveDb();
  }
}

/** Issue a one-time code so tokens never appear in URLs or server logs. */
export function issueAuthExchangeCode(sessionToken: string): string {
  const list = exchangeStore();
  pruneExchanges(list);
  const code = crypto.randomBytes(24).toString('base64url');
  list.push({
    code,
    token: sessionToken,
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  });
  saveDb();
  return code;
}

export function redeemAuthExchangeCode(code: string): string | null {
  const list = exchangeStore();
  pruneExchanges(list);
  const idx = list.findIndex(e => e.code === code);
  if (idx < 0) return null;
  const entry = list[idx];
  list.splice(idx, 1);
  saveDb();
  if (new Date(entry.expiresAt).getTime() <= Date.now()) return null;
  return entry.token;
}