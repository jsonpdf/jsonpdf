const FONT_MAP: Record<string, string> = {
  Helvetica: 'Arial, Helvetica, sans-serif',
  'Times-Roman': '"Times New Roman", Times, serif',
  Courier: '"Courier New", Courier, monospace',
};

/** Map PDF font names to web-safe font families for Konva canvas rendering. */
export function mapFontFamily(family: string): string {
  return FONT_MAP[family] ?? family;
}
