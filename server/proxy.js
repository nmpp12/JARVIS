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
    if (err.code === 'ECONNREFUSED') {
      // Ollama is not running - this is expected, don't log as error
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
      console.log('🔴 Proxy error:', err.message);
      res.status(500).json({ 
        error: 'Proxy error', 
        code: 'PROXY_ERROR',
        message: `Cannot connect to Ollama service: ${err.message}` 
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    // Only log successful proxy requests, not connection attempts
  }
});

// Use the proxy for all /ollama routes
app.use('/ollama', ollamaProxy);

// Yahoo Finance proxy — forwards /yahoo/* to query1.finance.yahoo.com
// We must inject a desktop User-Agent because Yahoo blocks default Node UAs.
const yahooProxy = createProxyMiddleware({
  target: 'https://query1.finance.yahoo.com',
  changeOrigin: true,
  secure: true,
  pathRewrite: { '^/yahoo': '' },
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
    proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9,pt;q=0.8');
  },
  onError: (err, req, res) => {
    console.log('🔴 Yahoo proxy error:', err.message);
    res.status(502).json({
      error: 'Yahoo Finance unavailable',
      code: 'YAHOO_PROXY_ERROR',
      message: err.message,
    });
  },
});
app.use('/yahoo', yahooProxy);

// MOM (custom LLM) status check
function checkMOMStatus() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path: '/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Proxy server is running', port: PORT });
});

// Combined LLM status endpoint
app.get('/llm-status', async (req, res) => {
  const [momRunning, ollamaRunning] = await Promise.all([
    checkMOMStatus(),
    checkOllamaStatus()
  ]);
  res.json({
    mom: { running: momRunning, url: 'http://localhost:8000' },
    ollama: { running: ollamaRunning, url: 'http://localhost:11434' },
    primary: momRunning ? 'mom' : (ollamaRunning ? 'ollama' : 'none'),
  });
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
  console.log(`🧠 MOM (custom LLM) expected at http://localhost:8000`);
  console.log(`🔗 Ollama API available at http://localhost:${PORT}/ollama`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 LLM status: http://localhost:${PORT}/llm-status`);

  // Check backend status on startup
  Promise.all([checkMOMStatus(), checkOllamaStatus()]).then(([momUp, ollamaUp]) => {
    if (momUp) {
      console.log('✅ MOM (custom LLM) is running — primary backend ready');
    } else {
      console.log('⚠️  MOM is not running. Start with: cd llm && python -m inference.server');
    }
    if (ollamaUp) {
      console.log('✅ Ollama is running (optional fallback)');
    } else {
      console.log('ℹ️  Ollama is not running (optional — not required)');
    }
  });
});