import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIAssistant } from '../../src/core/AIAssistant.js';

// Minimal mock LLM client
function makeMockLLM({ response = 'mock response', fail = false } = {}) {
    return {
        chat: fail
            ? vi.fn().mockRejectedValue(new Error('LLM unreachable'))
            : vi.fn().mockResolvedValue(response),
        isConnected: true,
    };
}

describe('AIAssistant', () => {
    let llm;
    let assistant;

    beforeEach(() => {
        llm = makeMockLLM();
        assistant = new AIAssistant(llm, null);
    });

    // ── processCommand ───────────────────────────────────────────

    describe('processCommand', () => {
        it('returns the LLM response text', async () => {
            const result = await assistant.processCommand('hello');
            expect(result.text).toBe('mock response');
        });

        it('sets voice:true on a successful response', async () => {
            const result = await assistant.processCommand('hello');
            expect(result.voice).toBe(true);
        });

        it('appends user and assistant messages to history', async () => {
            await assistant.processCommand('first message');
            expect(assistant.conversationHistory).toHaveLength(2);
            expect(assistant.conversationHistory[0].role).toBe('user');
            expect(assistant.conversationHistory[1].role).toBe('assistant');
        });

        it('injects momMood into the system prompt when provided', async () => {
            await assistant.processCommand('hello', { momMood: 'curious' });
            const callArgs = llm.chat.mock.calls[0][0];
            expect(callArgs[0].content).toContain('curious');
        });

        it('returns a fallback message and voice:false when LLM throws', async () => {
            assistant = new AIAssistant(makeMockLLM({ fail: true }), null);
            const result = await assistant.processCommand('hello');
            expect(result.voice).toBe(false);
            expect(result.text).toContain('trouble generating');
        });

        it('trims conversation history to maxHistory entries', async () => {
            assistant.maxHistory = 4;
            for (let i = 0; i < 6; i++) {
                await assistant.processCommand(`message ${i}`);
            }
            expect(assistant.conversationHistory.length).toBeLessThanOrEqual(4);
        });
    });

    // ── clearHistory ─────────────────────────────────────────────

    describe('clearHistory', () => {
        it('empties the conversation history', async () => {
            await assistant.processCommand('remember this');
            assistant.clearHistory();
            expect(assistant.conversationHistory).toHaveLength(0);
        });
    });

    // ── fallback to generate() ────────────────────────────────────

    describe('fallback to generate()', () => {
        it('uses generate() when the client has no chat() method', async () => {
            const generateLLM = {
                generate: vi.fn().mockResolvedValue('generated text'),
            };
            const a = new AIAssistant(generateLLM, null);
            const result = await a.processCommand('hi');
            expect(generateLLM.generate).toHaveBeenCalled();
            expect(result.text).toBe('generated text');
        });
    });

    // ── SelfImprovement integration ───────────────────────────────

    describe('selfImprovement integration', () => {
        it('calls recordInteraction when self-improvement is enabled', async () => {
            const si = { isEnabled: () => true, recordInteraction: vi.fn() };
            assistant = new AIAssistant(llm, si);
            await assistant.processCommand('test input');
            expect(si.recordInteraction).toHaveBeenCalledWith('test input', 'mock response');
        });

        it('does not call recordInteraction when self-improvement is disabled', async () => {
            const si = { isEnabled: () => false, recordInteraction: vi.fn() };
            assistant = new AIAssistant(llm, si);
            await assistant.processCommand('test input');
            expect(si.recordInteraction).not.toHaveBeenCalled();
        });
    });
});
