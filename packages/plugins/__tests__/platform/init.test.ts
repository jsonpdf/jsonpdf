import { describe, it, expect } from 'vite-plus/test';
import { initBrowser } from '../../src/platform/init.js';

describe('initBrowser (Node)', () => {
  it('is a no-op that resolves', async () => {
    await expect(initBrowser()).resolves.toBeUndefined();
  });
});
