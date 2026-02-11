import { Text } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';
import { mapFontFamily } from './font-map';

/** Flatten RichContent to a plain string for canvas display. */
function flattenContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((run: { text?: string }) => run.text ?? '').join('');
  }
  return '';
}

export function TextElement({ element, style }: ElementRendererChildProps) {
  const content = flattenContent(element.properties.content);

  return (
    <Text
      x={0}
      y={0}
      width={element.width}
      height={element.height}
      text={content}
      fontFamily={mapFontFamily(style.fontFamily as string)}
      fontSize={style.fontSize ?? 12}
      fontStyle={
        `${style.fontWeight === 'bold' ? 'bold' : ''} ${style.fontStyle === 'italic' ? 'italic' : ''}`.trim() ||
        'normal'
      }
      fill={style.color ?? '#000000'}
      align={style.textAlign ?? 'left'}
      lineHeight={style.lineHeight ?? 1.2}
      letterSpacing={style.letterSpacing ?? 0}
      textDecoration={
        style.textDecoration === 'underline'
          ? 'underline'
          : style.textDecoration === 'line-through'
            ? 'line-through'
            : ''
      }
    />
  );
}
