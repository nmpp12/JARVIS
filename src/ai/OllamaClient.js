export class OllamaClient {
    constructor(baseUrl = 'http://localhost:3001/ollama') {
        this.baseUrl = baseUrl;
        this.currentModel = null;
        this.availableModels = [];
        this.isConnected = false;
    }

    async getAvailableModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Add timeout to prevent hanging
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.availableModels = data.models || [];
            this.isConnected = true;
            return this.availableModels.map(model => model.name);
        } catch (error) {
            this.isConnected = false;
            console.error('Failed to fetch models:', error);
            
            // Provide more specific error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Cannot connect to Ollama service. Please ensure Ollama is running on http://localhost:11434');
            } else if (error.name === 'TimeoutError') {
                throw new Error('Connection to Ollama timed out. Please check if Ollama is running and accessible.');
            } else {
                throw new Error(`Ollama connection failed: ${error.message}`);
            }
        }
    }

    setModel(modelName) {
        this.currentModel = modelName;
    }

    async getCurrentModel() {
        return {
            name: this.currentModel,
            info: this.availableModels.find(m => m.name === this.currentModel)
        };
    }

    async generate(prompt, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to Ollama service');
        }
        
        if (!this.currentModel) {
            throw new Error('No model selected');
        }

        const requestBody = {
            model: this.currentModel,
            prompt: prompt,
            stream: false,
            options: {
                temperature: options.temperature || 0.7,
                top_p: options.top_p || 0.9,
                ...options
            }
        };

        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(30000) // 30 second timeout for generation
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Generation failed:', error);
            if (error.name === 'TimeoutError') {
                throw new Error('Request timed out. The model may be taking too long to respond.');
            }
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }

    async streamGenerate(prompt, onChunk, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to Ollama service');
        }
        
        if (!this.currentModel) {
            throw new Error('No model selected');
        }

        const requestBody = {
            model: this.currentModel,
            prompt: prompt,
            stream: true,
            options: {
                temperature: options.temperature || 0.7,
                top_p: options.top_p || 0.9,
                ...options
            }
        };

        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            onChunk(data.response);
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                    }
                }
            }
        } catch (error) {
            console.error('Streaming failed:', error);
            throw new Error(`Failed to stream response: ${error.message}`);
        }
    }
}