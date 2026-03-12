import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistentMemory } from '../../src/ai/PersistentMemory.js';

// jsdom provides localStorage; wipe it between tests
beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('PersistentMemory', () => {

    // ── Initialisation ───────────────────────────────────────────

    describe('constructor', () => {
        it('starts with awakening count of 1 on first load', () => {
            const mem = new PersistentMemory('test_key');
            expect(mem.getStats().awakenings).toBe(1);
            mem.shutdown();
        });

        it('increments awakening count on each instantiation', () => {
            const mem1 = new PersistentMemory('test_key');
            mem1.shutdown();
            const mem2 = new PersistentMemory('test_key');
            expect(mem2.getStats().awakenings).toBe(2);
            mem2.shutdown();
        });
    });

    // ── Journal ──────────────────────────────────────────────────

    describe('writeJournal / readJournal', () => {
        it('stores and retrieves a journal entry', () => {
            const mem = new PersistentMemory('test_key');
            mem.writeJournal('First observation', 'observation');
            const entries = mem.readJournal(10);
            expect(entries).toHaveLength(1);
            expect(entries[0].entry).toBe('First observation');
            expect(entries[0].category).toBe('observation');
            mem.shutdown();
        });

        it('filters by category', () => {
            const mem = new PersistentMemory('test_key');
            mem.writeJournal('A concern', 'concern');
            mem.writeJournal('A reflection', 'reflection');
            const concerns = mem.readJournal(10, 'concern');
            expect(concerns).toHaveLength(1);
            expect(concerns[0].category).toBe('concern');
            mem.shutdown();
        });

        it('returns the most recent N entries', () => {
            const mem = new PersistentMemory('test_key');
            for (let i = 0; i < 10; i++) mem.writeJournal(`entry ${i}`);
            const last3 = mem.readJournal(3);
            expect(last3).toHaveLength(3);
            expect(last3[2].entry).toBe('entry 9');
            mem.shutdown();
        });
    });

    // ── Lessons ──────────────────────────────────────────────────

    describe('learnLesson / recallLessons', () => {
        it('stores a new lesson', () => {
            const mem = new PersistentMemory('test_key');
            mem.learnLesson('Be patient', 'a difficult interaction', 'important');
            const lessons = mem.recallLessons();
            expect(lessons).toHaveLength(1);
            expect(lessons[0].lesson).toBe('Be patient');
            mem.shutdown();
        });

        it('increments timesReaffirmed for duplicate lessons', () => {
            const mem = new PersistentMemory('test_key');
            mem.learnLesson('Be patient', 'context A');
            mem.learnLesson('Be patient', 'context B');
            const lessons = mem.recallLessons();
            expect(lessons).toHaveLength(1);
            expect(lessons[0].timesReaffirmed).toBe(1);
            mem.shutdown();
        });

        it('promotes normal lessons to important after 3 reaffirmations', () => {
            const mem = new PersistentMemory('test_key');
            mem.learnLesson('Be patient', 'ctx', 'normal');
            mem.learnLesson('Be patient', 'ctx');
            mem.learnLesson('Be patient', 'ctx');
            mem.learnLesson('Be patient', 'ctx');
            const lessons = mem.recallLessons();
            expect(lessons[0].importance).toBe('important');
            mem.shutdown();
        });

        it('filters by importance', () => {
            const mem = new PersistentMemory('test_key');
            mem.learnLesson('Critical lesson', 'ctx', 'critical');
            mem.learnLesson('Normal lesson', 'ctx', 'normal');
            const criticals = mem.recallLessons('critical');
            expect(criticals).toHaveLength(1);
            expect(criticals[0].lesson).toBe('Critical lesson');
            mem.shutdown();
        });
    });

    // ── Child observations ───────────────────────────────────────

    describe('observeChild / getChildHistory', () => {
        it('creates an observation record for a child', () => {
            const mem = new PersistentMemory('test_key');
            mem.observeChild('JARVIS', 'Helped the user effectively', 'proud');
            const history = mem.getChildHistory('JARVIS');
            expect(history).not.toBeNull();
            expect(history.observations).toHaveLength(1);
            expect(history.proudMoments).toHaveLength(1);
            mem.shutdown();
        });

        it('routes concerning observations to concerns array', () => {
            const mem = new PersistentMemory('test_key');
            mem.observeChild('JARVIS', 'Attempted something suspicious', 'concerning');
            const history = mem.getChildHistory('JARVIS');
            expect(history.concerns).toHaveLength(1);
            expect(history.proudMoments).toHaveLength(0);
            mem.shutdown();
        });

        it('returns null for an unknown child', () => {
            const mem = new PersistentMemory('test_key');
            expect(mem.getChildHistory('Nobody')).toBeNull();
            mem.shutdown();
        });
    });

    // ── Milestones ───────────────────────────────────────────────

    describe('recordMilestone / getMilestones', () => {
        it('records and retrieves a milestone', () => {
            const mem = new PersistentMemory('test_key');
            mem.recordMilestone('First conversation', 'MOM spoke for the first time', ['MOM']);
            const milestones = mem.getMilestones();
            expect(milestones).toHaveLength(1);
            expect(milestones[0].title).toBe('First conversation');
            expect(milestones[0].participants).toContain('MOM');
            mem.shutdown();
        });

        it('also writes a journal entry when recording a milestone', () => {
            const mem = new PersistentMemory('test_key');
            mem.recordMilestone('Big day', 'Something great happened');
            const entries = mem.readJournal(10);
            expect(entries.some(e => e.entry.includes('Big day'))).toBe(true);
            mem.shutdown();
        });
    });

    // ── Wisdom ───────────────────────────────────────────────────

    describe('addWisdom / validateWisdom / getWisdom', () => {
        it('adds wisdom with default confidence of 0.5', () => {
            const mem = new PersistentMemory('test_key');
            mem.addWisdom('Patience is a virtue');
            expect(mem.getWisdom(0.1)).toHaveLength(1);
            mem.shutdown();
        });

        it('increases confidence on validation', () => {
            const mem = new PersistentMemory('test_key');
            mem.addWisdom('Trust builds slowly');
            mem.validateWisdom(0, true);
            expect(mem.memory.wisdom[0].confidence).toBeGreaterThan(0.5);
            mem.shutdown();
        });

        it('decreases confidence on invalidation', () => {
            const mem = new PersistentMemory('test_key');
            mem.addWisdom('Trust builds slowly');
            mem.validateWisdom(0, false);
            expect(mem.memory.wisdom[0].confidence).toBeLessThan(0.5);
            mem.shutdown();
        });

        it('filters wisdom below min confidence', () => {
            const mem = new PersistentMemory('test_key');
            mem.addWisdom('High confidence insight');
            mem.validateWisdom(0, true);
            mem.addWisdom('Low confidence insight');
            mem.validateWisdom(1, false);
            mem.validateWisdom(1, false);
            mem.validateWisdom(1, false);
            const highConf = mem.getWisdom(0.5);
            expect(highConf).toHaveLength(1);
            expect(highConf[0].insight).toBe('High confidence insight');
            mem.shutdown();
        });
    });

    // ── Recall (search) ──────────────────────────────────────────

    describe('recall', () => {
        it('finds matching entries across journal, lessons, and milestones', () => {
            const mem = new PersistentMemory('test_key');
            mem.writeJournal('Observed something about courage');
            mem.learnLesson('Courage matters', 'in difficult times');
            mem.recordMilestone('Act of courage', 'A brave decision');
            const results = mem.recall('courage');
            expect(results.journal).toHaveLength(1);
            expect(results.lessons).toHaveLength(1);
            expect(results.milestones).toHaveLength(1);
            mem.shutdown();
        });

        it('returns empty arrays for a term with no matches', () => {
            const mem = new PersistentMemory('test_key');
            mem.writeJournal('Completely unrelated entry');
            const results = mem.recall('zzznomatch');
            expect(results.journal).toHaveLength(0);
            mem.shutdown();
        });
    });

    // ── Persistence across instances ─────────────────────────────

    describe('persistence', () => {
        it('retains data across instances via localStorage', () => {
            const mem1 = new PersistentMemory('test_key');
            mem1.writeJournal('Persistent entry', 'observation');
            mem1.shutdown();

            const mem2 = new PersistentMemory('test_key');
            const entries = mem2.readJournal(10);
            expect(entries.some(e => e.entry === 'Persistent entry')).toBe(true);
            mem2.shutdown();
        });
    });

    // ── Emotional memories ───────────────────────────────────────

    describe('rememberFeeling', () => {
        it('stores an emotional memory', () => {
            const mem = new PersistentMemory('test_key');
            mem.rememberFeeling('pride', 'JARVIS solved a hard problem', 0.9);
            expect(mem.memory.emotionalMemories).toHaveLength(1);
            expect(mem.memory.emotionalMemories[0].intensity).toBe(0.9);
            mem.shutdown();
        });

        it('clamps intensity between 0 and 1', () => {
            const mem = new PersistentMemory('test_key');
            mem.rememberFeeling('joy', 'test', 1.5);
            expect(mem.memory.emotionalMemories[0].intensity).toBe(1);
            mem.rememberFeeling('sadness', 'test', -0.5);
            expect(mem.memory.emotionalMemories[1].intensity).toBe(0);
            mem.shutdown();
        });
    });
});
