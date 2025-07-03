import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Proxy middleware for Ollama API
const ollamaProxy = createProxyMiddleware({
  target: 'http://localhost:11434',
  changeOrigin: true,
  pathRewrite: {
    '^/ollama': '', // Remove /ollama prefix when forwarding to Ollama
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: 'Cannot connect to Ollama service. Please ensure Ollama is running on http://localhost:11434' 
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to Ollama`);
  }
});

// Use the proxy for all /ollama routes
app.use('/ollama', ollamaProxy);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Proxy server is running', port: PORT });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Ollama API available at http://localhost:${PORT}/ollama`);
});