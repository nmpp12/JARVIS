import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import http from 'http';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Function to check if Ollama is running
function checkOllamaStatus() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/tags',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Middleware to check Ollama status before proxying
app.use('/ollama', async (req, res, next) => {
  const isOllamaRunning = await checkOllamaStatus();
  
  if (!isOllamaRunning) {
    console.log('⚠️  Ollama service is not running - returning service unavailable');
    return res.status(503).json({
      error: 'Ollama service unavailable',
      message: 'Ollama service is not running. Please start it with: ollama serve',
      code: 'OLLAMA_NOT_RUNNING',
      instructions: [
        '1. Open a new terminal window',
        '2. Run: ollama serve (keep this terminal open)',
        '3. In another terminal, pull a model: ollama pull llama2',
        '4. Refresh this page'
      ]
    });
  }
  
  next();
});

// Proxy middleware for Ollama API
const ollamaProxy = createProxyMiddleware({
  target: 'http://localhost:11434',
  changeOrigin: true,
  pathRewrite: {
    '^/ollama': '', // Remove /ollama prefix when forwarding to Ollama
  },
  onError: (err, req, res) => {
    console.log('🔴 Proxy error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Ollama service unavailable', 
        message: 'Ollama service is not running. Please start it with: ollama serve',
        code: 'OLLAMA_NOT_RUNNING',
        instructions: [
          '1. Open a new terminal window',
          '2. Run: ollama serve (keep this terminal open)',
          '3. In another terminal, pull a model: ollama pull llama2',
          '4. Refresh this page'
        ]
      });
    } else {
      res.status(500).json({ 
        error: 'Proxy error', 
        code: 'PROXY_ERROR',
        message: `Cannot connect to Ollama service: ${err.message}` 
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`✅ Proxying ${req.method} ${req.url} to Ollama`);
  }
});

// Use the proxy for all /ollama routes
app.use('/ollama', ollamaProxy);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Proxy server is running', port: PORT });
});

// Ollama status check endpoint
app.get('/ollama-status', async (req, res) => {
  const isRunning = await checkOllamaStatus();
  res.json({ 
    running: isRunning,
    message: isRunning ? 'Ollama is running' : 'Ollama is not running',
    instructions: isRunning ? null : [
      '1. Open a new terminal window',
      '2. Run: ollama serve (keep this terminal open)',
      '3. In another terminal, pull a model: ollama pull llama2',
      '4. Refresh this page'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`🔗 Ollama API available at http://localhost:${PORT}/ollama`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Ollama status: http://localhost:${PORT}/ollama-status`);
  
  // Check Ollama status on startup
  checkOllamaStatus().then(isRunning => {
    if (isRunning) {
      console.log('✅ Ollama service is running');
    } else {
      console.log('⚠️  Ollama service is not running');
      console.log('   To start Ollama:');
      console.log('   1. Open a new terminal window');
      console.log('   2. Run: ollama serve');
      console.log('   3. Keep that terminal open');
    }
  });
});