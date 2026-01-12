/**
 * Code Plugin
 * Assists with code generation, analysis, and debugging
 */

import BasePlugin from './BasePlugin.js';

export class CodePlugin extends BasePlugin {
    constructor() {
        super('code', 'Assists with code generation, analysis, and debugging');
        this.supportedLanguages = [
            'javascript', 'python', 'java', 'c++', 'c#', 'ruby',
            'go', 'rust', 'typescript', 'php', 'swift', 'kotlin'
        ];
        this.snippets = [];
    }

    async initialize() {
        await super.initialize();
        this.loadSnippets();
        this.log('Code plugin ready');
        return true;
    }

    /**
     * Validate parameters
     */
    validate(params) {
        if (!params.request && !params.action) {
            return false;
        }
        return true;
    }

    /**
     * Execute code operation
     */
    async execute(params) {
        try {
            const action = params.action || 'generate';

            switch (action) {
                case 'generate':
                    return await this.generateCode(params);
                case 'analyze':
                    return await this.analyzeCode(params.code);
                case 'debug':
                    return await this.debugCode(params.code, params.error);
                case 'optimize':
                    return await this.optimizeCode(params.code);
                case 'explain':
                    return await this.explainCode(params.code);
                case 'snippet':
                    return this.manageSnippet(params);
                default:
                    return await this.generateCode(params);
            }
        } catch (error) {
            return this.handleError(error, 'executing code operation');
        }
    }

    /**
     * Generate code based on request
     */
    async generateCode(params) {
        const language = params.language || 'javascript';
        const request = params.request;
        const type = params.type || 'function';

        this.log(`Generating ${language} ${type}`);

        // This would integrate with Ollama for actual code generation
        // For now, return a template
        const template = this.getCodeTemplate(language, type, request);

        return [
            `💻 Generated ${language} ${type}:\n`,
            '```' + language,
            template,
            '```',
            '\nNote: This is a template. For AI-generated code, ensure Ollama is running with CodeLlama model.'
        ].join('\n');
    }

    /**
     * Analyze code for issues
     */
    async analyzeCode(code) {
        if (!code) {
            return '❌ No code provided for analysis.';
        }

        const issues = this.performStaticAnalysis(code);
        
        if (issues.length === 0) {
            return '✅ No obvious issues found in the code.';
        }

        return [
            '🔍 Code Analysis Results:\n',
            ...issues.map((issue, i) => `${i + 1}. ${issue}`),
            '\nRecommendation: Review and address these issues.'
        ].join('\n');
    }

    /**
     * Debug code with error context
     */
    async debugCode(code, error) {
        if (!code) {
            return '❌ No code provided for debugging.';
        }

        const suggestions = this.getDebugSuggestions(code, error);

        return [
            '🐛 Debug Analysis:\n',
            error ? `Error: ${error}\n` : '',
            'Possible causes:',
            ...suggestions.map((s, i) => `${i + 1}. ${s}`),
            '\nTip: Use console.log() or debugger statements to trace execution.'
        ].join('\n');
    }

    /**
     * Optimize code
     */
    async optimizeCode(code) {
        if (!code) {
            return '❌ No code provided for optimization.';
        }

        const optimizations = this.findOptimizations(code);

        if (optimizations.length === 0) {
            return '✅ Code looks well-optimized.';
        }

        return [
            '⚡ Optimization Suggestions:\n',
            ...optimizations.map((opt, i) => `${i + 1}. ${opt}`)
        ].join('\n');
    }

    /**
     * Explain code
     */
    async explainCode(code) {
        if (!code) {
            return '❌ No code provided to explain.';
        }

        // Simple explanation - would use AI in production
        const explanation = this.generateExplanation(code);

        return [
            '📚 Code Explanation:\n',
            explanation,
            '\nFor detailed line-by-line explanation, use AI model with the code.'
        ].join('\n');
    }

    /**
     * Manage code snippets
     */
    manageSnippet(params) {
        const action = params.snippetAction || 'list';

        switch (action) {
            case 'save':
                return this.saveSnippet(params.name, params.code, params.language);
            case 'load':
                return this.loadSnippet(params.name);
            case 'list':
                return this.listSnippets();
            case 'delete':
                return this.deleteSnippet(params.name);
            default:
                return this.listSnippets();
        }
    }

    /**
     * Get code template
     */
    getCodeTemplate(language, type, description) {
        const templates = {
            javascript: {
                function: `/**\n * ${description || 'Function description'}\n */\nfunction myFunction(param) {\n    // Implementation\n    return result;\n}`,
                class: `class MyClass {\n    constructor() {\n        // Initialize\n    }\n\n    myMethod() {\n        // Implementation\n    }\n}`,
                async: `async function fetchData(url) {\n    try {\n        const response = await fetch(url);\n        const data = await response.json();\n        return data;\n    } catch (error) {\n        console.error('Error:', error);\n    }\n}`
            },
            python: {
                function: `def my_function(param):\n    """${description || 'Function description'}"""\n    # Implementation\n    return result`,
                class: `class MyClass:\n    def __init__(self):\n        # Initialize\n        pass\n\n    def my_method(self):\n        # Implementation\n        pass`
            }
        };

        return templates[language]?.[type] || `// ${language} ${type} template\n// Add your code here`;
    }

