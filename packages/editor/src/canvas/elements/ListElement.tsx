import { Text } from 'react-konva';
import type { ElementRendererChildProps } from '../ElementRenderer';
import { mapFontFamily } from './font-map';

interface ListItemInput {
  content?: unknown;
  text?: string;
  children?: ListItemInput[];
}

/** Flatten list items to display text with bullet/number markers. */
function flattenItems(items: unknown[], listType: string, bulletStyle: string): string {
  return items
    .map((item, i) => {
      let text: string;
      if (typeof item === 'string') {
        text = item;
      } else if (typeof item === 'object' && item !== null) {
        const obj = item as ListItemInput;
        const content = obj.content ?? obj.text ?? '';
        text =
          typeof content === 'string'
            ? content
            : Array.isArray(content)
              ? content.map((r: { text?: string }) => r.text ?? '').join('')
              : '';
      } else {
        text = String(item);
      }

      const marker =
        listType === 'numbered'
          ? `${String(i + 1)}.`
          : listType === 'lettered'
            ? `${String.fromCharCode(97 + (i % 26))}.`
            : bulletStyle;

      return `${marker} ${text}`;
    })
    .join('\n');
}

export function ListElement({ element, style }: ElementRendererChildProps) {
  const props = element.properties;
  const items = (props.items as unknown[] | undefined) ?? [];
  const listType = (props.listType as string | undefined) ?? 'bullet';
  const bulletStyle = (props.bulletStyle as string | undefined) ?? '\u2022';

  const text = flattenItems(items, listType, bulletStyle);

  return (
    <Text
      x={0}
      y={0}
      width={element.width}
      height={element.height}
      text={text}
      fontFamily={mapFontFamily(style.fontFamily ?? 'Helvetica')}
      fontSize={style.fontSize ?? 12}
      fill={style.color ?? '#000000'}
      lineHeight={style.lineHeight ?? 1.2}
    />
  );
}
