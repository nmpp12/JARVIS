import { describe, it, expect, beforeEach } from 'vitest';
import { SelfImprovement } from '../../src/ai/SelfImprovement.js';

describe('SelfImprovement', () => {
    let si;

    beforeEach(() => {
        si = new SelfImprovement();
    });

    // ── enabled state ────────────────────────────────────────────

    describe('setEnabled / isEnabled', () => {
        it('is disabled by default', () => {
            expect(si.isEnabled()).toBe(false);
        });

        it('can be enabled', () => {
            si.setEnabled(true);
            expect(si.isEnabled()).toBe(true);
        });
    });

    // ── recordInteraction ────────────────────────────────────────

    describe('recordInteraction', () => {
        it('records interaction data', () => {
            si.recordInteraction('what is 2+2?', '4');
            expect(si.improvementHistory).toHaveLength(1);
        });

        it('classifies the input type', () => {
            si.recordInteraction('what is AI?', 'A field of computer science');
            const record = si.improvementHistory[0];
            expect(record.inputType).toBeDefined();
        });

        it('keeps only the last 100 entries', () => {
            for (let i = 0; i < 110; i++) si.recordInteraction(`q${i}`, `a${i}`);
            expect(si.improvementHistory.length).toBeLessThanOrEqual(100);
        });
    });

    // ── classifyInput ────────────────────────────────────────────

    describe('classifyInput', () => {
        it('classifies questions', () => {
            expect(si.classifyInput('What is AI?')).toBe('question');
        });

        it('classifies commands', () => {
            expect(si.classifyInput('create a new function')).toBe('command');
        });

        it('classifies requests', () => {
            expect(si.classifyInput('please explain this')).toBe('request');
        });

        it('classifies code-related input', () => {
            expect(si.classifyInput('const x = 1')).toBe('code');
        });

        it('falls back to general for unmatched input', () => {
            expect(si.classifyInput('hello there')).toBe('general');
        });
    });

    // ── getStatus ────────────────────────────────────────────────

    describe('getStatus', () => {
        it('returns expected status fields', () => {
            const status = si.getStatus();
            expect(status).toHaveProperty('enabled');
            expect(status).toHaveProperty('totalInteractions');
            expect(status).toHaveProperty('averageResponseQuality');
        });

        it('reflects the correct enabled state', () => {
            si.setEnabled(true);
            expect(si.getStatus().enabled).toBe(true);
        });

        it('counts totalInteractions correctly', () => {
            si.recordInteraction('q1', 'a1');
            si.recordInteraction('q2', 'a2');
            expect(si.getStatus().totalInteractions).toBe(2);
        });
    });

    // ── implementImprovements ────────────────────────────────────

    describe('implementImprovements', () => {
        it('returns early when disabled', async () => {
            const result = await si.implementImprovements();
            expect(result.summary).toContain('disabled');
        });
    });
});
