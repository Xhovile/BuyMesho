type OrderItemLike = {
  title?: unknown;
  name?: unknown;
  quantity?: unknown;
};

type TitleBucket = {
  title: string;
  quantity: number;
};

function getItemQuantity(item: OrderItemLike): number {
  const raw = Number(item.quantity ?? 1);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function getItemTitle(item: OrderItemLike): string {
  const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : null;
  if (title) return title;

  const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : null;
  if (name) return name;

  return 'Item';
}

function formatTitleBucket(bucket: TitleBucket): string {
  return bucket.quantity > 1 ? `${bucket.title} ×${bucket.quantity}` : bucket.title;
}

export function parseOrderItems(value: unknown): OrderItemLike[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is OrderItemLike => !!item && typeof item === 'object' && !Array.isArray(item));
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is OrderItemLike => !!item && typeof item === 'object' && !Array.isArray(item))
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Keep payout emails aligned with the buyer Payments page's order-title behavior:
 * one item, repeated quantities, and mixed checkouts with a +N more suffix.
 */
export function buildPayoutOrderTitle(value: unknown): string | null {
  const items = parseOrderItems(value);
  if (items.length === 0) return null;

  const buckets: TitleBucket[] = [];
  const bucketByKey = new Map<string, TitleBucket>();

  for (const item of items) {
    const title = getItemTitle(item);
    const quantity = getItemQuantity(item);
    const key = title.toLowerCase();
    const existing = bucketByKey.get(key);

    if (existing) {
      existing.quantity += quantity;
    } else {
      const bucket = { title, quantity };
      bucketByKey.set(key, bucket);
      buckets.push(bucket);
    }
  }

  if (buckets.length === 1) {
    return formatTitleBucket(buckets[0]);
  }

  const first = buckets[0];
  const second = buckets[1];
  const remainingCount = buckets.slice(2).reduce((total, bucket) => total + bucket.quantity, 0);

  if (!second) return formatTitleBucket(first);

  const head = `${formatTitleBucket(first)}, ${formatTitleBucket(second)}`;
  return remainingCount > 0 ? `${head} +${remainingCount} more` : head;
}
