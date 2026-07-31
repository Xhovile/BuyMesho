import { readBuyerPayments } from "./buyerState";
import { fetchMyOrders } from "./orderApi";
import { buildBuyerTickets } from "./buyerTickets";

function normalize(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function matchesTicketIdentifier(candidate: string, normalizedInput: string) {
  if (!candidate) return false;
  const normalizedCandidate = normalize(candidate);
  return (
    normalizedCandidate === normalizedInput ||
    normalizedInput.endsWith(normalizedCandidate)
  );
}

export async function resolveOrderIdentifier(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const normalized = normalize(trimmed);
  const [orders, buyerPayments] = await Promise.all([fetchMyOrders(), Promise.resolve(readBuyerPayments())]);
  const tickets = buildBuyerTickets(orders, buyerPayments);

  const match = tickets.find((ticket) => {
    return (
      matchesTicketIdentifier(ticket.ticketCode, normalized) ||
      matchesTicketIdentifier(ticket.reference, normalized) ||
      matchesTicketIdentifier(ticket.orderId, normalized)
    );
  });

  return match?.reference ?? trimmed;
}
