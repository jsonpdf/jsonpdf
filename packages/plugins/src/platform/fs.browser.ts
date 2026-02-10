/**
 * Browser stub for file system access.
 * Throws a descriptive error since local file access is not available in browsers.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function readFileBytes(src: string): Promise<Uint8Array> {
  throw new Error(
    `File system access is not available in the browser. ` +
      `Cannot read "${src}". Use an HTTP(S) URL or data URI instead.`,
  );
}
