/**
 * JARVIS-LLM Client
 *
 * Connects the JARVIS frontend to the custom-trained LLM inference server.
 * Provides the same interface as OllamaClient for seamless switching.
 * The JARVIS-LLM server exposes an OpenAI-compatible API.
 */

export class JARVISLLMClient {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
        this.isConnected = false;
        this.modelInfo = null;
    }

    async getAvailableModels() {
        try {
            const response = await fetch(`${this.baseUrl}/v1/models`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                this.isConnected = false;
                return { error: `HTTP ${response.status}`, models: [] };
            }

            const data = await response.json();
            this.isConnected = true;
            this.modelInfo = data.data?.[0] || null;
            return data.data.map(m => m.id);
        } catch (error) {
            this.isConnected = false;
            return { error: `JARVIS-LLM connection failed: ${error.message}`, models: [] };
        }
    }

    setModel(_modelName) {
        // JARVIS-LLM serves a single model
    }

    async getCurrentModel() {
        return { name: 'jarvis-llm', info: this.modelInfo };
    }

    async generate(prompt, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to JARVIS-LLM server');
        }

        const response = await fetch(`${this.baseUrl}/v1/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                max_tokens: options.max_tokens || 256,
                temperature: options.temperature || 0.7,
                top_p: options.top_p || 0.9,
                top_k: options.top_k || 50,
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].text;
    }

    async chat(messages, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to JARVIS-LLM server');
        }

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                max_tokens: options.max_tokens || 256,
                temperature: options.temperature || 0.7,
                top_p: options.top_p || 0.9,
                stream: false,
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async streamGenerate(prompt, onChunk, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to JARVIS-LLM server');
        }

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                max_tokens: options.max_tokens || 256,
                temperature: options.temperature || 0.7,
                top_p: options.top_p || 0.9,
                stream: true,
            }),
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
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') return;

                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        onChunk(content);
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }
    }

    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                signal: AbortSignal.timeout(3000),
            });
            const data = await response.json();
            this.isConnected = data.status === 'healthy';
            return this.isConnected;
        } catch {
            this.isConnected = false;
            return false;
        }
    }
}
