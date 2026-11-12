export type MessageReportStatus = "open" | "reviewed" | "resolved" | "all";

export function buildMessageReportsFilter(
  status: MessageReportStatus,
  conversationId: number | null,
): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status !== "all") {
    conditions.push("mr.status = ?");
    params.push(status);
  }

  if (conversationId !== null) {
    conditions.push("mr.conversation_id = ?");
    params.push(conversationId);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join("\n  AND ")}` : "",
    params,
  };
}
