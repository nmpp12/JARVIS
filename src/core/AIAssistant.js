export class AIAssistant {
    constructor(ollamaClient, selfImprovement) {
        this.ollama = ollamaClient;
        this.selfImprovement = selfImprovement;
        this.conversationHistory = [];
        this.capabilities = [
            'general_conversation',
            'code_analysis',
            'code_generation',
            'self_improvement',
            'system_commands',
            'file_operations'
        ];
    }

    async processCommand(input, context = {}) {
        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: input,
            timestamp: context.timestamp || new Date().toISOString()
        });

        // Analyze command intent
        const intent = await this.analyzeIntent(input);
        
        let response;
        
        switch (intent.type) {
            case 'self_improvement':
                response = await this.handleSelfImprovement(input, intent);
                break;
            case 'code_analysis':
                response = await this.handleCodeAnalysis(input, intent);
                break;
            case 'system_command':
                response = await this.handleSystemCommand(input, intent);
                break;
            default:
                response = await this.handleGeneralQuery(input, intent);
        }

        // Add response to history
        this.conversationHistory.push({
            role: 'assistant',
            content: response.text,
            timestamp: new Date().toISOString()
        });

        // Trigger self-improvement if enabled
        if (this.selfImprovement.isEnabled()) {
            await this.selfImprovement.analyzeInteraction(input, response);
        }

        return response;
    }

    async analyzeIntent(input) {
        const prompt = `Analyze the following user input and determine the intent. Respond with a JSON object containing:
        - type: one of [general, self_improvement, code_analysis, system_command, file_operation]
        - confidence: 0-1
        - parameters: relevant extracted parameters
        
        User input: "${input}"`;

        try {
            const result = await this.ollama.generate(prompt);
            return JSON.parse(result);
        } catch (error) {
            return { type: 'general', confidence: 0.5, parameters: {} };
        }
    }

    async handleSelfImprovement(input, intent) {
        if (input.toLowerCase().includes('improve yourself') || 
            input.toLowerCase().includes('analyze your code')) {
            
            const improvements = await this.selfImprovement.analyzeCurrentCode();
            
            return {
                text: `I've analyzed my code and found ${improvements.length} potential improvements. Would you like me to implement them?`,
                codeImprovement: improvements,
                speak: true
            };
        }

        if (input.toLowerCase().includes('implement improvements')) {
            const result = await this.selfImprovement.implementImprovements();
            
            return {
                text: `I've implemented ${result.implemented} improvements. ${result.summary}`,
                speak: true
            };
        }

        return await this.handleGeneralQuery(input, intent);
    }

    async handleCodeAnalysis(input, intent) {
        const prompt = `As an advanced AI assistant, analyze this code-related request and provide a comprehensive response:

        User request: "${input}"
        
        Provide detailed analysis, suggestions, and if applicable, code examples.`;

        const result = await this.ollama.generate(prompt);
        
        return {
            text: result,
            speak: false
        };
    }

    async handleSystemCommand(input, intent) {
        // Handle system-level commands
        if (input.toLowerCase().includes('status')) {
            const status = await this.getSystemStatus();
            return {
                text: `System Status:\n${status}`,
                speak: true
            };
        }

        return await this.handleGeneralQuery(input, intent);
    }

    async handleGeneralQuery(input, intent) {
        const context = this.conversationHistory.slice(-5); // Last 5 messages for context
        
        const prompt = `You are JARVIS, an advanced AI assistant. Respond to the user's query in a helpful and intelligent manner.

        Conversation context:
        ${context.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
        
        Current query: "${input}"
        
        Provide a comprehensive and helpful response.`;

        const result = await this.ollama.generate(prompt);
        
        return {
            text: result,
            speak: intent.confidence > 0.7
        };
    }

    async getSystemStatus() {
        const modelInfo = await this.ollama.getCurrentModel();
        const improvementStatus = this.selfImprovement.getStatus();
        
        return `Model: ${modelInfo.name}
Self-Improvement: ${improvementStatus.enabled ? 'Enabled' : 'Disabled'}
Conversation History: ${this.conversationHistory.length} messages
Capabilities: ${this.capabilities.join(', ')}`;
    }
}