/**
 * PluginManager - Manages all plugins in the JARVIS system
 * Handles loading, initialization, and communication with plugins
 */
export class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.initialized = false;
  }

  /**
   * Initialize plugin manager and load all plugins
   */
  async initialize() {
    if (this.initialized) return;

    console.log('[PluginManager] Initializing...');
    
    try {
      // Load all plugins dynamically
      await this.loadPlugins();
      this.initialized = true;
      console.log(`[PluginManager] Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      console.error('[PluginManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load all available plugins
   */
  async loadPlugins() {
    const pluginModules = [
      './WeatherPlugin.js',
      './NewsPlugin.js',
      './CalendarPlugin.js',
      './TaskPlugin.js',
      './CodePlugin.js'
    ];

    for (const modulePath of pluginModules) {
      try {
        const module = await import(modulePath);
        const PluginClass = module.default || Object.values(module)[0];
        const plugin = new PluginClass();
        await this.registerPlugin(plugin);
      } catch (error) {
        console.warn(`[PluginManager] Failed to load ${modulePath}:`, error.message);
      }
    }
  }

  /**
   * Register a plugin
   * @param {BasePlugin} plugin - Plugin instance
   */
  async registerPlugin(plugin) {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} already registered`);
    }

    // Check dependencies
    for (const dep of plugin.dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Plugin ${plugin.name} requires ${dep}`);
      }
    }

    await plugin.initialize();
    this.plugins.set(plugin.name, plugin);
    console.log(`[PluginManager] Registered: ${plugin.name} v${plugin.version}`);
  }

  /**
   * Unregister a plugin
   * @param {string} pluginName - Name of plugin to unregister
   */
  async unregisterPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    await plugin.shutdown();
    this.plugins.delete(pluginName);
    console.log(`[PluginManager] Unregistered: ${pluginName}`);
  }

  /**
   * Get a specific plugin
   * @param {string} pluginName - Name of the plugin
   * @returns {BasePlugin} Plugin instance
   */
  getPlugin(pluginName) {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all registered plugins
   * @returns {Array<BasePlugin>} Array of plugin instances
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by capability
   * @param {string} capability - Capability to search for
   * @returns {Array<BasePlugin>} Plugins with the capability
   */
  getPluginsByCapability(capability) {
    return this.getAllPlugins().filter(plugin => 
      plugin.enabled && plugin.capabilities.includes(capability)
    );
  }

  /**
   * Route request to appropriate plugin
   * @param {Object} request - Request object
   * @returns {Promise<Object>} Response from plugin
   */
  async routeRequest(request) {
    const { pluginName, capability, action, data } = request;

    // Try specific plugin first
    if (pluginName) {
      const plugin = this.getPlugin(pluginName);
      if (plugin && plugin.enabled) {
        return await plugin.handleRequest({ action, data });
      }
      throw new Error(`Plugin ${pluginName} not available`);
    }

    // Find plugins by capability
    if (capability) {
      const plugins = this.getPluginsByCapability(capability);
      if (plugins.length === 0) {
        throw new Error(`No plugin available for capability: ${capability}`);
      }
      // Use first available plugin
      return await plugins[0].handleRequest({ action, data });
    }

    throw new Error('Invalid request: must specify pluginName or capability');
  }

  /**
   * Enable a plugin
   * @param {string} pluginName - Name of plugin to enable
   */
  enablePlugin(pluginName) {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    plugin.enable();
  }

  /**
   * Disable a plugin
   * @param {string} pluginName - Name of plugin to disable
   */
  disablePlugin(pluginName) {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    plugin.disable();
  }

  /**
   * Get plugin manager status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      totalPlugins: this.plugins.size,
      enabledPlugins: this.getAllPlugins().filter(p => p.enabled).length,
      plugins: this.getAllPlugins().map(p => p.getMetadata())
    };
  }

  /**
   * Shutdown all plugins
   */
  async shutdown() {
    console.log('[PluginManager] Shutting down all plugins...');
    for (const plugin of this.plugins.values()) {
      await plugin.shutdown();
    }
    this.plugins.clear();
    this.initialized = false;
  }
}

export default PluginManager;