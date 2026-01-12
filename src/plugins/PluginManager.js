/**
 * Plugin Manager
 * Manages loading, initialization, and execution of plugins
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
        try {
            console.log('🔌 Initializing Plugin Manager...');
            
            // Import and register all plugins
            await this.loadPlugins();
            
            this.initialized = true;
            console.log(`✅ Plugin Manager initialized with ${this.plugins.size} plugins`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Plugin Manager:', error);
            return false;
        }
    }

    /**
     * Load all available plugins
     */
    async loadPlugins() {
        // Plugins will be loaded dynamically
        // This is a placeholder for now
        console.log('📦 Loading plugins...');
        
        // Plugins are registered manually for now
        // In production, this could scan a directory
    }

    /**
     * Register a plugin
     */
    async registerPlugin(plugin) {
        try {
            if (!plugin.name) {
                throw new Error('Plugin must have a name');
            }

            // Initialize plugin
            await plugin.initialize();
            
            // Store plugin
            this.plugins.set(plugin.name.toLowerCase(), plugin);
            
            console.log(`✅ Registered plugin: ${plugin.name}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to register plugin ${plugin.name}:`, error);
            return false;
        }
    }

    /**
     * Unregister a plugin
     */
    async unregisterPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName.toLowerCase());
        
        if (plugin) {
            await plugin.cleanup();
            this.plugins.delete(pluginName.toLowerCase());
            console.log(`🗑️ Unregistered plugin: ${pluginName}`);
            return true;
        }
        
        return false;
    }

    /**
     * Get a specific plugin
     */
    getPlugin(pluginName) {
        return this.plugins.get(pluginName.toLowerCase());
    }

    /**
     * Execute a plugin
     */
    async executePlugin(pluginName, params = {}) {
        const plugin = this.getPlugin(pluginName);
        
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginName}`);
        }

        if (!plugin.isEnabled()) {
            throw new Error(`Plugin is disabled: ${pluginName}`);
        }

        // Validate parameters
        if (!plugin.validate(params)) {
            throw new Error(`Invalid parameters for plugin: ${pluginName}`);
        }

        // Execute plugin
        return await plugin.execute(params);
    }

    /**
     * Get all loaded plugins
     */
    getLoadedPlugins() {
        return Array.from(this.plugins.values()).map(plugin => plugin.getInfo());
    }

    /**
     * Enable a plugin
     */
    enablePlugin(pluginName) {
        const plugin = this.getPlugin(pluginName);
        if (plugin) {
            plugin.enable();
            return true;
        }
        return false;
    }

    /**
     * Disable a plugin
     */
    disablePlugin(pluginName) {
        const plugin = this.getPlugin(pluginName);
        if (plugin) {
            plugin.disable();
            return true;
        }
        return false;
    }

    /**
     * Check if a plugin is loaded
     */
    hasPlugin(pluginName) {
        return this.plugins.has(pluginName.toLowerCase());
    }

    /**
     * Get plugin count
     */
    getPluginCount() {
        return this.plugins.size;
    }

    /**
     * List all plugin names
     */
    listPlugins() {
        return Array.from(this.plugins.keys());
    }

    /**
     * Cleanup all plugins
     */
    async cleanup() {
        console.log('🧹 Cleaning up all plugins...');
        
        for (const plugin of this.plugins.values()) {
            await plugin.cleanup();
        }
        
        this.plugins.clear();
        this.initialized = false;
    }
}

export default PluginManager;