let fontBuffers: Uint8Array[] = [];

export function setFontBuffers(buffers: Uint8Array[]): void {
  fontBuffers = buffers;
}

export function getFontBuffers(): Uint8Array[] {
  return fontBuffers;
}
