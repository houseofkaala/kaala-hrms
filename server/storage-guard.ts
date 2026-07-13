import path from 'path';

/** Prevent path traversal when resolving uploaded file keys. */
export function assertSafeStorageKey(storageKey: string, baseDir: string): boolean {
  if (!storageKey || storageKey.includes('\0')) return false;
  if (storageKey.includes('..') || path.isAbsolute(storageKey)) return false;

  const base = path.resolve(baseDir);
  const resolved = path.resolve(baseDir, storageKey);
  return resolved === base || resolved.startsWith(`${base}${path.sep}`);
}