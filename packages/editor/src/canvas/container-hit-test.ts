import type { Element } from '@jsonpdf/core';
import { computeContainerChildLayouts } from './container-layout';

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface ContainerHitTarget {
  container: Element;
  transform: Transform;
  localPoint: Point;
}

const IDENTITY_TRANSFORM: Transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function containsElementId(element: Element, targetId: string): boolean {
  return (element.elements ?? []).some(
    (child) => child.id === targetId || containsElementId(child, targetId),
  );
}

function multiplyTransform(left: Transform, right: Transform): Transform {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function translateTransform(x: number, y: number): Transform {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

function rotateTransform(degrees: number): Transform {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

function elementTransform(element: Element): Transform {
  const rotation = element.rotation ?? 0;
  if (!rotation) return translateTransform(element.x, element.y);
  return multiplyTransform(
    multiplyTransform(
      translateTransform(element.x + element.width / 2, element.y + element.height / 2),
      rotateTransform(rotation),
    ),
    translateTransform(-element.width / 2, -element.height / 2),
  );
}

function invertTransform(transform: Transform): Transform {
  const determinant = transform.a * transform.d - transform.b * transform.c;
  return {
    a: transform.d / determinant,
    b: -transform.b / determinant,
    c: -transform.c / determinant,
    d: transform.a / determinant,
    e: (transform.c * transform.f - transform.d * transform.e) / determinant,
    f: (transform.b * transform.e - transform.a * transform.f) / determinant,
  };
}

function applyTransform(transform: Transform, point: Point): Point {
  return {
    x: transform.a * point.x + transform.c * point.y + transform.e,
    y: transform.b * point.x + transform.d * point.y + transform.f,
  };
}

export function transformPointToGlobal(transform: Transform, point: Point): Point {
  return applyTransform(transform, point);
}

export function transformPointToLocal(transform: Transform, point: Point): Point {
  return applyTransform(invertTransform(transform), point);
}

function renderedContainerChildren(container: Element): Element[] {
  return computeContainerChildLayouts(container).map((layout) => ({
    ...layout.element,
    x: layout.offsetX,
    y: layout.offsetY,
  }));
}

export function findContainerAtPoint(
  elements: Element[],
  pointX: number,
  pointY: number,
  excludedId: string,
  parentTransform = IDENTITY_TRANSFORM,
): ContainerHitTarget | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const candidate = elements[i];
    if (candidate.id === excludedId || containsElementId(candidate, excludedId)) continue;

    const transform = multiplyTransform(parentTransform, elementTransform(candidate));
    if (candidate.type === 'container') {
      const nested = findContainerAtPoint(
        renderedContainerChildren(candidate),
        pointX,
        pointY,
        excludedId,
        transform,
      );
      if (nested) return nested;
      const localPoint = transformPointToLocal(transform, { x: pointX, y: pointY });
      if (
        localPoint.x >= 0 &&
        localPoint.x <= candidate.width &&
        localPoint.y >= 0 &&
        localPoint.y <= candidate.height
      ) {
        return { container: candidate, transform, localPoint };
      }
    }
  }
  return null;
}

export function findElementParentTransform(
  elements: Element[],
  elementId: string,
  parentTransform = IDENTITY_TRANSFORM,
): Transform | null {
  for (const candidate of elements) {
    if (candidate.id === elementId) return parentTransform;

    const transform = multiplyTransform(parentTransform, elementTransform(candidate));
    if (candidate.elements) {
      const found = findElementParentTransform(
        renderedContainerChildren(candidate),
        elementId,
        transform,
      );
      if (found) return found;
    }
  }
  return null;
}
