/**
 * Code UI Component
 */

export class CodeUI {
    constructor(jarvis) {
        this.jarvis = jarvis;
        this.editor = null;
        this.output = null;
        this.language = 'javascript';
    }

    async initialize() {
        console.log('💻 Initializing Code UI...');
        
        this.editor = document.getElementById('codeEditor');
        this.output = document.getElementById('codeOutput');
        
        this.setupEventListeners();
        
        console.log('✅ Code UI initialized');
    }

    setupEventListeners() {
        document.getElementById('codeLanguage')?.addEventListener('change', (e) => {
            this.language = e.target.value;
        });

        document.getElementById('btnAnalyzeCode')?.addEventListener('click', () => {
            this.analyzeCode();
        });

        document.getElementById('btnOptimizeCode')?.addEventListener('click', () => {
            this.optimizeCode();
        });

        document.getElementById('btnExplainCode')?.addEventListener('click', () => {
            this.explainCode();
        });
    }

    async analyzeCode() {
        const code = this.editor?.value;
        if (!code) {
            this.showOutput('Please enter some code first.');
            return;
        }

        this.showOutput('Analyzing code...');

        try {
            const response = await this.jarvis.processQuery(
                `Analyze this ${this.language} code and provide insights:\n\n${code}`
            );
            this.showOutput(response);
        } catch (error) {
            this.showOutput('Error analyzing code: ' + error.message);
        }
    }

    async optimizeCode() {
        const code = this.editor?.value;
        if (!code) {
            this.showOutput('Please enter some code first.');
            return;
        }

        this.showOutput('Optimizing code...');

        try {
            const response = await this.jarvis.processQuery(
                `Optimize this ${this.language} code for better performance and readability:\n\n${code}`
            );
            this.showOutput(response);
        } catch (error) {
            this.showOutput('Error optimizing code: ' + error.message);
        }
    }

    async explainCode() {
        const code = this.editor?.value;
        if (!code) {
            this.showOutput('Please enter some code first.');
            return;
        }

        this.showOutput('Explaining code...');

        try {
            const response = await this.jarvis.processQuery(
                `Explain this ${this.language} code in detail:\n\n${code}`
            );
            this.showOutput(response);
        } catch (error) {
            this.showOutput('Error explaining code: ' + error.message);
        }
    }

    showOutput(text) {
        if (this.output) {
            this.output.innerHTML = `<pre style="white-space: pre-wrap; color: var(--text-primary);">${text}</pre>`;
        }
    }

    refresh() {
        // Nothing to refresh
    }
}

export default CodeUI;