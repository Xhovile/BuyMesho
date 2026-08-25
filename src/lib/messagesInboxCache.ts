import type { Conversation } from "../types";

const inboxCache = new Map<string, Conversation[]>();

function cacheKey(userUid: string, scope: "user" | "seller") {
  return `${userUid}:${scope}`;
}

export function getCachedInbox(userUid: string, scope: "user" | "seller"): Conversation[] | null {
  const items = inboxCache.get(cacheKey(userUid, scope));
  return items ? [...items] : null;
}

export function setCachedInbox(userUid: string, scope: "user" | "seller", items: Conversation[]): Conversation[] {
  const snapshot = [...items];
  inboxCache.set(cacheKey(userUid, scope), snapshot);
  return [...snapshot];
}

export function updateCachedConversation(userUid: string, scope: "user" | "seller", conversation: Conversation): void {
  const key = cacheKey(userUid, scope);
  const current = inboxCache.get(key);
  if (!current) return;
  const index = current.findIndex((item) => item.id === conversation.id);
  if (index === -1) {
    inboxCache.set(key, [conversation, ...current]);
    return;
  }
  const next = [...current];
  next[index] = conversation;
  inboxCache.set(key, next);
}

export function removeCachedConversation(userUid: string, scope: "user" | "seller", conversationId: number): void {
  const key = cacheKey(userUid, scope);
  const current = inboxCache.get(key);
  if (!current) return;
  inboxCache.set(key, current.filter((conversation) => conversation.id !== conversationId));
}

export function markCachedConversationRead(userUid: string, scope: "user" | "seller", conversationId: number): void {
  const key = cacheKey(userUid, scope);
  const current = inboxCache.get(key);
  if (!current) return;
  inboxCache.set(
    key,
    current.map((conversation) =>
      conversation.id === conversationId
        ? { ...conversation, unread_count: 0 }
        : conversation,
    ),
  );
}
