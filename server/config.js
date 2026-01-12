/**
 * Server Configuration
 * Centralized configuration for the JARVIS proxy server
 */

export const config = {
    // Server settings
    server: {
        port: process.env.PORT || 3001,
        host: process.env.HOST || 'localhost',
        env: process.env.NODE_ENV || 'development'
    },

    // Ollama settings
    ollama: {
        host: process.env.OLLAMA_HOST || 'http://localhost:11434',
        timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 120000, // 2 minutes
        retries: parseInt(process.env.OLLAMA_RETRIES) || 3
    },

    // CORS settings
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },

    // Request limits
    limits: {
        json: '50mb',
        urlencoded: '50mb'
    },

    // Logging
    logging: {
        enabled: process.env.LOGGING !== 'false',
        level: process.env.LOG_LEVEL || 'info'
    }
};

export default config;