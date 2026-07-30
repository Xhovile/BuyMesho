import { readBuyerPayments } from "./buyerState";
import { fetchMyOrders } from "./orderApi";
import { buildBuyerTickets } from "./buyerTickets";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export async function resolveOrderIdentifier(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const normalized = normalize(trimmed);
  const [orders, buyerPayments] = await Promise.all([fetchMyOrders(), Promise.resolve(readBuyerPayments())]);
  const tickets = buildBuyerTickets(orders, buyerPayments);

  const match = tickets.find((ticket) => {
    return (
      normalize(ticket.reference) === normalized ||
      normalize(ticket.orderId) === normalized ||
      normalize(ticket.ticketCode) === normalized
    );
  });

  return match?.reference ?? trimmed;
}
