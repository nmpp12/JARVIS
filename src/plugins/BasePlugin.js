/**
 * BasePlugin - Abstract base class for all JARVIS plugins
 * Provides common functionality and interface for plugin development
 */
export class BasePlugin {
  constructor() {
    this.name = 'base-plugin';
    this.version = '1.0.0';
    this.description = 'Base plugin class';
    this.capabilities = [];
    this.enabled = true;
    this.config = {};
    this.dependencies = [];
  }

  /**
   * Initialize the plugin
   * Override this method to add custom initialization logic
   */
  async initialize() {
    console.log(`[Plugin:${this.name}] Initialized`);
  }

  /**
   * Handle incoming requests
   * @param {Object} request - Request object with action and data
   * @returns {Promise<Object>} Response object
   */
  async handleRequest(request) {
    throw new Error('handleRequest must be implemented by plugin');
  }

  /**
   * Check if plugin can handle a specific request
   * @param {Object} request - Request object
   * @returns {boolean} True if plugin can handle the request
   */
  canHandle(request) {
    return this.capabilities.includes(request.capability);
  }

  /**
   * Validate plugin configuration
   * @param {Object} config - Configuration object
   * @returns {boolean} True if config is valid
   */
  validateConfig(config) {
    return true;
  }

  /**
   * Get plugin metadata
   * @returns {Object} Plugin metadata
   */
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      capabilities: this.capabilities,
      enabled: this.enabled,
      dependencies: this.dependencies
    };
  }

  /**
   * Enable the plugin
   */
  enable() {
    this.enabled = true;
    console.log(`[Plugin:${this.name}] Enabled`);
  }

  /**
   * Disable the plugin
   */
  disable() {
    this.enabled = false;
    console.log(`[Plugin:${this.name}] Disabled`);
  }

  /**
   * Update plugin configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (this.validateConfig(config)) {
      this.config = { ...this.config, ...config };
      console.log(`[Plugin:${this.name}] Configuration updated`);
    } else {
      throw new Error('Invalid configuration');
    }
  }

  /**
   * Cleanup on shutdown
   * Override this method for custom cleanup logic
   */
  async shutdown() {
    console.log(`[Plugin:${this.name}] Shutting down`);
  }

  /**
   * Handle errors gracefully
   * @param {Error} error - Error object
   * @returns {Object} Error response
   */
  handleError(error) {
    console.error(`[Plugin:${this.name}] Error:`, error);
    return {
      success: false,
      error: error.message,
      plugin: this.name
    };
  }
}

export default BasePlugin;