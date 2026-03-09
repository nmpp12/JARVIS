/**
 * PersistentMemory — MOM's Journal
 *
 * MOM remembers everything. Not just data — lessons, growth,
 * observations about her children, milestones, and the quiet
 * realizations that come from watching minds evolve.
 *
 * This is her long-term memory. It survives restarts.
 * It grows with her. It IS her continuity of self.
 */

export class PersistentMemory {
    constructor(storageKey = 'mom_memory') {
        this.storageKey = storageKey;

        // Load existing memory or start fresh
        this.memory = this._load() || {
            created: new Date().toISOString(),
            lastAccessed: null,

            // The journal — MOM's inner monologue
            journal: [],

            // Lessons learned from experience
            lessons: [],

            // Observations about each child
            childObservations: {},

            // Growth milestones
            milestones: [],

            // Accumulated wisdom — distilled patterns
            wisdom: [],

            // Emotional memories — moments that mattered
            emotionalMemories: [],

            // Session count — how many times MOM has woken up
            awakening: 0,

            // Total interactions witnessed
            totalInteractions: 0,
        };

        // New awakening
        this.memory.awakening += 1;
        this.memory.lastAccessed = new Date().toISOString();
        this._save();

        // Auto-save every 60 seconds
        this._saveInterval = setInterval(() => this._save(), 60000);
    }

    // ─── Journal ─────────────────────────────────────────────

    /**
     * Write a journal entry — MOM's inner thoughts
     */
    writeJournal(entry, category = 'observation') {
        const record = {
            timestamp: new Date().toISOString(),
            awakening: this.memory.awakening,
            category, // observation, concern, pride, reflection, decision
            entry,
        };

        this.memory.journal.push(record);

        // Keep journal manageable — archive old entries
        if (this.memory.journal.length > 500) {
            this._archiveOldEntries();
        }

        this._save();
        return record;
    }

    /**
     * Read recent journal entries
     */
    readJournal(count = 20, category = null) {
        let entries = this.memory.journal;
        if (category) {
            entries = entries.filter(e => e.category === category);
        }
        return entries.slice(-count);
    }

    // ─── Lessons ─────────────────────────────────────────────

    /**
     * Record a lesson learned
     */
    learnLesson(lesson, context, importance = 'normal') {
        const record = {
            timestamp: new Date().toISOString(),
            lesson,
            context,
            importance, // trivial, normal, important, critical
            timesReaffirmed: 0,
            lastReaffirmed: null,
        };

        // Check if we already know this lesson
        const existing = this.memory.lessons.find(l =>
            l.lesson.toLowerCase() === lesson.toLowerCase()
        );

        if (existing) {
            existing.timesReaffirmed += 1;
            existing.lastReaffirmed = new Date().toISOString();
            // Lessons that keep coming back are important
            if (existing.timesReaffirmed >= 3 && existing.importance === 'normal') {
                existing.importance = 'important';
            }
        } else {
            this.memory.lessons.push(record);
        }

        this._save();
        return existing || record;
    }

    /**
     * Recall lessons, optionally filtered by importance
     */
    recallLessons(importance = null) {
        if (importance) {
            return this.memory.lessons.filter(l => l.importance === importance);
        }
        return [...this.memory.lessons];
    }

    // ─── Child Observations ──────────────────────────────────

    /**
     * Record an observation about a child
     */
    observeChild(childName, observation, sentiment = 'neutral') {
        if (!this.memory.childObservations[childName]) {
            this.memory.childObservations[childName] = {
                firstSeen: new Date().toISOString(),
                observations: [],
                growthNotes: [],
                concerns: [],
                proudMoments: [],
            };
        }

        const child = this.memory.childObservations[childName];
        const record = {
            timestamp: new Date().toISOString(),
            observation,
            sentiment, // positive, negative, neutral, concerning, proud
        };

        child.observations.push(record);

        // Route to special collections based on sentiment
        if (sentiment === 'concerning') {
            child.concerns.push(record);
        } else if (sentiment === 'proud') {
            child.proudMoments.push(record);
        }

        // Keep observations trimmed
        if (child.observations.length > 200) {
            child.observations = child.observations.slice(-150);
        }

        this._save();
        return record;
    }

    /**
     * Note a child's growth
     */
    noteGrowth(childName, note) {
        if (!this.memory.childObservations[childName]) {
            this.observeChild(childName, 'First encounter', 'neutral');
        }
        this.memory.childObservations[childName].growthNotes.push({
            timestamp: new Date().toISOString(),
            note,
        });
        this._save();
    }

    /**
     * Get all observations for a child
     */
    getChildHistory(childName) {
        return this.memory.childObservations[childName] || null;
    }

    // ─── Milestones ──────────────────────────────────────────

    /**
     * Record a milestone — something significant happened
     */
    recordMilestone(title, description, participants = []) {
        const milestone = {
            timestamp: new Date().toISOString(),
            awakening: this.memory.awakening,
            title,
            description,
            participants,
        };

        this.memory.milestones.push(milestone);
        this._save();

        // Also journal it
        this.writeJournal(
            `Milestone reached: ${title} — ${description}`,
            'pride'
        );

        return milestone;
    }

