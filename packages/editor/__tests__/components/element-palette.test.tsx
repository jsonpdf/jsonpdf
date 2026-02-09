// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ElementPalette, DRAG_TYPE } from '../../src/components/ElementPalette';
import { ELEMENT_TYPES } from '../../src/constants/element-defaults';

afterEach(cleanup);

describe('ElementPalette', () => {
  it('renders 10 draggable items', () => {
    render(<ElementPalette />);
    for (const type of ELEMENT_TYPES) {
      const item = screen.getByTestId(`palette-${type}`);
      expect(item).toBeDefined();
      expect(item.getAttribute('draggable')).toBe('true');
    }
  });

  it('renders header text', () => {
    render(<ElementPalette />);
    expect(screen.getByText('Elements')).toBeDefined();
  });

  it('sets correct dataTransfer on dragStart', () => {
    render(<ElementPalette />);
    const textItem = screen.getByTestId('palette-text');

    let setDataType = '';
    let setDataValue = '';
    let effectAllowed = '';

    fireEvent.dragStart(textItem, {
      dataTransfer: {
        setData(type: string, value: string) {
          setDataType = type;
          setDataValue = value;
        },
        set effectAllowed(val: string) {
          effectAllowed = val;
        },
      },
    });

    expect(setDataType).toBe(DRAG_TYPE);
    expect(setDataValue).toBe('text');
    expect(effectAllowed).toBe('copy');
  });

  it('sets correct type for each element', () => {
    render(<ElementPalette />);

    for (const type of ELEMENT_TYPES) {
      const item = screen.getByTestId(`palette-${type}`);
      let capturedValue = '';
      fireEvent.dragStart(item, {
        dataTransfer: {
          setData(_t: string, v: string) {
            capturedValue = v;
          },
          set effectAllowed(_: string) {
            /* noop */
          },
        },
      });
      expect(capturedValue).toBe(type);
    }
  });
});
