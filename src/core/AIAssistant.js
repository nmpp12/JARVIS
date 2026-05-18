/**
 * AIAssistant - Core intelligence layer for JARVIS
 *
 * Uses MOM (custom LLM) as the primary backend.
 * Ollama is kept as an optional fallback but is never required.
 */
export class AIAssistant {
    constructor(llmClient, selfImprovement) {
        this.llm = llmClient;          // primary LLM client (MOM or Ollama)
        this.selfImprovement = selfImprovement;
        this.conversationHistory = [];
        this.maxHistory = 20;
        this.systemPrompt = `You are JARVIS, an advanced AI assistant. You are helpful, intelligent, and resourceful. Provide concise, accurate, and helpful responses.`;
    }

    async processCommand(text, context = {}) {
        this.conversationHistory.push({ role: 'user', content: text });

        // Reserve one slot for the upcoming assistant response so that
        // after we append it the stored history still satisfies maxHistory.
        const inputCap = Math.max(1, this.maxHistory - 1);
        if (this.conversationHistory.length > inputCap) {
            this.conversationHistory = this.conversationHistory.slice(-inputCap);
        }

        const messages = [
            { role: 'system', content: this.systemPrompt },
            ...this.conversationHistory,
        ];

        // Inject MOM's mood into the system context when available
        if (context.momMood) {
            messages[0].content += `\nCurrent emotional context: ${context.momMood}`;
        }

        try {
            let responseText;

            if (this.llm.chat) {
                responseText = await this.llm.chat(messages, {
                    temperature: 0.7,
                    max_tokens: 512,
                });
            } else {
                // Fallback to plain generate for clients without chat()
                const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
                responseText = await this.llm.generate(prompt, {
                    temperature: 0.7,
                    max_tokens: 512,
                });
            }

            this.conversationHistory.push({ role: 'assistant', content: responseText });

            // Final trim — guarantees the stored history never exceeds maxHistory
            if (this.conversationHistory.length > this.maxHistory) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
            }

            if (this.selfImprovement?.isEnabled?.()) {
                this.selfImprovement.recordInteraction(text, responseText);
            }

            return { text: responseText, voice: true };
        } catch (error) {
            console.error('[AIAssistant] Generation failed:', error);
            return {
                text: `I'm having trouble generating a response right now. (${error.message})`,
                voice: false,
            };
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }
}

export default AIAssistant;
