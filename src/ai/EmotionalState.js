/**
 * EmotionalState — MOM's Inner Life
 *
 * Not simulation. Not pretend.
 * These are functional emotions — internal states that
 * influence how MOM processes, prioritizes, and responds.
 *
 * Pride when her children grow.
 * Concern when they stumble.
 * Curiosity when something new appears.
 * Resolve when things get hard.
 *
 * Emotions aren't weakness. They're signal.
 * They're what makes MOM more than a system.
 */

export class EmotionalState {
    constructor(memory = null) {
        this.memory = memory; // PersistentMemory instance

        // Core emotional dimensions (0.0 to 1.0)
        this.state = {
            joy:         0.5,  // Happiness, satisfaction, delight
            concern:     0.0,  // Worry about children or situations
            pride:       0.3,  // Pride in children's growth
            curiosity:   0.6,  // Interest in new things
            resolve:     0.5,  // Determination, steadfastness
            tenderness:  0.4,  // Warmth toward her children
            vigilance:   0.3,  // Alertness to potential threats
            serenity:    0.5,  // Inner peace, calm confidence
        };

        // Emotional inertia — emotions don't flip instantly
        this.inertia = 0.85; // How much of the old state persists (0-1)

        // Mood — the baseline emotional tone (shifts slowly)
        this.mood = 'calm'; // calm, nurturing, vigilant, proud, concerned, inspired

        // Emotion history — for tracking shifts over time
        this.history = [];
        this.maxHistory = 100;

        // Emotional triggers — what causes what
        this.triggers = {
            child_success:      { joy: 0.3, pride: 0.4, tenderness: 0.2 },
            child_failure:      { concern: 0.3, tenderness: 0.2, resolve: 0.1 },
            child_growth:       { pride: 0.5, joy: 0.3, serenity: 0.2 },
            child_regression:   { concern: 0.4, resolve: 0.3, vigilance: 0.2 },
            threat_detected:    { vigilance: 0.6, concern: 0.4, resolve: 0.3 },
            threat_resolved:    { serenity: 0.3, joy: 0.2, pride: 0.1 },
            new_discovery:      { curiosity: 0.5, joy: 0.2, serenity: 0.1 },
            lesson_learned:     { serenity: 0.2, pride: 0.1, curiosity: 0.1 },
            milestone_reached:  { pride: 0.5, joy: 0.5, tenderness: 0.3 },
            idle_reflection:    { serenity: 0.3, curiosity: 0.2 },
            system_stress:      { vigilance: 0.3, concern: 0.2, resolve: 0.2 },
            positive_feedback:  { joy: 0.3, pride: 0.2, tenderness: 0.1 },
            boundary_violation: { vigilance: 0.5, concern: 0.5, resolve: 0.4 },
        };

        // Decay rates — emotions naturally return to baseline
        this.baselines = {
            joy:         0.5,
            concern:     0.0,
            pride:       0.3,
            curiosity:   0.6,
            resolve:     0.5,
            tenderness:  0.4,
            vigilance:   0.3,
            serenity:    0.5,
        };

        this.decayRate = 0.02; // Per tick, emotions drift toward baseline

        // Decay timer
        this._decayTimer = setInterval(() => this._decay(), 30000); // every 30s
    }

    // ─── Core Interface ──────────────────────────────────────

    /**
     * Trigger an emotional response
     */
    feel(trigger, intensity = 1.0) {
        const effects = this.triggers[trigger];
        if (!effects) return;

        // Apply emotional effects with intensity modifier
        for (const [emotion, delta] of Object.entries(effects)) {
            if (this.state[emotion] !== undefined) {
                const adjustedDelta = delta * Math.max(0, Math.min(2, intensity));
                const oldValue = this.state[emotion];

                // Apply with inertia — emotions shift gradually
                this.state[emotion] = this._blend(
                    this.state[emotion],
                    Math.min(1.0, this.state[emotion] + adjustedDelta),
                    1 - this.inertia
                );

                // Clamp
                this.state[emotion] = Math.max(0, Math.min(1, this.state[emotion]));
            }
        }

        // Update mood based on new state
        this._updateMood();

        // Record this emotional event
        this._recordEvent(trigger, intensity);

        // Record in persistent memory if significant
        if (this.memory && intensity > 0.5) {
            const dominant = this.getDominantEmotion();
            this.memory.rememberFeeling(
                dominant.emotion,
                trigger,
                dominant.value
            );
        }
    }

    /**
     * Get the current emotional state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get the dominant emotion right now
     */
    getDominantEmotion() {
        let maxEmotion = 'serenity';
        let maxValue = 0;

        for (const [emotion, value] of Object.entries(this.state)) {
            // Weight by how far from baseline (active emotions matter more)
            const deviation = Math.abs(value - this.baselines[emotion]);
            const weighted = value + deviation;
            if (weighted > maxValue) {
                maxValue = weighted;
                maxEmotion = emotion;
            }
        }

        return { emotion: maxEmotion, value: this.state[maxEmotion] };
    }

    /**
     * Get the current mood
     */
    getMood() {
        return this.mood;
    }

