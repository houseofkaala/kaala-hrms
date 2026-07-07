import crypto from 'crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SALT_LEN = 16;
const KEY_LEN = 64;
const PREFIX = 'scrypt:';

export function isPasswordHashed(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(SALT_LEN);
  const hash = crypto.scryptSync(plain, salt, KEY_LEN, SCRYPT_PARAMS);
  return `${PREFIX}${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored) return false;
  if (!isPasswordHashed(stored)) return plain === stored;
  const body = stored.slice(PREFIX.length);
  const [saltHex, hashHex] = body.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(plain, salt, KEY_LEN, SCRYPT_PARAMS);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

/** Re-hash legacy plain-text passwords after successful login. */
export function upgradePasswordIfNeeded(user: { password: string }, plain: string): boolean {
  if (isPasswordHashed(user.password)) return false;
  if (plain !== user.password) return false;
  user.password = hashPassword(plain);
  return true;
}