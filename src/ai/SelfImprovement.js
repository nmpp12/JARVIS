import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

export class SelfImprovement {
    constructor() {
        this.enabled = false;
        this.improvementHistory = [];
        this.codeAnalysisCache = new Map();
        this.performanceMetrics = {
            responseTime: [],
            accuracy: [],
            userSatisfaction: [],
            responseQuality: [],
        };
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    async analyzeCurrentCode() {
        const codeFiles = await this.getProjectFiles();
        const improvements = [];

        for (const file of codeFiles) {
            const analysis = await this.analyzeFile(file);
            improvements.push(...analysis.suggestions);
        }

        return improvements;
    }

    async analyzeFile(file) {
        try {
            const response = await fetch(`/src/${file.path}`);
            const code = await response.text();
            
            // Parse the code
            const ast = esprima.parseScript(code, { tolerant: true });
            
            const suggestions = [];
            
            // Analyze for common improvements
            this.traverseAST(ast, (node) => {
                // Check for performance improvements
                if (node.type === 'CallExpression' && 
                    node.callee.property && 
                    node.callee.property.name === 'forEach') {
                    suggestions.push({
                        type: 'performance',
                        description: 'Consider using for...of loop for better performance',
                        line: node.loc ? node.loc.start.line : 0,
                        file: file.path
                    });
                }

                // Check for error handling
                if (node.type === 'CallExpression' && 
                    node.callee.name === 'fetch' &&
                    !this.hasErrorHandling(node)) {
                    suggestions.push({
                        type: 'error_handling',
                        description: 'Add error handling for fetch calls',
                        line: node.loc ? node.loc.start.line : 0,
                        file: file.path
                    });
                }

                // Check for code complexity
                if (node.type === 'FunctionDeclaration' && 
                    this.calculateComplexity(node) > 10) {
                    suggestions.push({
                        type: 'complexity',
                        description: 'Function complexity is high, consider refactoring',
                        line: node.loc ? node.loc.start.line : 0,
                        file: file.path
                    });
                }
            });

            return { file: file.path, suggestions };
        } catch (error) {
            console.error(`Error analyzing file ${file.path}:`, error);
            return { file: file.path, suggestions: [] };
        }
    }

    traverseAST(node, callback) {
        callback(node);
        
        for (const key in node) {
            if (node[key] && typeof node[key] === 'object') {
                if (Array.isArray(node[key])) {
                    node[key].forEach(child => {
                        if (child && typeof child === 'object' && child.type) {
                            this.traverseAST(child, callback);
                        }
                    });
                } else if (node[key].type) {
                    this.traverseAST(node[key], callback);
                }
            }
        }
    }

    hasErrorHandling(node) {
        // Simple check for try-catch or .catch()
        let parent = node.parent;
        while (parent) {
            if (parent.type === 'TryStatement' || 
                (parent.type === 'CallExpression' && 
                 parent.callee.property && 
                 parent.callee.property.name === 'catch')) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
    }

    calculateComplexity(node) {
        let complexity = 1;
        
        this.traverseAST(node, (child) => {
            if (['IfStatement', 'WhileStatement', 'ForStatement', 
                 'SwitchCase', 'ConditionalExpression'].includes(child.type)) {
                complexity++;
            }
        });
        
        return complexity;
    }

    async getProjectFiles() {
        // In a real implementation, this would scan the actual file system
        return [
            { path: 'main.js', type: 'javascript' },
            { path: 'core/AIAssistant.js', type: 'javascript' },
            { path: 'ai/MOMLLMClient.js', type: 'javascript' },
            { path: 'ai/OllamaClient.js', type: 'javascript' },
            { path: 'ai/SelfImprovement.js', type: 'javascript' },
            { path: 'ui/UIManager.js', type: 'javascript' },
            { path: 'voice/VoiceManager.js', type: 'javascript' }
        ];
    }

    async implementImprovements() {
        if (!this.enabled) {
            return { implemented: 0, summary: 'Self-improvement is disabled' };
        }

        const improvements = await this.analyzeCurrentCode();
        let implemented = 0;
        const results = [];

        for (const improvement of improvements.slice(0, 3)) { // Limit to 3 improvements at a time
            try {
                const result = await this.applyImprovement(improvement);
                if (result.success) {
                    implemented++;
                    results.push(result.description);
                }
            } catch (error) {
                console.error('Failed to apply improvement:', error);
            }
        }

        const summary = results.length > 0 ? 
            `Applied improvements: ${results.join(', ')}` : 
            'No improvements could be safely applied automatically';

        this.improvementHistory.push({
            timestamp: new Date().toISOString(),
            implemented,
            summary
        });

        return { implemented, summary };
    }

    async applyImprovement(_improvement) {
        // Automatic code modification is not implemented.
        // analyzeCurrentCode() surfaces suggestions for human review only.
        return { success: false, description: 'Auto-apply not implemented — review suggestions manually' };
    }

    /**
     * Record an interaction. Called by AIAssistant after each response.
     * @param {string} input - The user's raw input text.
     * @param {string} responseText - The assistant's response text.
     */
    recordInteraction(input, responseText) {
        const response = { text: responseText };
        const analysis = {
            timestamp: new Date().toISOString(),
            input,
            response: responseText,
            inputType: this.classifyInput(input),
            responseQuality: this.assessResponseQuality(response),
            learningOpportunity: this.identifyLearningOpportunity(input, response),
        };

        this.improvementHistory.push(analysis);

        // Keep only the last 100 entries
        if (this.improvementHistory.length > 100) {
            this.improvementHistory = this.improvementHistory.slice(-100);
        }

        this.updatePerformanceMetrics(analysis);
    }

    async analyzeInteraction(input, response) {
        // Kept for backwards compatibility — prefer recordInteraction().
        this.recordInteraction(input, typeof response === 'string' ? response : response.text);
    }

    classifyInput(input) {
        const patterns = {
            question: /\?$/,
            command: /^(do|make|create|generate|analyze)/i,
            request: /^(please|can you|could you)/i,
            code: /(function|class|const|let|var|import|export)/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(input)) {
                return type;
            }
        }

        return 'general';
    }

    assessResponseQuality(response) {
        // Simple quality assessment based on response characteristics
        let score = 0.5;

        if (response.text.length > 50) score += 0.1;
        if (response.text.includes('```')) score += 0.1; // Contains code
        if (response.codeImprovement) score += 0.2;
        if (response.speak) score += 0.1;

        return Math.min(score, 1.0);
    }

    identifyLearningOpportunity(input, response) {
        // Identify patterns that could be improved
        const opportunities = [];

        if (response.text.length < 20) {
            opportunities.push('Response too brief');
        }

        if (input.toLowerCase().includes('code') && !response.text.includes('```')) {
            opportunities.push('Code request without code example');
        }

        return opportunities;
    }

    updatePerformanceMetrics(analysis) {
        this.performanceMetrics.responseQuality.push(analysis.responseQuality);
        
        // Keep only last 100 entries
        if (this.performanceMetrics.responseQuality.length > 100) {
            this.performanceMetrics.responseQuality.shift();
        }
    }

    getStatus() {
        const avgQuality = this.performanceMetrics.responseQuality.length > 0
            ? this.performanceMetrics.responseQuality.reduce((a, b) => a + b, 0) /
              this.performanceMetrics.responseQuality.length
            : 0;

        return {
            enabled: this.enabled,
            averageResponseQuality: avgQuality.toFixed(2),
            totalInteractions: this.improvementHistory.length,
        };
    }
}