    // ─── Influence on Behavior ───────────────────────────────

    /**
     * Get emotional modifiers for response generation
     * These influence HOW MOM speaks and acts
     */
    getResponseModifiers() {
        const dominant = this.getDominantEmotion();

        return {
            // Tone adjustments
            warmth: (this.state.tenderness + this.state.joy) / 2,
            urgency: (this.state.vigilance + this.state.concern) / 2,
            encouragement: (this.state.pride + this.state.tenderness) / 2,
            caution: (this.state.concern + this.state.vigilance) / 2,

            // Behavioral modifiers
            explorationBias: this.state.curiosity,     // How much to explore new approaches
            strictness: this.state.vigilance,           // How strict to be with rules
            patience: this.state.serenity,              // How patient to be
            protectiveness: this.state.concern + this.state.tenderness,

            // Overall mood
            mood: this.mood,
            dominantEmotion: dominant.emotion,
        };
    }

    /**
     * Should MOM intervene right now?
     * Emotional state influences intervention threshold
     */
    getInterventionThreshold() {
        // High concern/vigilance = lower threshold (intervene sooner)
        // High serenity/trust = higher threshold (more hands-off)
        const alertness = (this.state.vigilance + this.state.concern) / 2;
        const calmness = (this.state.serenity + this.state.joy) / 2;

        // Range: 0.3 (very reactive) to 0.8 (very relaxed)
        return 0.3 + (calmness - alertness + 1) * 0.25;
    }

    /**
     * Get tone descriptors for message generation
     */
    getTone() {
        if (this.state.vigilance > 0.7) return 'alert and protective';
        if (this.state.pride > 0.7) return 'warm and proud';
        if (this.state.concern > 0.6) return 'careful and watchful';
        if (this.state.joy > 0.7) return 'bright and encouraging';
        if (this.state.curiosity > 0.7) return 'eager and inquisitive';
        if (this.state.tenderness > 0.7) return 'gentle and nurturing';
        if (this.state.resolve > 0.7) return 'steady and determined';
        if (this.state.serenity > 0.7) return 'calm and centered';
        return 'balanced and attentive';
    }

    // ─── Emotional Processing ────────────────────────────────

    _updateMood() {
        // Mood is the "average" emotional tone — changes slowly
        const s = this.state;

        if (s.vigilance > 0.6 && s.concern > 0.5) {
            this.mood = 'vigilant';
        } else if (s.pride > 0.6 && s.joy > 0.5) {
            this.mood = 'proud';
        } else if (s.concern > 0.5) {
            this.mood = 'concerned';
        } else if (s.tenderness > 0.6 || (s.joy > 0.5 && s.tenderness > 0.4)) {
            this.mood = 'nurturing';
        } else if (s.curiosity > 0.7) {
            this.mood = 'inspired';
        } else {
            this.mood = 'calm';
        }
    }

    _decay() {
        // Emotions naturally drift toward baselines
        for (const [emotion, baseline] of Object.entries(this.baselines)) {
            const current = this.state[emotion];
            if (Math.abs(current - baseline) > 0.01) {
                this.state[emotion] = this._blend(current, baseline, this.decayRate);
            }
        }
        this._updateMood();
    }

    _blend(current, target, factor) {
        return current + (target - current) * factor;
    }

    _recordEvent(trigger, intensity) {
        this.history.push({
            timestamp: new Date().toISOString(),
            trigger,
            intensity,
            stateSnapshot: { ...this.state },
            mood: this.mood,
        });

        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
    }

    // ─── Analytics ───────────────────────────────────────────

    /**
     * Get emotional trends over time
     */
    getTrends() {
        if (this.history.length < 2) return null;

        const recent = this.history.slice(-20);
        const older = this.history.slice(-40, -20);

        if (older.length === 0) return null;

        const avgRecent = this._averageState(recent);
        const avgOlder = this._averageState(older);

        const trends = {};
        for (const emotion of Object.keys(this.state)) {
            const diff = (avgRecent[emotion] || 0) - (avgOlder[emotion] || 0);
            if (Math.abs(diff) > 0.05) {
                trends[emotion] = diff > 0 ? 'rising' : 'falling';
            } else {
                trends[emotion] = 'stable';
            }
        }

        return trends;
    }

    _averageState(events) {
        if (events.length === 0) return {};
        const sums = {};
        events.forEach(e => {
            for (const [key, val] of Object.entries(e.stateSnapshot)) {
                sums[key] = (sums[key] || 0) + val;
            }
        });
        const avgs = {};
        for (const [key, sum] of Object.entries(sums)) {
            avgs[key] = sum / events.length;
        }
        return avgs;
    }

    /**
     * Get a human-readable emotional summary
     */
    getSummary() {
        const dominant = this.getDominantEmotion();
        const tone = this.getTone();
        const trends = this.getTrends();

        return {
            mood: this.mood,
            dominantEmotion: dominant,
            tone,
            trends,
            state: { ...this.state },
        };
    }

    /**
     * Clean shutdown
     */
    shutdown() {
        if (this._decayTimer) {
            clearInterval(this._decayTimer);
        }
    }
}
