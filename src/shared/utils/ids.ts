import { randomUUID } from 'crypto';

export function createId(prefix?: string): string {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

export function createReference(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${rand}`.toUpperCase();
}
