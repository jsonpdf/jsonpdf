import { describe, it, expect } from 'vitest';
import { readFileBytes } from '../../src/platform/fs.js';

describe('readFileBytes (Node)', () => {
  it('reads a file by absolute path', async () => {
    const bytes = await readFileBytes(new URL('../../package.json', import.meta.url).pathname);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('reads a file by file:// URL', async () => {
    const fileUrl = new URL('../../package.json', import.meta.url).href;
    const bytes = await readFileBytes(fileUrl);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('throws for nonexistent file', async () => {
    await expect(readFileBytes('/nonexistent/file.txt')).rejects.toThrow();
  });
});
