import { describe, expect, it } from 'vite-plus/test';
import type { Element } from '@jsonpdf/core';
import {
  findContainerAtPoint,
  findElementParentTransform,
  transformPointToGlobal,
  transformPointToLocal,
} from '../../src/canvas/container-hit-test';

function makeElement(overrides: Partial<Element>): Element {
  return {
    id: 'el',
    type: 'text',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    properties: {},
    ...overrides,
  };
}

describe('container hit testing', () => {
  it('returns local coordinates for a rotated nested container', () => {
    const inner = makeElement({
      id: 'inner',
      type: 'container',
      x: 20,
      y: 10,
      width: 40,
      height: 30,
      properties: { layout: 'absolute' },
      elements: [],
    });
    const outer = makeElement({
      id: 'outer',
      type: 'container',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      rotation: 90,
      properties: { layout: 'absolute' },
      elements: [inner],
    });

    const hit = findContainerAtPoint([outer], 180, 130, 'dragged');

    expect(hit?.container.id).toBe('inner');
    if (!hit) throw new Error('Expected rotated nested container hit');
    expect(hit?.localPoint.x).toBeCloseTo(10);
    expect(hit?.localPoint.y).toBeCloseTo(10);
    const draggedTopLeft = transformPointToLocal(hit.transform, { x: 185, y: 125 });
    expect(draggedTopLeft.x).toBeCloseTo(5);
    expect(draggedTopLeft.y).toBeCloseTo(5);
  });

  it('resolves nested dragged element coordinates for sibling container targeting', () => {
    const dragged = makeElement({
      id: 'dragged',
      x: 5,
      y: 5,
      width: 10,
      height: 10,
    });
    const source = makeElement({
      id: 'source',
      type: 'container',
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      properties: { layout: 'absolute' },
      elements: [dragged],
    });
    const target = makeElement({
      id: 'target',
      type: 'container',
      x: 100,
      y: 0,
      width: 50,
      height: 50,
      properties: { layout: 'absolute' },
      elements: [],
    });

    const parentTransform = findElementParentTransform([source, target], 'dragged');
    if (!parentTransform) throw new Error('Expected parent transform for nested dragged element');
    const globalTopLeft = transformPointToGlobal(parentTransform, { x: 95, y: -5 });
    const globalCenter = transformPointToGlobal(parentTransform, { x: 100, y: 0 });
    const hit = findContainerAtPoint([source, target], globalCenter.x, globalCenter.y, 'dragged');

    expect(hit?.container.id).toBe('target');
    if (!hit) throw new Error('Expected sibling container hit');
    const targetLocalPosition = transformPointToLocal(hit.transform, globalTopLeft);
    expect(targetLocalPosition.x).toBeCloseTo(5);
    expect(targetLocalPosition.y).toBeCloseTo(5);
  });
});
