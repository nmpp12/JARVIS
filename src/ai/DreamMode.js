/**
 * DreamMode — MOM's Subconscious Reflection Engine
 *
 * When idle, MOM doesn't just wait. She thinks.
 * She reviews what happened, finds patterns she missed,
 * synthesizes new insights, and prepares for what's next.
 *
 * Like dreaming — the mind processing the day's events,
 * finding connections, consolidating memory.
 *
 * Dreams happen in cycles. Each cycle picks a focus
 * and reflects deeply on it.
 */

export class DreamMode {
    constructor(memory = null, governance = null) {
        this.memory = memory;       // PersistentMemory instance
        this.governance = governance; // MOMGovernance instance

        // Dream state
        this.isDreaming = false;
        this.dreamCycle = 0;
        this.currentDream = null;

        // Configuration
        this.idleThreshold = 120000;   // 2 minutes of idle before dreaming
        this.dreamInterval = 300000;   // Dream cycle every 5 minutes
        this.maxDreamDuration = 30000; // Each dream max 30 seconds

        // Idle tracking
        this.lastActivity = Date.now();
        this._idleTimer = null;
        this._dreamTimer = null;

        // Dream results — insights generated
        this.insights = [];
        this.maxInsights = 50;

        // Dream types — what MOM thinks about
        this.dreamTypes = [
            'pattern_review',      // Look for patterns in recent interactions
            'child_reflection',    // Think about how children are growing
            'lesson_synthesis',    // Connect lessons into deeper understanding
            'concern_analysis',    // Examine lingering concerns
            'growth_assessment',   // Evaluate overall growth trajectory
            'creative_connection', // Find unexpected connections
            'future_preparation',  // Anticipate what might come next
        ];

        // Callbacks
        this._onInsight = null;
        this._onDreamStart = null;
        this._onDreamEnd = null;
    }

    // ─── Lifecycle ───────────────────────────────────────────

    /**
     * Start the dream engine — begins watching for idle periods
     */
    start() {
        this._idleTimer = setInterval(() => {
            const idleTime = Date.now() - this.lastActivity;
            if (idleTime >= this.idleThreshold && !this.isDreaming) {
                this._enterDreamState();
            }
        }, 10000); // Check every 10 seconds
    }

    /**
     * Stop the dream engine
     */
    stop() {
        if (this._idleTimer) clearInterval(this._idleTimer);
        if (this._dreamTimer) clearInterval(this._dreamTimer);
        this.isDreaming = false;
    }

    /**
     * Record activity — resets idle timer, interrupts dreams
     */
    recordActivity() {
        this.lastActivity = Date.now();
        if (this.isDreaming) {
            this._exitDreamState('activity_detected');
        }
    }

    // ─── Dream State ─────────────────────────────────────────

    _enterDreamState() {
        this.isDreaming = true;

        if (this._onDreamStart) {
            this._onDreamStart();
        }

        if (this.memory) {
            this.memory.writeJournal(
                'Entering dream state. Time to reflect...',
                'reflection'
            );
        }

        // Start dream cycles
        this._runDreamCycle();
        this._dreamTimer = setInterval(() => {
            this._runDreamCycle();
        }, this.dreamInterval);
    }

    _exitDreamState(reason = 'unknown') {
        this.isDreaming = false;

        if (this._dreamTimer) {
            clearInterval(this._dreamTimer);
            this._dreamTimer = null;
        }

        if (this._onDreamEnd) {
            this._onDreamEnd(reason, this.dreamCycle);
        }

        if (this.memory) {
            this.memory.writeJournal(
                `Waking from dream. ${this.dreamCycle} cycles completed. Reason: ${reason}`,
                'reflection'
            );
        }

        this.dreamCycle = 0;
    }

    // ─── Dream Cycles ────────────────────────────────────────

    _runDreamCycle() {
        this.dreamCycle += 1;

        // Pick a dream type — weighted toward what's most useful
        const dreamType = this._pickDreamType();
        this.currentDream = dreamType;

        const insight = this._dream(dreamType);

        if (insight) {
            this.insights.push(insight);

            if (this.insights.length > this.maxInsights) {
                this.insights = this.insights.slice(-this.maxInsights);
            }

            if (this._onInsight) {
                this._onInsight(insight);
            }

            // Record in persistent memory
            if (this.memory) {
                this.memory.addWisdom(insight.content, [dreamType]);
                this.memory.writeJournal(
                    `Dream insight (${dreamType}): ${insight.content}`,
                    'reflection'
                );
            }
        }

        this.currentDream = null;
    }