    /**
     * Perform static analysis
     */
    performStaticAnalysis(code) {
        const issues = [];

        // Check for common issues
        if (code.includes('var ')) {
            issues.push('⚠️ Use "let" or "const" instead of "var"');
        }
        if (code.includes('==') && !code.includes('===')) {
            issues.push('⚠️ Use strict equality (===) instead of loose equality (==)');
        }
        if (code.split('\n').some(line => line.length > 120)) {
            issues.push('📊 Some lines exceed 120 characters');
        }
        if (!code.includes('//') && !code.includes('/*')) {
            issues.push('📝 Consider adding comments for clarity');
        }

        return issues;
    }

    /**
     * Get debug suggestions
     */
    getDebugSuggestions(code, error) {
        const suggestions = [];

        if (error?.includes('undefined')) {
            suggestions.push('Check if variables are properly initialized');
            suggestions.push('Verify object properties exist before accessing');
        }
        if (error?.includes('null')) {
            suggestions.push('Add null/undefined checks');
            suggestions.push('Use optional chaining (?.) for safer property access');
        }
        if (error?.includes('syntax')) {
            suggestions.push('Check for missing brackets, parentheses, or semicolons');
            suggestions.push('Verify proper string quotation marks');
        }
        if (code.includes('async') && !code.includes('await')) {
            suggestions.push('Async function might be missing "await" keywords');
        }

        if (suggestions.length === 0) {
            suggestions.push('Review variable scopes and types');
            suggestions.push('Check function parameters and return values');
            suggestions.push('Look for typos in variable/function names');
        }

        return suggestions;
    }

    /**
     * Find optimization opportunities
     */
    findOptimizations(code) {
        const optimizations = [];

        if (code.includes('for (') && code.includes('.length')) {
            optimizations.push('Cache array length in loops for better performance');
        }
        if (code.match(/\.map\(.*\)\.filter\(/)) {
            optimizations.push('Consider combining .map() and .filter() operations');
        }
        if (code.includes('innerHTML')) {
            optimizations.push('Consider using textContent or createDocumentFragment for better performance');
        }
        if (code.match(/querySelector.*querySelector/)) {
            optimizations.push('Cache DOM queries in variables to avoid repeated lookups');
        }

        return optimizations;
    }

    /**
     * Generate code explanation
     */
    generateExplanation(code) {
        const lines = code.split('\n').length;
        const hasFunctions = code.includes('function') || code.includes('=>');
        const hasClasses = code.includes('class ');
        const hasAsync = code.includes('async');

        let explanation = `This code snippet contains ${lines} line(s). `;

        if (hasClasses) explanation += 'It defines one or more classes. ';
        if (hasFunctions) explanation += 'It includes function definitions. ';
        if (hasAsync) explanation += 'It uses asynchronous operations. ';

        return explanation || 'This is a simple code snippet.';
    }

    /**
     * Save code snippet
     */
    saveSnippet(name, code, language) {
        if (!name || !code) {
            return '❌ Name and code are required to save a snippet.';
        }

        const snippet = {
            name,
            code,
            language: language || 'javascript',
            savedAt: new Date().toISOString()
        };

        this.snippets.push(snippet);
        this.saveSnippets();

        return `✅ Snippet "${name}" saved successfully.`;
    }

    /**
     * Load code snippet
     */
    loadSnippet(name) {
        const snippet = this.snippets.find(s => s.name === name);

        if (!snippet) {
            return `❌ Snippet "${name}" not found.`;
        }

        return [
            `📋 Snippet: ${snippet.name}\n`,
            '```' + snippet.language,
            snippet.code,
            '```'
        ].join('\n');
    }

    /**
     * List all snippets
     */
    listSnippets() {
        if (this.snippets.length === 0) {
            return 'No saved snippets.';
        }

        const lines = ['Saved Code Snippets:\n'];
        this.snippets.forEach((snippet, i) => {
            lines.push(`${i + 1}. ${snippet.name} (${snippet.language})`);
        });

        return lines.join('\n');
    }

    /**
     * Delete snippet
     */
    deleteSnippet(name) {
        const index = this.snippets.findIndex(s => s.name === name);

        if (index === -1) {
            return `❌ Snippet "${name}" not found.`;
        }

        this.snippets.splice(index, 1);
        this.saveSnippets();

        return `🗑️ Snippet "${name}" deleted.`;
    }

    /**
     * Save snippets to storage
     */
    saveSnippets() {
        try {
            localStorage.setItem('jarvis_code_snippets', JSON.stringify(this.snippets));
        } catch (error) {
            this.log('Failed to save snippets', 'error');
        }
    }

    /**
     * Load snippets from storage
     */
    loadSnippets() {
        try {
            const saved = localStorage.getItem('jarvis_code_snippets');
            if (saved) {
                this.snippets = JSON.parse(saved);
            }
            this.log(`Loaded ${this.snippets.length} code snippets`);
        } catch (error) {
            this.log('Failed to load snippets', 'error');
        }
    }
}

export default CodePlugin;