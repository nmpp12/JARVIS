# Contributing to JARVIS

Thank you for your interest in contributing to JARVIS! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the best solution for the project
- Help others learn and grow

## Getting Started

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** installed and running
3. **Git** for version control
4. **Code editor** (VS Code recommended)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/nmpp12/JARVIS.git
cd JARVIS

# Install dependencies
npm install

# Start Ollama (in separate terminal)
ollama serve

# Pull required models
ollama pull llama2
ollama pull codellama

# Start development server
npm run dev
```

## Project Structure

```
JARVIS/
├── src/
│   ├── core/              # Core AI logic
│   ├── components/        # UI components
│   ├── services/          # External services
│   ├── plugins/           # Plugin system
│   ├── storage/           # Data persistence
│   ├── utils/             # Utility functions
│   └── styles/            # CSS styles
├── server/                # Express proxy server
├── docs/                  # Documentation
├── tests/                 # Test files
└── public/                # Static assets
```

## Coding Standards

### JavaScript Style Guide

```javascript
// Use ES6+ features
const myFunction = async (param) => {
  // Use const by default, let when reassignment needed
  const result = await someAsyncOperation();
  return result;
};

// Use descriptive variable names
const userMessage = 'Hello';
const aiResponse = await generateResponse(userMessage);

// Use JSDoc comments for functions
/**
 * Generates AI response for user input
 * @param {string} input - User message
 * @param {Object} context - Conversation context
 * @returns {Promise<Object>} AI response object
 */
async function generateResponse(input, context) {
  // Implementation
}
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `ChatInterface.js`)
- **Utilities**: camelCase (e.g., `formatMessage.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.js`)
- **Styles**: kebab-case (e.g., `chat-interface.css`)

### Code Organization

1. **Imports** at the top
2. **Constants** after imports
3. **Helper functions** before main functions
4. **Main class/function** last
5. **Export** at the bottom

## Creating a Plugin

### Plugin Template

```javascript
// src/plugins/MyPlugin.js
import { BasePlugin } from './BasePlugin.js';

export class MyPlugin extends BasePlugin {
  constructor() {
    super();
    this.name = 'my-plugin';
    this.version = '1.0.0';
    this.description = 'Description of what the plugin does';
    this.capabilities = ['capability1', 'capability2'];
  }

  /**
   * Initialize plugin
   */
  async initialize() {
    console.log(`${this.name} initialized`);
    // Setup logic here
  }

  /**
   * Handle incoming requests
   * @param {Object} request - Request object
   * @returns {Promise<Object>} Response object
   */
  async handleRequest(request) {
    const { action, data } = request;
    
    switch (action) {
      case 'action1':
        return await this.handleAction1(data);
      case 'action2':
        return await this.handleAction2(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    console.log(`${this.name} shutting down`);
    // Cleanup logic here
  }

  // Private helper methods
  async handleAction1(data) {
    // Implementation
  }

  async handleAction2(data) {
    // Implementation
  }
}
```

### Registering Your Plugin

```javascript
// src/plugins/index.js
import { MyPlugin } from './MyPlugin.js';

export const plugins = [
  // ... existing plugins
  MyPlugin
];
```

## Testing

### Writing Tests

```javascript
// tests/MyPlugin.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { MyPlugin } from '../src/plugins/MyPlugin.js';

describe('MyPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new MyPlugin();
  });

  it('should initialize correctly', async () => {
    await plugin.initialize();
    expect(plugin.name).toBe('my-plugin');
  });

  it('should handle requests', async () => {
    const request = { action: 'action1', data: {} };
    const response = await plugin.handleRequest(request);
    expect(response).toBeDefined();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Write tests** for new features
3. **Run linter**: `npm run lint`
4. **Run tests**: `npm test`
5. **Test manually** in browser

### PR Guidelines

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make commits with clear messages**
   ```bash
   git commit -m "feat: add new weather plugin"
   ```

3. **Use conventional commit format**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `style:` Formatting
   - `refactor:` Code restructuring
   - `test:` Tests
   - `chore:` Maintenance

4. **Push to your fork**
   ```bash
   git push origin feature/my-feature
   ```

5. **Create Pull Request** on GitHub

### PR Template

```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## Bug Reports

### Issue Template

```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [e.g., macOS 13.0]
- Browser: [e.g., Chrome 120]
- Node: [e.g., v18.0.0]
- Ollama: [e.g., v0.1.17]

## Screenshots
[If applicable]

## Additional Context
[Any other relevant information]
```

## Feature Requests

### Feature Template

```markdown
## Feature Description
[Clear description of the feature]

## Use Case
[Why this feature would be useful]

## Proposed Implementation
[If you have ideas on how to implement]

## Alternatives Considered
[Other approaches you've thought about]
```

## Documentation

### Updating Documentation

- Keep README.md up to date
- Update ARCHITECTURE.md for structural changes
- Add inline code comments
- Update API documentation

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add diagrams when helpful
- Keep it up to date

## Performance Guidelines

### Best Practices

1. **Avoid blocking operations**
   ```javascript
   // Bad
   const data = fs.readFileSync('file.txt');
   
   // Good
   const data = await fs.promises.readFile('file.txt');
   ```

2. **Use caching when appropriate**
   ```javascript
   const cache = new Map();
   
   async function getCachedData(key) {
     if (cache.has(key)) return cache.get(key);
     const data = await fetchData(key);
     cache.set(key, data);
     return data;
   }
   ```

3. **Debounce frequent operations**
   ```javascript
   const debouncedSearch = debounce(search, 300);
   ```

4. **Lazy load heavy components**
   ```javascript
   const HeavyComponent = () => import('./HeavyComponent.js');
   ```

## Security Guidelines

### Input Validation

```javascript
// Always validate user input
function validateInput(input) {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  if (input.length > 1000) {
    throw new Error('Input too long');
  }
  return sanitizeHtml(input);
}
```

### API Key Management

```javascript
// Never commit API keys
// Use environment variables
const API_KEY = process.env.API_KEY;

// Or load from secure config
import { config } from './config.secure.js';
```

## Community

### Getting Help

- Open an issue for bugs
- Use discussions for questions
- Check existing issues first
- Be patient and respectful

### Staying Updated

- Watch repository for updates
- Follow release notes
- Join community discussions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to JARVIS! Your efforts help make this project better for everyone.** 🚀