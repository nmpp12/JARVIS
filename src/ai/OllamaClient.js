export class OllamaClient {
    constructor(baseUrl = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
        this.currentModel = null;
        this.availableModels = [];
    }

    async getAvailableModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            const data = await response.json();
            this.availableModels = data.models || [];
            return this.availableModels.map(model => model.name);
        } catch (error) {
            console.error('Failed to fetch models:', error);
            throw new Error('Could not connect to Ollama. Please ensure Ollama is running.');
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
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Generation failed:', error);
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }

    async streamGenerate(prompt, onChunk, options = {}) {
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