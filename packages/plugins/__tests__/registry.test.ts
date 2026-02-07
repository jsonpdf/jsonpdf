import { describe, it, expect, beforeEach } from 'vitest';
import {
  PluginRegistry,
  registerPlugin,
  getPlugin,
  hasPlugin,
  getAllPlugins,
  clearPlugins,
} from '../src/registry.js';
import type { Plugin } from '../src/types.js';

function fakePlugin(type: string): Plugin {
  return {
    type,
    propsSchema: {},
    defaultProps: {},
    resolveProps: (raw) => ({ ...raw }),
    validate: () => [],
    measure: () => Promise.resolve({ width: 0, height: 0 }),
    render: () => Promise.resolve(),
  };
}

describe('plugin registry (default module-level)', () => {
  beforeEach(() => {
    clearPlugins();
  });

  it('registers and retrieves a plugin', () => {
    const p = fakePlugin('test');
    registerPlugin(p);
    expect(getPlugin('test')).toBe(p);
  });

  it('throws on duplicate registration', () => {
    registerPlugin(fakePlugin('test'));
    expect(() => registerPlugin(fakePlugin('test'))).toThrow('already registered');
  });

  it('throws for unregistered plugin', () => {
    expect(() => getPlugin('unknown')).toThrow('No plugin registered');
  });

  it('checks existence with hasPlugin', () => {
    expect(hasPlugin('test')).toBe(false);
    registerPlugin(fakePlugin('test'));
    expect(hasPlugin('test')).toBe(true);
  });

  it('returns all plugins', () => {
    registerPlugin(fakePlugin('a'));
    registerPlugin(fakePlugin('b'));
    const all = getAllPlugins();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.type).sort()).toEqual(['a', 'b']);
  });

  it('clears all plugins', () => {
    registerPlugin(fakePlugin('test'));
    clearPlugins();
    expect(hasPlugin('test')).toBe(false);
  });
});

describe('PluginRegistry class', () => {
  it('creates an isolated registry', () => {
    const reg = new PluginRegistry();
    reg.register(fakePlugin('custom'));
    expect(reg.has('custom')).toBe(true);
    // Default registry should not be affected
    expect(hasPlugin('custom')).toBe(false);
  });

  it('throws on duplicate registration', () => {
    const reg = new PluginRegistry();
    reg.register(fakePlugin('x'));
    expect(() => reg.register(fakePlugin('x'))).toThrow('already registered');
  });

  it('throws for unregistered plugin', () => {
    const reg = new PluginRegistry();
    expect(() => reg.get('missing')).toThrow('No plugin registered');
  });

  it('returns all registered plugins', () => {
    const reg = new PluginRegistry();
    reg.register(fakePlugin('a'));
    reg.register(fakePlugin('b'));
    expect(reg.getAll()).toHaveLength(2);
  });

  it('clears all plugins', () => {
    const reg = new PluginRegistry();
    reg.register(fakePlugin('a'));
    reg.clear();
    expect(reg.has('a')).toBe(false);
  });

  it('does not interfere with other registries', () => {
    const reg1 = new PluginRegistry();
    const reg2 = new PluginRegistry();
    reg1.register(fakePlugin('only-in-1'));
    expect(reg1.has('only-in-1')).toBe(true);
    expect(reg2.has('only-in-1')).toBe(false);
  });
});
