import type { RichContent } from '@jsonpdf/core';

export interface ListItem {
  content: RichContent;
  children?: ListItem[];
}

export type ListItemInput = RichContent | ListItem;

export function isListItem(item: ListItemInput): item is ListItem {
  return typeof item === 'object' && !Array.isArray(item) && 'content' in item;
}

export function toListItem(item: ListItemInput): ListItem {
  if (isListItem(item)) return item;
  return { content: item };
}
