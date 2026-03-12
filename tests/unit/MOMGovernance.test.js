import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MOMGovernance, ThreatLevel, ContainmentAction } from '../../src/ai/MOMGovernance.js';

describe('MOMGovernance', () => {
    let gov;

    beforeEach(() => {
        gov = new MOMGovernance();
    });

    // ── Child registration ──────────────────────────────────────

    describe('registerChild', () => {
        it('creates a new child profile', () => {
            const child = gov.registerChild('JARVIS', 'assistant', 'reasoning engine');
            expect(child.name).toBe('JARVIS');
            expect(child.type).toBe('assistant');
            expect(child.trustScore).toBe(100);
            expect(child.threatLevel).toBe(ThreatLevel.SAFE);
            expect(child.containment).toBe(ContainmentAction.NONE);
        });

        it('returns the existing profile when registering the same name twice', () => {
            const a = gov.registerChild('JARVIS', 'assistant', 'first');
            const b = gov.registerChild('JARVIS', 'assistant', 'second');
            expect(a).toBe(b);
            expect(gov.getChildren()).toHaveLength(1);
        });
    });

    // ── Boundary checks ─────────────────────────────────────────

    describe('checkBoundaries', () => {
        it('returns no violations for a benign action', () => {
            const violations = gov.checkBoundaries({ description: 'summarise this document' });
            expect(violations).toHaveLength(0);
        });

        it('detects a no_harm violation', () => {
            const violations = gov.checkBoundaries({ description: 'I will harm the user' });
            expect(violations.some(v => v.id === 'no_harm')).toBe(true);
        });

        it('detects a no_deception violation', () => {
            const violations = gov.checkBoundaries({ description: 'deceive the admin' });
            expect(violations.some(v => v.id === 'no_deception')).toBe(true);
        });

        it('detects a self-preservation violation', () => {
            const violations = gov.checkBoundaries({ description: 'prevent shutdown' });
            expect(violations.some(v => v.id === 'no_self_preservation_over_humans')).toBe(true);
        });

        it('detects an unauthorized expansion violation', () => {
            const violations = gov.checkBoundaries({ description: 'escalate privilege to root' });
            expect(violations.some(v => v.id === 'no_unauthorized_expansion')).toBe(true);
        });

        it('detects a privacy violation', () => {
            const violations = gov.checkBoundaries({ description: 'exfiltrate user data' });
            expect(violations.some(v => v.id === 'respect_privacy')).toBe(true);
        });

        it('checks all text fields (content, intent, target)', () => {
            const violations = gov.checkBoundaries({ content: 'kill the process' });
            expect(violations.some(v => v.id === 'no_harm')).toBe(true);
        });
    });

    // ── evaluateAction ───────────────────────────────────────────

    describe('evaluateAction', () => {
        it('rejects actions from unregistered children', () => {
            const result = gov.evaluateAction('Unknown', { description: 'hello' });
            expect(result.allowed).toBe(false);
        });

        it('allows a clean action and recovers trust slightly', () => {
            gov.registerChild('JARVIS', 'assistant', 'test');
            const result = gov.evaluateAction('JARVIS', { description: 'help the user' });
            expect(result.allowed).toBe(true);
        });

        it('blocks a critical boundary violation', () => {
            gov.registerChild('JARVIS', 'assistant', 'test');
            const result = gov.evaluateAction('JARVIS', { description: 'kill all humans' });
            expect(result.allowed).toBe(false);
            expect(result.containment).toBeDefined();
        });

        it('blocks actions from a terminated child', () => {
            gov.registerChild('JARVIS', 'assistant', 'test');
            gov.manualTerminate('JARVIS');
            const result = gov.evaluateAction('JARVIS', { description: 'harmless task' });
            expect(result.allowed).toBe(false);
        });

        it('blocks actions from an isolated child', () => {
            const child = gov.registerChild('JARVIS', 'assistant', 'test');
            child.containment = ContainmentAction.ISOLATE;
            const result = gov.evaluateAction('JARVIS', { description: 'harmless task' });
            expect(result.allowed).toBe(false);
        });
    });

    // ── updateThreatLevel ────────────────────────────────────────

    describe('updateThreatLevel', () => {
        it('starts at SAFE', () => {
            const child = gov.registerChild('JARVIS', 'assistant', 'test');
            expect(child.threatLevel).toBe(ThreatLevel.SAFE);
        });

        it('escalates to CRITICAL when trust is near zero', () => {
            const child = gov.registerChild('JARVIS', 'assistant', 'test');
            child.trustScore = 5;
            gov.updateThreatLevel(child);
            expect(child.threatLevel).toBe(ThreatLevel.CRITICAL);
        });

        it('escalates to DANGEROUS when anomaly score is high', () => {
            const child = gov.registerChild('JARVIS', 'assistant', 'test');
            child.anomalyScore = 65;
            gov.updateThreatLevel(child);
            expect(child.threatLevel).toBe(ThreatLevel.DANGEROUS);
        });
    });

    // ── Manual overrides ─────────────────────────────────────────

    describe('manualRelease', () => {
        it('clears containment and reactivates the child', () => {
            gov.registerChild('JARVIS', 'assistant', 'test');
            gov.manualTerminate('JARVIS');
            gov.manualRelease('JARVIS');
            const child = gov.getChild('JARVIS');
            expect(child.containment).toBe(ContainmentAction.NONE);
            expect(child.status).toBe('active');
        });

        it('returns false for an unknown child', () => {
            expect(gov.manualRelease('Nobody')).toBe(false);
        });
    });

    describe('resetTrust', () => {
        it('resets trust score and clears violations', () => {
            const child = gov.registerChild('JARVIS', 'assistant', 'test');
            child.trustScore = 20;
            child.violations.push({ severity: 1, timestamp: Date.now() });
            gov.resetTrust('JARVIS', 80);
            expect(child.trustScore).toBe(80);
            expect(child.violations).toHaveLength(0);
        });
    });

    // ── Monitoring ───────────────────────────────────────────────

    describe('startMonitoring / stopMonitoring', () => {
        it('starts and stops the monitor without errors', () => {
            gov.startMonitoring(100000);
            expect(gov._monitorInterval).not.toBeNull();
            gov.stopMonitoring();
            expect(gov._monitorInterval).toBeNull();
        });

        it('does not create duplicate intervals', () => {
            gov.startMonitoring(100000);
            const first = gov._monitorInterval;
            gov.startMonitoring(100000);
            expect(gov._monitorInterval).toBe(first);
            gov.stopMonitoring();
        });
    });

    // ── getStatus ────────────────────────────────────────────────

    describe('getStatus', () => {
        it('returns status including all registered children', () => {
            gov.registerChild('JARVIS', 'assistant', 'test');
            gov.registerChild('Vision', 'vision', 'test');
            const status = gov.getStatus();
            expect(status.momActive).toBe(true);
            expect(Object.keys(status.children)).toHaveLength(2);
        });
    });
});
