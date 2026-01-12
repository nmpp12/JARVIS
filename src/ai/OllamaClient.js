/**
 * Ollama Client
 * Handles communication with Ollama API through proxy server
 */

export class OllamaClient {
    constructor() {
        this.baseUrl = '/api';
        this.currentModel = 'llama2';
        this.availableModels = [];
        this.conversationHistory = [];
    }

    /**
     * Initialize client and fetch available models
     */
    async initialize() {
        try {
            await this.fetchModels();
            console.log('✅ OllamaClient initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize OllamaClient:', error);
            return false;
        }
    }

    /**
     * Fetch available models from Ollama
     */
    async fetchModels() {
        try {
            const response = await fetch(`${this.baseUrl}/tags`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.availableModels = data.models || [];
            
            // Set first available model as current if not set
            if (this.availableModels.length > 0 && !this.currentModel) {
                this.currentModel = this.availableModels[0].name;
            }
            
            return this.availableModels;
        } catch (error) {
            console.error('Failed to fetch models:', error);
            throw error;
        }
    }

    /**
     * Generate text completion
     */
    async generate(prompt, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: options.model || this.currentModel,
                    prompt: prompt,
                    stream: options.stream || false,
                    options: {
                        temperature: options.temperature || 0.7,
                        top_p: options.top_p || 0.9,
                        top_k: options.top_k || 40
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (options.stream) {
                return this.handleStreamResponse(response);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Generate error:', error);
            throw error;
        }
    }

    /**
     * Chat with conversation context
     */
    async chat(message, options = {}) {
        try {
            // Add user message to history
            this.conversationHistory.push({
                role: 'user',
                content: message
            });

            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: options.model || this.currentModel,
                    messages: this.conversationHistory,
                    stream: options.stream || false,
                    options: {
                        temperature: options.temperature || 0.7,
                        top_p: options.top_p || 0.9
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (options.stream) {
                return this.handleStreamResponse(response, (content) => {
                    // Add assistant response to history when streaming completes
                    this.conversationHistory.push({
                        role: 'assistant',
                        content: content
                    });
                });
            }

            const data = await response.json();
            const assistantMessage = data.message.content;
            
            // Add assistant response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: assistantMessage
            });

            return assistantMessage;
        } catch (error) {
            console.error('Chat error:', error);
            throw error;
        }
    }

    /**
     * Handle streaming response
     */
    async handleStreamResponse(response, onComplete) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        return {
            async *[Symbol.asyncIterator]() {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            if (onComplete) onComplete(fullResponse);
                            break;
                        }

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n').filter(line => line.trim());

                        for (const line of lines) {
                            try {
                                const data = JSON.parse(line);
                                const content = data.response || data.message?.content || '';
                                fullResponse += content;
                                yield content;
                            } catch (e) {
                                console.warn('Failed to parse chunk:', e);
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            }
        };
    }

    /**
     * Set current model
     */
    setModel(modelName) {
        const model = this.availableModels.find(m => m.name === modelName);
        if (model) {
            this.currentModel = modelName;
            return true;
        }
        return false;
    }

    /**
     * Get current model
     */
    getCurrentModel() {
        return this.currentModel;
    }

    /**
     * Get available models
     */
    getAvailableModels() {
        return this.availableModels;
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * Get conversation history
     */
    getHistory() {
        return this.conversationHistory;
    }

    /**
     * Check if Ollama is available
     */
    async checkHealth() {
        try {
            const response = await fetch('/health');
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

export default OllamaClient;