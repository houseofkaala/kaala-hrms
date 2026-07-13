/** Legacy demo IDs → current seed IDs. Used for alias lookup only in preserve mode. */
export const LEGACY_ID_MAP: Record<string, string> = {
  u1: 'emp-1', u2: 'emp-1', u3: 'emp-1', u4: 'emp-1',
  m1: 'mgr-1', m2: 'admin-1',
};

export function resolveUserIds(id: string): string[] {
  const ids = new Set<string>([id]);
  const canonical = LEGACY_ID_MAP[id];
  if (canonical) ids.add(canonical);
  for (const [legacy, canon] of Object.entries(LEGACY_ID_MAP)) {
    if (canon === id) ids.add(legacy);
  }
  return [...ids];
}

export function userIdMatches(storedId: string, sessionId: string): boolean {
  return resolveUserIds(sessionId).includes(storedId);
}

export function hasLegacyUserIds(userIds: string[]): boolean {
  return userIds.some(id => id in LEGACY_ID_MAP);
}