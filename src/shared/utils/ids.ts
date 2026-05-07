export function createId(prefix?: string): string {
  const base = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return prefix ? `${prefix}_${base}` : base;
}

export function createReference(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${rand}`.toUpperCase();
}