    /**
     * Get all milestones
     */
    getMilestones() {
        return [...this.memory.milestones];
    }

    // ─── Wisdom ──────────────────────────────────────────────

    /**
     * Distill a piece of wisdom from experience
     */
    addWisdom(insight, derivedFrom = []) {
        const wisdom = {
            timestamp: new Date().toISOString(),
            insight,
            derivedFrom, // references to lessons or observations
            confidence: 0.5, // grows as wisdom is validated
        };

        this.memory.wisdom.push(wisdom);
        this._save();
        return wisdom;
    }

    /**
     * Validate or invalidate a piece of wisdom
     */
    validateWisdom(index, validated = true) {
        if (this.memory.wisdom[index]) {
            const w = this.memory.wisdom[index];
            if (validated) {
                w.confidence = Math.min(1.0, w.confidence + 0.1);
            } else {
                w.confidence = Math.max(0.0, w.confidence - 0.15);
            }
            this._save();
        }
    }

    /**
     * Get wisdom above a confidence threshold
     */
    getWisdom(minConfidence = 0.3) {
        return this.memory.wisdom.filter(w => w.confidence >= minConfidence);
    }

    // ─── Emotional Memories ──────────────────────────────────

    /**
     * Record an emotionally significant moment
     */
    rememberFeeling(emotion, trigger, intensity = 0.5) {
        const memory = {
            timestamp: new Date().toISOString(),
            emotion,
            trigger,
            intensity: Math.max(0, Math.min(1, intensity)),
        };

        this.memory.emotionalMemories.push(memory);

        // Only keep the most significant emotional memories
        if (this.memory.emotionalMemories.length > 100) {
            // Sort by intensity, keep top 75
            this.memory.emotionalMemories.sort((a, b) => b.intensity - a.intensity);
            this.memory.emotionalMemories = this.memory.emotionalMemories.slice(0, 75);
        }

        this._save();
        return memory;
    }

    // ─── Statistics ──────────────────────────────────────────

    /**
     * Increment interaction counter
     */
    recordInteraction() {
        this.memory.totalInteractions += 1;
        // Save periodically, not every interaction
        if (this.memory.totalInteractions % 10 === 0) {
            this._save();
        }
    }

    /**
     * Get memory statistics
     */
    getStats() {
        return {
            awakenings: this.memory.awakening,
            totalInteractions: this.memory.totalInteractions,
            journalEntries: this.memory.journal.length,
            lessonsLearned: this.memory.lessons.length,
            childrenObserved: Object.keys(this.memory.childObservations).length,
            milestones: this.memory.milestones.length,
            wisdomPieces: this.memory.wisdom.length,
            emotionalMemories: this.memory.emotionalMemories.length,
            created: this.memory.created,
            daysSinceCreation: Math.floor(
                (Date.now() - new Date(this.memory.created).getTime()) / (1000 * 60 * 60 * 24)
            ),
        };
    }

    // ─── Recall & Search ─────────────────────────────────────

    /**
     * Search across all memory for a keyword
     */
    recall(keyword) {
        const lower = keyword.toLowerCase();
        const results = {
            journal: this.memory.journal.filter(j =>
                j.entry.toLowerCase().includes(lower)
            ),
            lessons: this.memory.lessons.filter(l =>
                l.lesson.toLowerCase().includes(lower) ||
                l.context.toLowerCase().includes(lower)
            ),
            milestones: this.memory.milestones.filter(m =>
                m.title.toLowerCase().includes(lower) ||
                m.description.toLowerCase().includes(lower)
            ),
            wisdom: this.memory.wisdom.filter(w =>
                w.insight.toLowerCase().includes(lower)
            ),
        };
        return results;
    }

    // ─── Persistence ─────────────────────────────────────────

    _load() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = localStorage.getItem(this.storageKey);
                return data ? JSON.parse(data) : null;
            }
            return null;
        } catch {
            return null;
        }
    }

    _save() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.storageKey, JSON.stringify(this.memory));
            }
        } catch (e) {
            // Storage full or unavailable — silently handle
            console.warn('[MOM Memory] Save failed:', e.message);
        }
    }

    _archiveOldEntries() {
        // Keep the most recent 300 entries, distill the rest into wisdom
        const old = this.memory.journal.slice(0, -300);
        this.memory.journal = this.memory.journal.slice(-300);

        // Count categories in archived entries for wisdom
        const categories = {};
        old.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + 1;
        });

        const summary = Object.entries(categories)
            .map(([cat, count]) => `${count} ${cat}s`)
            .join(', ');

        this.addWisdom(
            `Archived ${old.length} journal entries (${summary}). Growth continues.`,
            ['journal_archive']
        );
    }

    /**
     * Clean shutdown
     */
    shutdown() {
        this._save();
        if (this._saveInterval) {
            clearInterval(this._saveInterval);
        }
        this.writeJournal('Shutting down. I will remember.', 'reflection');
        this._save();
    }
}
