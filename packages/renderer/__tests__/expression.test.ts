import { describe, it, expect } from 'vitest';
import { createExpressionEngine } from '../src/expression.js';

describe('ExpressionEngine.resolve', () => {
  it('resolves simple variable', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('Hello {{ name }}', { name: 'World' });
    expect(result).toBe('Hello World');
  });

  it('resolves nested dot-path', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('{{ order.customer.name }}', {
      order: { customer: { name: 'Alice' } },
    });
    expect(result).toBe('Alice');
  });

  it('resolves missing variable to empty string', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('Hello {{ missing }}!', {});
    expect(result).toBe('Hello !');
  });

  it('resolves multiple expressions in one string', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('{{ first }} {{ last }}', {
      first: 'Jane',
      last: 'Doe',
    });
    expect(result).toBe('Jane Doe');
  });

  it('passes through string with no expressions', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('No expressions here', {});
    expect(result).toBe('No expressions here');
  });

  it('resolves Liquid conditionals', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('{% if show %}visible{% endif %}', { show: true });
    expect(result).toBe('visible');
  });

  it('resolves number values', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('Count: {{ count }}', { count: 42 });
    expect(result).toBe('Count: 42');
  });
});

describe('ExpressionEngine.evaluate', () => {
  it('returns true for truthy expression', async () => {
    const engine = createExpressionEngine();
    expect(await engine.evaluate('active', { active: true })).toBe(true);
  });

  it('returns false for falsy expression', async () => {
    const engine = createExpressionEngine();
    expect(await engine.evaluate('active', { active: false })).toBe(false);
  });

  it('returns false for missing variable', async () => {
    const engine = createExpressionEngine();
    expect(await engine.evaluate('missing', {})).toBe(false);
  });

  it('evaluates comparison expressions', async () => {
    const engine = createExpressionEngine();
    expect(await engine.evaluate('count > 5', { count: 10 })).toBe(true);
    expect(await engine.evaluate('count > 5', { count: 3 })).toBe(false);
  });

  it('evaluates string equality', async () => {
    const engine = createExpressionEngine();
    expect(await engine.evaluate('status == "active"', { status: 'active' })).toBe(true);
    expect(await engine.evaluate('status == "active"', { status: 'inactive' })).toBe(false);
  });
});

describe('ExpressionEngine.resolveProps', () => {
  it('resolves all string values in a flat object', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolveProps(
      { content: 'Hello {{ name }}', color: '#000' },
      { name: 'World' },
    );
    expect(result).toEqual({ content: 'Hello World', color: '#000' });
  });

  it('preserves non-string values', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolveProps(
      { content: 'text', thickness: 2, visible: true, items: [1, 2] },
      {},
    );
    expect(result.thickness).toBe(2);
    expect(result.visible).toBe(true);
    expect(result.items).toEqual([1, 2]);
  });

  it('resolves nested objects recursively', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolveProps(
      { nested: { label: '{{ title }}' } },
      { title: 'Report' },
    );
    expect(result).toEqual({ nested: { label: 'Report' } });
  });

  it('resolves StyledRun array (text fields)', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolveProps(
      {
        content: [
          { text: 'Invoice #{{ invoiceNumber }}' },
          { text: ' for {{ customer }}', styleOverrides: { fontWeight: 'bold' } },
        ],
      },
      { invoiceNumber: '1001', customer: 'Acme' },
    );
    const content = result['content'] as { text: string }[];
    expect(content[0]!.text).toBe('Invoice #1001');
    expect(content[1]!.text).toBe(' for Acme');
    // Non-string fields preserved
    expect((content[1] as Record<string, unknown>)['styleOverrides']).toEqual({
      fontWeight: 'bold',
    });
  });

  it('handles null and undefined values', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolveProps({ a: null, b: 'hello' }, {});
    expect(result.a).toBeNull();
    expect(result.b).toBe('hello');
  });
});

describe('ExpressionEngine custom filters', () => {
  it('money filter formats USD by default', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('{{ price | money }}', { price: 1234.5 });
    expect(result).toBe('$1,234.50');
  });

  it('money filter with custom currency', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('{{ price | money: "EUR" }}', { price: 99.99 });
    expect(result).toContain('99.99');
  });

  it('money filter handles non-number gracefully', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('{{ val | money }}', { val: 'abc' });
    expect(result).toBe('abc');
  });

  it('date filter formats dates', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('{{ d | date: "%Y-%m-%d" }}', {
      d: '2024-06-15T12:00:00Z',
    });
    expect(result).toBe('2024-06-15');
  });

  it('pad filter left-pads strings', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('{{ num | pad: 5, "0" }}', { num: '42' });
    expect(result).toBe('00042');
  });

  it('pad filter with default space character', async () => {
    const engine = createExpressionEngine();
    const result = await engine.resolve('[{{ val | pad: 8 }}]', { val: 'hi' });
    expect(result).toBe('[      hi]');
  });
});