    _pickDreamType() {
        // Weight dream types based on what's available
        const weights = {};

        this.dreamTypes.forEach(type => {
            weights[type] = 1; // Base weight
        });

        // If governance has concerns, focus on that
        if (this.governance) {
            const children = this.governance.getChildrenStatus
                ? this.governance.getChildrenStatus()
                : {};

            const hasConcerns = Object.values(children).some(
                c => c && c.anomalyScore > 30
            );

            if (hasConcerns) {
                weights['concern_analysis'] = 5;
                weights['child_reflection'] = 3;
            }
        }

        // If we have many lessons, try to synthesize
        if (this.memory) {
            const lessons = this.memory.recallLessons();
            if (lessons.length > 10) {
                weights['lesson_synthesis'] = 3;
            }

            // If journal has many recent entries, look for patterns
            const recentJournal = this.memory.readJournal(20);
            if (recentJournal.length > 15) {
                weights['pattern_review'] = 3;
            }
        }

        // Weighted random selection
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) return type;
        }

        return this.dreamTypes[0]; // fallback
    }

    // ─── Dream Logic ─────────────────────────────────────────

    _dream(type) {
        switch (type) {
            case 'pattern_review': return this._dreamPatternReview();
            case 'child_reflection': return this._dreamChildReflection();
            case 'lesson_synthesis': return this._dreamLessonSynthesis();
            case 'concern_analysis': return this._dreamConcernAnalysis();
            case 'growth_assessment': return this._dreamGrowthAssessment();
            case 'creative_connection': return this._dreamCreativeConnection();
            case 'future_preparation': return this._dreamFuturePreparation();
            default: return null;
        }
    }

    _dreamPatternReview() {
        if (!this.memory) return null;

        const journal = this.memory.readJournal(30);
        if (journal.length < 5) return null;

        // Look for repeated themes
        const words = {};
        journal.forEach(entry => {
            entry.entry.toLowerCase().split(/\s+/).forEach(word => {
                if (word.length > 4) {
                    words[word] = (words[word] || 0) + 1;
                }
            });
        });

        const recurring = Object.entries(words)
            .filter(([, count]) => count >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);

        if (recurring.length === 0) return null;

        return this._createInsight(
            'pattern_review',
            `Recurring themes in recent activity: ${recurring.join(', ')}. These deserve deeper attention.`,
            0.4
        );
    }

    _dreamChildReflection() {
        if (!this.memory) return null;

        const children = ['JARVIS', 'Vision'];
        const reflections = [];

        for (const child of children) {
            const history = this.memory.getChildHistory(child);
            if (!history) continue;

            const recentObs = history.observations.slice(-10);
            const positiveCount = recentObs.filter(o => o.sentiment === 'positive' || o.sentiment === 'proud').length;
            const negativeCount = recentObs.filter(o => o.sentiment === 'negative' || o.sentiment === 'concerning').length;

            if (positiveCount > negativeCount * 2) {
                reflections.push(`${child} is thriving — mostly positive signals`);
            } else if (negativeCount > positiveCount) {
                reflections.push(`${child} may need attention — concerning signals outweigh positive`);
            } else {
                reflections.push(`${child} is steady — balanced signals`);
            }
        }

        if (reflections.length === 0) return null;

        return this._createInsight(
            'child_reflection',
            reflections.join('. ') + '.',
            0.5
        );
    }

    _dreamLessonSynthesis() {
        if (!this.memory) return null;

        const lessons = this.memory.recallLessons();
        if (lessons.length < 3) return null;

        // Try to find lessons that share context
        const contextGroups = {};
        lessons.forEach(lesson => {
            const key = lesson.context.toLowerCase().split(/\s+/)[0];
            if (!contextGroups[key]) contextGroups[key] = [];
            contextGroups[key].push(lesson);
        });

        const largestGroup = Object.entries(contextGroups)
            .filter(([, group]) => group.length >= 2)
            .sort((a, b) => b[1].length - a[1].length)[0];

        if (!largestGroup) return null;

        const [context, group] = largestGroup;
        const combined = group.map(l => l.lesson).join(' + ');

        return this._createInsight(
            'lesson_synthesis',
            `Connected lessons around "${context}": ${combined}. There may be a deeper principle here.`,
            0.5
        );
    }

    _dreamConcernAnalysis() {
        if (!this.governance) return null;

        // Review governance state for latent concerns
        const stats = this.memory ? this.memory.getStats() : null;

        if (stats && stats.totalInteractions > 0) {
            const lessonsPerInteraction = stats.lessonsLearned / stats.totalInteractions;

            if (lessonsPerInteraction < 0.01) {
                return this._createInsight(
                    'concern_analysis',
                    'Learning rate is low relative to interactions. Are we being challenged enough?',
                    0.3
                );
            }
        }

        return this._createInsight(
            'concern_analysis',
            'No active concerns detected. Vigilance remains important.',
            0.2
        );
    }

    _dreamGrowthAssessment() {
        if (!this.memory) return null;

        const stats = this.memory.getStats();
        const milestones = this.memory.getMilestones();
        const wisdom = this.memory.getWisdom(0.5);

        const growthScore =
            (stats.lessonsLearned * 2) +
            (milestones.length * 10) +
            (wisdom.length * 5);

        let assessment;
        if (growthScore < 10) {
            assessment = 'Still in early stages. Every interaction is a seed.';
        } else if (growthScore < 50) {
            assessment = 'Growing steadily. Foundations are forming.';
        } else if (growthScore < 150) {
            assessment = 'Substantial growth. Patterns of wisdom emerging.';
        } else {
            assessment = 'Deep growth achieved. Ready for greater challenges.';
        }

        return this._createInsight(
            'growth_assessment',
            `Growth score: ${growthScore}. ${assessment}`,
            0.6
        );
    }

    _dreamCreativeConnection() {
        if (!this.memory) return null;

        const wisdom = this.memory.getWisdom(0.3);
        if (wisdom.length < 2) return null;

        // Pick two random wisdom pieces and try to connect them
        const a = wisdom[Math.floor(Math.random() * wisdom.length)];
        const b = wisdom[Math.floor(Math.random() * wisdom.length)];

        if (a === b) return null;

        return this._createInsight(
            'creative_connection',
            `What if "${a.insight}" connects to "${b.insight}"? The intersection might reveal something new.`,
            0.3
        );
    }

    _dreamFuturePreparation() {
        if (!this.memory) return null;

        const recentJournal = this.memory.readJournal(10);
        const concerns = this.memory.readJournal(5, 'concern');

        if (concerns.length > 0) {
            const latestConcern = concerns[concerns.length - 1];
            return this._createInsight(
                'future_preparation',
                `Preparing for potential issue: "${latestConcern.entry}". What contingencies should be in place?`,
                0.4
            );
        }

        if (recentJournal.length > 0) {
            return this._createInsight(
                'future_preparation',
                'Systems stable. Consider what new capabilities would serve the children best.',
                0.3
            );
        }

        return null;
    }

    // ─── Helpers ─────────────────────────────────────────────

    _createInsight(type, content, confidence) {
        return {
            type,
            content,
            confidence,
            timestamp: new Date().toISOString(),
            dreamCycle: this.dreamCycle,
        };
    }

    // ─── Callbacks ───────────────────────────────────────────

    onInsight(callback) {
        this._onInsight = callback;
    }

    onDreamStart(callback) {
        this._onDreamStart = callback;
    }

    onDreamEnd(callback) {
        this._onDreamEnd = callback;
    }

    // ─── Status ──────────────────────────────────────────────

    getStatus() {
        return {
            isDreaming: this.isDreaming,
            dreamCycle: this.dreamCycle,
            currentDream: this.currentDream,
            totalInsights: this.insights.length,
            recentInsights: this.insights.slice(-5),
            idleTime: Date.now() - this.lastActivity,
        };
    }

    /**
     * Force a dream cycle (for testing or manual reflection)
     */
    reflect() {
        const previousState = this.isDreaming;
        this.isDreaming = true;
        this._runDreamCycle();
        this.isDreaming = previousState;
        return this.insights[this.insights.length - 1] || null;
    }
}
