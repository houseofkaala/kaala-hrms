import type { User } from './types';

export interface ChatConversation {
  userId: string;
  name: string;
  lastMessage?: string;
  lastAt?: string;
}

export function buildChatRoster(fetched: User[], fallback: User[], currentUserId?: string): User[] {
  const merged = new Map<string, User>();
  for (const user of [...fallback, ...fetched]) {
    if (!user?.id || user.id === currentUserId) continue;
    if (user.status === 'Inactive') continue;
    merged.set(user.id, user);
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildChatList(roster: User[], conversations: ChatConversation[]): ChatConversation[] {
  const byId = new Map<string, ChatConversation>();

  for (const user of roster) {
    byId.set(user.id, { userId: user.id, name: user.name });
  }

  for (const conversation of conversations) {
    if (!conversation.userId) continue;
    const existing = byId.get(conversation.userId);
    byId.set(conversation.userId, {
      userId: conversation.userId,
      name: conversation.name || existing?.name || 'Team member',
      lastMessage: conversation.lastMessage ?? existing?.lastMessage,
      lastAt: conversation.lastAt ?? existing?.lastAt,
    });
  }

  return [...byId.values()].sort((a, b) => {
    const aTime = a.lastAt ? new Date(a.lastAt).getTime() : 0;
    const bTime = b.lastAt ? new Date(b.lastAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.name.localeCompare(b.name);
  });
}

export function resolveChatPartner(
  selectedId: string,
  roster: User[],
  conversations: ChatConversation[],
): User | null {
  if (!selectedId) return null;
  const found = roster.find(user => user.id === selectedId);
  if (found) return found;

  const conversation = conversations.find(item => item.userId === selectedId);
  if (!conversation) return null;

  return {
    id: selectedId,
    name: conversation.name || 'Team member',
    points: 0,
    role: 'employee',
    department: '',
  };
}