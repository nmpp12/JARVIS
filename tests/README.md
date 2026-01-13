# JARVIS Tests

## 📋 Test Suite Overview

This directory contains automated tests for the JARVIS Desktop Application using the FrogProG (.fprg) format.

## 🧪 Test Files

### `jarvis-tests.fprg`
Comprehensive test suite covering:
- **Project Structure** (31 files validation)
- **Dependencies** (Node.js, npm, packages)
- **Ollama Service** (availability, models)
- **Proxy Server** (functionality, CORS)
- **Code Quality** (syntax validation)
- **File Integrity** (exports, structure)
- **Configuration** (default settings)
- **Web Interface** (HTML, CSS, JS loading)
- **Memory & Storage** (skill components)
- **Integration** (end-to-end flow)

## 🚀 Running Tests

### Prerequisites

1. **Install FrogProG Test Runner**
   ```bash
   npm install -g frogprog-runner
   # or
   pip install frogprog-runner
   ```

2. **Ensure JARVIS is set up**
   ```bash
   cd ~/JARVIS
   git checkout rebuild
   npm install
   ```

3. **Start Ollama**
   ```bash
   ollama serve
   ```

### Run All Tests

```bash
# From JARVIS root directory
frogprog run tests/jarvis-tests.fprg

# With verbose output
frogprog run tests/jarvis-tests.fprg --verbose

# Generate HTML report
frogprog run tests/jarvis-tests.fprg --report-html
```

### Run Specific Test Categories

```bash
# Run only structure tests
frogprog run tests/jarvis-tests.fprg --category Structure

# Run only critical tests
frogprog run tests/jarvis-tests.fprg --priority CRITICAL

# Run multiple categories
frogprog run tests/jarvis-tests.fprg --category "Backend,Frontend"
```

### Run Individual Tests

```bash
# Run specific test by name
frogprog run tests/jarvis-tests.fprg --test "Project Structure Validation"

# Run multiple specific tests
frogprog run tests/jarvis-tests.fprg --test "Ollama Service Check,Proxy Server Functionality"
```

## 📊 Test Results

After running tests, you'll find:

- **Console Output**: Real-time test execution feedback
- **test-results.txt**: Detailed text report
- **test-results.html**: Interactive HTML report (if --report-html flag used)

### Understanding Results

- ✅ **PASSED**: Test executed successfully
- ❌ **FAILED**: Test failed, check error message
- ⚠️  **WARNING**: Test passed with warnings
- ⏭️  **SKIPPED**: Test was skipped due to dependency

## 🔧 Manual Testing Alternative

If FrogProG runner is not available, you can run manual checks:

### 1. Structure Check
```bash
cd ~/JARVIS
ls -la src/core/
ls -la src/plugins/
ls -la src/skills/
ls -la public/
```

### 2. Syntax Check
```bash
# Check all JavaScript files
find src -name "*.js" -exec node -c {} \; && echo "All syntax valid"
```

### 3. Ollama Check
```bash
curl http://localhost:11434/api/tags
```

### 4. Start Services
```bash
# Terminal 1: Proxy Server
node proxy-server.js

# Terminal 2: Web Server
cd public
npx http-server -p 8080

# Terminal 3: Open browser
open http://localhost:8080
```

### 5. Browser Console Tests

Open DevTools (F12) and check:
```javascript
// Check if JARVIS loaded
console.log(window.jarvisApp);

// Check initialization
window.jarvisApp.isInitialized;

// Check JARVIS instance
window.jarvisApp.getJarvis();
```

## 📝 Test Checklist

Manual verification checklist:

- [ ] All 31 files exist
- [ ] package.json is valid
- [ ] Ollama is running
- [ ] llama3 model is available
- [ ] proxy-server.js starts without errors
- [ ] Web interface loads at localhost:8080
- [ ] No console errors in browser DevTools
- [ ] Chat input accepts text
- [ ] Navigation between views works
- [ ] Settings panel loads
- [ ] Memory stats display

## 🐛 Troubleshooting

### Test Failures

**"Ollama Service not available"**
```bash
# Start Ollama
ollama serve

# Check status
curl http://localhost:11434/api/tags
```

**"Proxy server not responding"**
```bash
# Kill existing process
pkill -f proxy-server

# Restart
node proxy-server.js
```

**"File not found" errors**
```bash
# Verify you're on rebuild branch
git branch

# If not, switch
git checkout rebuild
```

**"Syntax error" in JavaScript**
- Check Node.js version: `node --version` (should be >= 16)
- Update if needed: `nvm install 18`

## 📈 CI/CD Integration

To integrate with CI/CD pipelines:

```yaml
# Example GitHub Actions
name: JARVIS Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: frogprog run tests/jarvis-tests.fprg --report-html
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results.html
```

## 🤝 Contributing

To add new tests:

1. Edit `jarvis-tests.fprg`
2. Add new `@TEST` block
3. Set appropriate `@PRIORITY` and `@CATEGORY`
4. Add `@STEP` blocks with assertions
5. Run and verify

## 📚 Resources

- [FrogProG Documentation](https://frogprog.dev/docs)
- [JARVIS Documentation](../README.md)
- [Testing Best Practices](https://testing-library.com/docs/)

## ⚖️ License

Same as JARVIS project - MIT License