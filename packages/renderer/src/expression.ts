import { Liquid, type Template as LiquidTemplate } from 'liquidjs';

export interface ExpressionEngine {
  /** Resolve Liquid expressions in a string. */
  resolve(template: string, scope: Record<string, unknown>): Promise<string>;
  /** Recursively resolve all string values in a props object. */
  resolveProps(
    props: Record<string, unknown>,
    scope: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  /** Evaluate a Liquid expression as a boolean. */
  evaluate(expression: string, scope: Record<string, unknown>): Promise<boolean>;
  /** Register a custom Liquid filter. */
  registerFilter(name: string, fn: (value: unknown, ...args: unknown[]) => unknown): void;
}

/** Create a new expression engine with custom filters. */
export function createExpressionEngine(): ExpressionEngine {
  const liquid = new Liquid({
    strictVariables: false,
    strictFilters: false,
  });

  // Cache parsed Liquid templates to avoid re-parsing identical expression strings
  const parseCache = new Map<string, LiquidTemplate[]>();

  function getParsed(templateStr: string): LiquidTemplate[] {
    let parsed = parseCache.get(templateStr);
    if (!parsed) {
      parsed = liquid.parse(templateStr);
      parseCache.set(templateStr, parsed);
    }
    return parsed;
  }

  liquid.registerFilter('money', (value: unknown, currency?: unknown) => {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: typeof currency === 'string' ? currency : 'USD',
    }).format(num);
  });

  liquid.registerFilter('pad', (value: unknown, width: unknown, char?: unknown) => {
    return String(value).padStart(Number(width) || 0, typeof char === 'string' ? char : ' ');
  });

  async function resolve(template: string, scope: Record<string, unknown>): Promise<string> {
    const parsed = getParsed(template);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result: string = await liquid.render(parsed, scope);
    return result;
  }

  // Matches a pure Liquid expression: exactly {{ expr }} with nothing else
  const PURE_EXPR_RE = /^\{\{\s*(.+?)\s*\}\}$/;

  async function resolveValue(value: unknown, scope: Record<string, unknown>): Promise<unknown> {
    if (typeof value === 'string') {
      // For pure expressions like "{{ departmentSummary }}", return the raw
      // scope value when it resolves to a non-primitive (array/object).
      // This allows properties like chart.dataSource to receive actual arrays
      // instead of their stringified representation.
      const match = value.match(PURE_EXPR_RE);
      if (match) {
        try {
          const raw: unknown = await liquid.evalValue(match[1], scope);
          if (raw !== null && raw !== undefined && typeof raw === 'object') {
            return raw;
          }
        } catch {
          // evalValue can't handle all Liquid syntax (e.g. filters with |).
          // Fall through to normal string resolution.
        }
      }
      return resolve(value, scope);
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => resolveValue(item, scope)));
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = await resolveValue(v, scope);
      }
      return result;
    }
    return value;
  }

  async function resolveProps(
    props: Record<string, unknown>,
    scope: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return (await resolveValue(props, scope)) as Record<string, unknown>;
  }

  async function evaluate(expression: string, scope: Record<string, unknown>): Promise<boolean> {
    // Safety note: `expression` is interpolated directly into a Liquid template.
    // This is safe because conditions come from template definitions (developer-authored),
    // not from end-user data. If template authoring is ever opened to untrusted users,
    // this would need to be sanitized against template injection.
    const wrapped = `{% if ${expression} %}true{% endif %}`;
    const parsed = getParsed(wrapped);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result: string = await liquid.render(parsed, scope);
    return result.trim() === 'true';
  }

  function registerFilter(name: string, fn: (value: unknown, ...args: unknown[]) => unknown): void {
    liquid.registerFilter(name, fn);
  }

  return { resolve, resolveProps, evaluate, registerFilter };
}
