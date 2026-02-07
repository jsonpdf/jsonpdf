import type { Plugin } from './types.js';

/** Encapsulated plugin registry. Allows isolated registries for testing and rendering. */
export class PluginRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private plugins = new Map<string, Plugin<any>>();

  /** Register a plugin. Throws if a plugin with the same type is already registered. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(plugin: Plugin<any>): void {
    if (this.plugins.has(plugin.type)) {
      throw new Error(`Plugin "${plugin.type}" is already registered`);
    }
    this.plugins.set(plugin.type, plugin);
  }

  /** Get a registered plugin by type. Throws if not found. */
  get(type: string): Plugin {
    const plugin = this.plugins.get(type);
    if (!plugin) {
      throw new Error(`No plugin registered for type "${type}"`);
    }
    // Safe: heterogeneous registry stores Plugin<any>; callers use resolveProps() for typed props
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return plugin;
  }

  /** Check if a plugin is registered. */
  has(type: string): boolean {
    return this.plugins.has(type);
  }

  /** Get all registered plugins. */
  getAll(): Plugin[] {
    // Safe: see get() comment — type erasure is intentional for heterogeneous storage
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return [...this.plugins.values()];
  }

  /** Remove all registered plugins. */
  clear(): void {
    this.plugins.clear();
  }
}

/** Default module-level registry instance. */
const defaultRegistry = new PluginRegistry();

/**
 * Register a plugin in the default module-level registry.
 * For isolated registries (recommended for rendering and testing), create a PluginRegistry instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerPlugin(plugin: Plugin<any>): void {
  defaultRegistry.register(plugin);
}

/**
 * Get a plugin from the default module-level registry. Throws if not found.
 * For isolated registries (recommended for rendering and testing), use PluginRegistry.get().
 */
export function getPlugin(type: string): Plugin {
  return defaultRegistry.get(type);
}

/** Check if a plugin exists in the default registry. */
export function hasPlugin(type: string): boolean {
  return defaultRegistry.has(type);
}

/** Get all plugins from the default registry. */
export function getAllPlugins(): Plugin[] {
  return defaultRegistry.getAll();
}

/** Clear all plugins from the default registry (for testing). */
export function clearPlugins(): void {
  defaultRegistry.clear();
}
