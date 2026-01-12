import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// Middleware
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        ollamaHost: OLLAMA_HOST,
        port: PORT
    });
});

// Ollama proxy configuration
const ollamaProxy = createProxyMiddleware({
    target: OLLAMA_HOST,
    changeOrigin: true,
    pathRewrite: {
        '^/ollama': '/api'
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy] ${req.method} ${req.path} -> ${OLLAMA_HOST}${req.path}`);
        
        // Handle JSON body
        if (req.body) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`[Proxy] Response: ${proxyRes.statusCode} from ${req.path}`);
    },
    onError: (err, req, res) => {
        console.error('[Proxy Error]:', err.message);
        res.status(500).json({
            error: 'Proxy Error',
            message: err.message,
            suggestion: 'Make sure Ollama is running (ollama serve)'
        });
    }
});

// Apply Ollama proxy
app.use('/ollama', ollamaProxy);

// Custom Ollama endpoints with better error handling
app.post('/api/generate', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error(`Ollama responded with status ${response.status}`);
        }

        // Stream the response
        res.setHeader('Content-Type', 'application/json');
        response.body.pipe(res);
    } catch (error) {
        console.error('[Generate Error]:', error.message);
        res.status(500).json({
            error: 'Generation failed',
            message: error.message,
            suggestion: 'Check if Ollama is running and the model is available'
        });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error(`Ollama responded with status ${response.status}`);
        }

        // Stream the response
        res.setHeader('Content-Type', 'application/json');
        response.body.pipe(res);
    } catch (error) {
        console.error('[Chat Error]:', error.message);
        res.status(500).json({
            error: 'Chat failed',
            message: error.message,
            suggestion: 'Check if Ollama is running and the model is available'
        });
    }
});

app.get('/api/tags', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/tags`);
        
        if (!response.ok) {
            throw new Error(`Ollama responded with status ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('[Tags Error]:', error.message);
        res.status(500).json({
            error: 'Failed to fetch models',
            message: error.message,
            suggestion: 'Make sure Ollama is running (ollama serve)'
        });
    }
});

app.get('/api/show', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/show`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: req.query.name })
        });
        
        if (!response.ok) {
            throw new Error(`Ollama responded with status ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('[Show Error]:', error.message);
        res.status(500).json({
            error: 'Failed to show model info',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[Server Error]:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🤖  JARVIS Proxy Server'.padStart(40));
    console.log('='.repeat(60));
    console.log(`\n✅  Server running on: http://localhost:${PORT}`);
    console.log(`✅  Ollama host: ${OLLAMA_HOST}`);
    console.log(`\n📡  Endpoints:`);
    console.log(`    - Health: http://localhost:${PORT}/health`);
    console.log(`    - Generate: http://localhost:${PORT}/api/generate`);
    console.log(`    - Chat: http://localhost:${PORT}/api/chat`);
    console.log(`    - Models: http://localhost:${PORT}/api/tags`);
    console.log(`\n💡  Make sure Ollama is running: ollama serve`);
    console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋  Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋  Shutting down gracefully...');
    process.exit(0);
});

export default app;