import { apiFetch } from "./api";
import type { Conversation, MessageThreadItem } from "../types";

export async function fetchInbox(): Promise<Conversation[]> {
  const result = await apiFetch("/api/messages/inbox");
  return Array.isArray(result?.items) ? (result.items as Conversation[]) : [];
}

export async function fetchConversation(conversationId: number): Promise<{ conversation: Conversation | null; messages: MessageThreadItem[] }> {
  const result = await apiFetch(`/api/messages/${conversationId}`);
  return {
    conversation: (result?.conversation as Conversation) ?? null,
    messages: Array.isArray(result?.messages) ? (result.messages as MessageThreadItem[]) : [],
  };
}

export async function startConversationFromListing(listingId: number): Promise<Conversation> {
  const result = await apiFetch(`/api/listings/${listingId}/messages/start`, { method: "POST" });
  return result.conversation as Conversation;
}

export async function sendMessage(conversationId: number, body: string): Promise<{ conversation: Conversation; message: MessageThreadItem }> {
  return apiFetch(`/api/messages/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function markConversationRead(conversationId: number): Promise<void> {
  await apiFetch(`/api/messages/${conversationId}/read`, { method: "POST" });
}
