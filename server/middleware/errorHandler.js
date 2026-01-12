/**
 * Error Handling Middleware
 * Centralized error handling for the proxy server
 */

export const errorHandler = (err, req, res, next) => {
    console.error('[Error Handler]:', err);

    // Default error status
    const status = err.status || err.statusCode || 500;

    // Error response
    const response = {
        error: err.name || 'ServerError',
        message: err.message || 'An unexpected error occurred',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    // Send error response
    res.status(status).json(response);
};

export default errorHandler;