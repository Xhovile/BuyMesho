import { getClient } from "../../postgres.js";

type AsyncWork<T> = () => Promise<T>;

/**
 * Serialize payout submission and dispute mutations for one order across all
 * application instances sharing the PostgreSQL database.
 *
 * The advisory lock is session-scoped and is intentionally held across the
 * provider request so a dispute cannot move the payout to "held" while a
 * provider submission is in flight.
 */
export async function withOrderFinancialLock<T>(
  orderId: string,
  work: AsyncWork<T>,
): Promise<T> {
  const normalizedOrderId = String(orderId ?? "").trim();
  if (!normalizedOrderId) throw new Error("Order financial lock requires an order ID");

  const client = await getClient();
  const lockKey = `buymesho:order-financial:${normalizedOrderId}`;
  let locked = false;

  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockKey]);
    locked = true;
    return await work();
  } finally {
    if (locked) {
      try {
        await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
      } catch {
        // Ignore unlock failures; releasing the client below ends the session.
      }
    }
    try {
      client.release();
    } catch {
      // Ignore release failures during cleanup.
    }
  }
}
