import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Read a file as bytes from a local path or file:// URL (Node.js only).
 */
export async function readFileBytes(src: string): Promise<Uint8Array> {
  const filePath = src.startsWith('file://') ? fileURLToPath(src) : src;
  return readFile(filePath);
}
