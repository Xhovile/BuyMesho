import { readBuyerPayments } from "./buyerState";
import { buildBuyerTickets } from "./buyerTickets";
import { extractPayChanguTicketCode } from "./ticketCode";

function normalize(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function matchesTicketIdentifier(candidate: string, normalizedInput: string) {
  if (!candidate) return false;
  const normalizedCandidate = normalize(candidate);
  const shortCandidate = extractPayChanguTicketCode(candidate);
  return (
    normalizedCandidate === normalizedInput ||
    shortCandidate === normalizedInput ||
    normalizedInput.endsWith(normalizedCandidate) ||
    normalizedInput === shortCandidate
  );
}

export async function resolveOrderIdentifier(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const normalized = normalize(trimmed);
  const buyerPayments = readBuyerPayments();
  const tickets = buildBuyerTickets([], buyerPayments);

  const match = tickets.find((ticket) => {
    return (
      matchesTicketIdentifier(ticket.ticketCode, normalized) ||
      matchesTicketIdentifier(ticket.reference, normalized) ||
      matchesTicketIdentifier(ticket.orderId, normalized)
    );
  });

  return match?.reference ?? trimmed;
}
