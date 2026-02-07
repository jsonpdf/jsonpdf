import { randomUUID } from 'node:crypto';

/** Generate a unique ID, optionally with a prefix. */
export function generateId(prefix?: string): string {
  const uuid = randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}
