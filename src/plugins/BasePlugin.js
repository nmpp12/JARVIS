/**
 * Base Plugin
 * Abstract base class for all JARVIS plugins
 */

export class BasePlugin {
    constructor(name, description = '') {
        if (new.target === BasePlugin) {
            throw new TypeError('Cannot instantiate abstract class BasePlugin directly');
        }

        this.name = name;
        this.description = description;
        this.enabled = true;
        this.version = '1.0.0';
        this.dependencies = [];
    }

    /**
     * Initialize the plugin
     * Override this method in subclasses
     */
    async initialize() {
        console.log(`🔌 Initializing plugin: ${this.name}`);
        return true;
    }

    /**
     * Execute plugin functionality
     * Must be implemented by subclasses
     */
    async execute(params) {
        throw new Error('execute() must be implemented by subclass');
    }

    /**
     * Validate plugin parameters
     */
    validate(params) {
        return true;
    }

    /**
     * Get plugin info
     */
    getInfo() {
        return {
            name: this.name,
            description: this.description,
            version: this.version,
            enabled: this.enabled,
            dependencies: this.dependencies
        };
    }

    /**
     * Enable plugin
     */
    enable() {
        this.enabled = true;
        console.log(`✅ Plugin enabled: ${this.name}`);
    }

    /**
     * Disable plugin
     */
    disable() {
        this.enabled = false;
        console.log(`❌ Plugin disabled: ${this.name}`);
    }

    /**
     * Check if plugin is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log(`🧹 Cleaning up plugin: ${this.name}`);
    }

    /**
     * Handle errors
     */
    handleError(error, context = '') {
        console.error(`[${this.name}] Error ${context}:`, error);
        return {
            success: false,
            error: error.message,
            plugin: this.name
        };
    }

    /**
     * Log plugin activity
     */
    log(message, level = 'info') {
        const prefix = `[${this.name}]`;
        switch (level) {
            case 'error':
                console.error(prefix, message);
                break;
            case 'warn':
                console.warn(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    }
}

export default BasePlugin;