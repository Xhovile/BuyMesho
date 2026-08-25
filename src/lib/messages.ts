import { apiFetch } from "./api";
import type { Conversation, MessageThreadItem } from "../types";
import { preloadConversation } from "./messagesNavigation";
import { auth } from "../firebase";
import { getCachedInbox, markCachedConversationRead, removeCachedConversation, setCachedInbox, updateCachedConversation } from "./messagesInboxCache";

export interface ConversationResponse {
  conversation: Conversation | null;
  messages: MessageThreadItem[];
}

export interface SendMessageResponse {
  success: boolean;
  conversation: Conversation;
  message: MessageThreadItem;
}

const pendingMessageIdempotencyKeys = new Map<string, string>();

function unwrapData<T>(payload: any, fallback: T): T {
  if (payload && typeof payload === "object" && "data" in payload) return (payload.data as T) ?? fallback;
  return (payload as T) ?? fallback;
}

async function fetchScopedInbox(scope: "user" | "seller"): Promise<Conversation[]> {
  const currentUserUid = auth.currentUser?.uid;
  if (!currentUserUid) return [];

  const cached = getCachedInbox(currentUserUid, scope);
  if (cached) return cached;

  const endpoint = scope === "seller" ? "/api/messages/inbox?scope=seller" : "/api/messages/inbox";
  const result = await apiFetch(endpoint);
  const data = unwrapData<{ items: Conversation[] }>(result, { items: [] });
  const items = Array.isArray(data.items) ? data.items : [];
  if (scope === "user") {
    return setCachedInbox(currentUserUid, scope, items.filter((conversation) =>
      conversation.buyer_uid === currentUserUid &&
      conversation.thread_type !== "event" &&
      conversation.seller_uid !== currentUserUid,
    ));
  }
  return setCachedInbox(currentUserUid, scope, items);
}

export async function fetchInbox(): Promise<Conversation[]> {
  return fetchScopedInbox("user");
}

export async function fetchSellerInbox(): Promise<Conversation[]> {
  return fetchScopedInbox("seller");
}

export async function fetchConversation(conversationId: number): Promise<ConversationResponse> {
  const result = await apiFetch(`/api/messages/${conversationId}`);
  const data = unwrapData<ConversationResponse>(result, { conversation: null, messages: [] });
  return { conversation: data.conversation ?? null, messages: Array.isArray(data.messages) ? data.messages : [] };
}

export async function startConversationFromListing(listingId: number): Promise<Conversation> {
  const result = await apiFetch(`/api/listings/${listingId}/messages/start`, { method: "POST" });
  return unwrapData<{ conversation: Conversation }>(result, { conversation: null as unknown as Conversation }).conversation;
}

export async function startConversationFromEvent(eventId: number): Promise<Conversation> {
  const result = await apiFetch(`/api/events/${eventId}/messages/start`, { method: "POST" });
  const conversation = unwrapData<{ conversation: Conversation }>(result, { conversation: null as unknown as Conversation }).conversation;
  preloadConversation(conversation);
  return conversation;
}

export async function startConversationWithSeller(sellerUid: string): Promise<Conversation> {
  const result = await apiFetch(`/api/sellers/${encodeURIComponent(sellerUid)}/messages/start`, { method: "POST" });
  const conversation = unwrapData<{ conversation: Conversation }>(result, { conversation: null as unknown as Conversation }).conversation;
  preloadConversation(conversation);
  return conversation;
}

export async function sendMessage(conversationId: number, body: string, idempotencyKey?: string): Promise<SendMessageResponse> {
  const pendingKey = `${conversationId}:${body}`;
  const key = idempotencyKey ?? pendingMessageIdempotencyKeys.get(pendingKey) ?? crypto.randomUUID();
  if (!idempotencyKey) pendingMessageIdempotencyKeys.set(pendingKey, key);

  try {
    const result = await apiFetch(`/api/messages/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body, idempotencyKey: key }),
    });
    pendingMessageIdempotencyKeys.delete(pendingKey);
    const response = unwrapData<SendMessageResponse>(result, {
      success: false,
      conversation: null as unknown as Conversation,
      message: null as unknown as MessageThreadItem,
    });
    const uid = auth.currentUser?.uid;
    if (uid && response.conversation) {
      if (response.conversation.buyer_uid === uid) updateCachedConversation(uid, "user", response.conversation);
      if (response.conversation.seller_uid === uid) updateCachedConversation(uid, "seller", response.conversation);
    }
    return response;
  } catch (error) {
    throw error;
  }
}

export async function markConversationRead(conversationId: number): Promise<void> {
  await apiFetch(`/api/messages/${conversationId}/read`, { method: "POST" });
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  markCachedConversationRead(uid, "user", conversationId);
  markCachedConversationRead(uid, "seller", conversationId);
}

export async function deleteConversation(conversationId: number): Promise<void> {
  await apiFetch(`/api/messages/${conversationId}`, { method: "DELETE" });
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  removeCachedConversation(uid, "user", conversationId);
  removeCachedConversation(uid, "seller", conversationId);
}
