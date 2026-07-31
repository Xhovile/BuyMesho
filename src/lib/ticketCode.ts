export function extractPayChanguTicketCode(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate.trim() : "";
    if (!value) continue;

    const match = value.match(/(?:^|[^a-z0-9])(order_|ord_)([a-z0-9]+)/i);
    if (match?.[2]) {
      const extracted = match[2].replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
      if (extracted) return extracted;
    }
  }

  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate.trim() : "";
    if (!value) continue;
    const compact = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (compact) return compact.slice(0, 6);
  }

  return "";
}
