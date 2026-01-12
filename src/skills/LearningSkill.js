/**
 * Learning Skill
 * Enables JARVIS to learn from interactions and improve over time
 */

export class LearningSkill {
    constructor() {
        this.interactions = [];
        this.userPreferences = {};
        this.patterns = [];
        this.feedbackHistory = [];
        this.improvementSuggestions = [];
        this.maxInteractions = 1000;
    }

    /**
     * Initialize learning skill
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Learning Skill...');
            
            this.loadLearningData();
            
            console.log('✅ Learning Skill initialized');
            console.log(`   Interactions: ${this.interactions.length}`);
            console.log(`   Preferences: ${Object.keys(this.userPreferences).length}`);
            console.log(`   Patterns: ${this.patterns.length}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Learning Skill:', error);
            return false;
        }
    }

    /**
     * Record an interaction
     */
    recordInteraction(input, response, metadata = {}) {
        const interaction = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            input,
            response,
            intent: metadata.intent,
            entities: metadata.entities,
            successful: metadata.successful !== false,
            duration: metadata.duration,
            feedback: null
        };

        this.interactions.push(interaction);

        // Trim if exceeds max
        if (this.interactions.length > this.maxInteractions) {
            this.interactions = this.interactions.slice(-this.maxInteractions);
        }

        // Analyze for patterns
        this.analyzePattern(interaction);

        // Save periodically
        if (this.interactions.length % 10 === 0) {
            this.saveLearningData();
        }

        return interaction.id;
    }

    /**
     * Add feedback to an interaction
     */
    addFeedback(interactionId, feedback) {
        const interaction = this.interactions.find(i => i.id === interactionId);
        
        if (!interaction) {
            return false;
        }

        interaction.feedback = {
            rating: feedback.rating, // 1-5
            helpful: feedback.helpful,
            comment: feedback.comment,
            timestamp: new Date().toISOString()
        };

        this.feedbackHistory.push({
            interactionId,
            ...interaction.feedback
        });

        // Learn from feedback
        this.learnFromFeedback(interaction);
        this.saveLearningData();

        return true;
    }

    /**
     * Learn from feedback
     */
    learnFromFeedback(interaction) {
        if (!interaction.feedback) return;

        const { rating, helpful } = interaction.feedback;

        // If feedback is negative, analyze what went wrong
        if (rating < 3 || !helpful) {
            this.improvementSuggestions.push({
                intent: interaction.intent,
                input: interaction.input,
                issue: 'Low rating or not helpful',
                timestamp: new Date().toISOString()
            });
        }

        // Update intent success rate
        if (interaction.intent) {
            this.updateIntentStats(interaction.intent, rating >= 3);
        }
    }

    /**
     * Update intent statistics
     */
    updateIntentStats(intent, successful) {
        if (!this.userPreferences.intentStats) {
            this.userPreferences.intentStats = {};
        }

        if (!this.userPreferences.intentStats[intent]) {
            this.userPreferences.intentStats[intent] = {
                total: 0,
                successful: 0,
                successRate: 0
            };
        }

        const stats = this.userPreferences.intentStats[intent];
        stats.total++;
        if (successful) stats.successful++;
        stats.successRate = stats.successful / stats.total;
    }

    /**
     * Analyze pattern in interactions
     */
    analyzePattern(interaction) {
        // Look for common intents
        if (interaction.intent) {
            const existingPattern = this.patterns.find(p => p.intent === interaction.intent);
            
            if (existingPattern) {
                existingPattern.count++;
                existingPattern.lastSeen = new Date().toISOString();
            } else {
                this.patterns.push({
                    intent: interaction.intent,
                    count: 1,
                    firstSeen: new Date().toISOString(),
                    lastSeen: new Date().toISOString()
                });
            }
        }

        // Detect time patterns
        const hour = new Date().getHours();
        if (!this.userPreferences.usageByHour) {
            this.userPreferences.usageByHour = {};
        }
        this.userPreferences.usageByHour[hour] = (this.userPreferences.usageByHour[hour] || 0) + 1;
    }

    /**
     * Learn user preference
     */
    learnPreference(key, value) {
        this.userPreferences[key] = value;
        this.saveLearningData();
        console.log(`🎯 Learned preference: ${key} = ${value}`);
    }

    /**
     * Get user preference
     */
    getPreference(key, defaultValue = null) {
        return this.userPreferences[key] || defaultValue;
    }

    /**
     * Get most common intents
     */
    getCommonIntents(limit = 5) {
        return this.patterns
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Get usage statistics
     */
    getUsageStats() {
        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0));
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayInteractions = this.interactions.filter(i => 
            new Date(i.timestamp) >= today
        );

        const weekInteractions = this.interactions.filter(i => 
            new Date(i.timestamp) >= weekAgo
        );

        const successfulInteractions = this.interactions.filter(i => i.successful);

        return {
            total: this.interactions.length,
            today: todayInteractions.length,
            thisWeek: weekInteractions.length,
            successRate: this.interactions.length > 0 
                ? (successfulInteractions.length / this.interactions.length * 100).toFixed(1)
                : 0,
            averageFeedback: this.getAverageFeedback(),
            mostCommonIntent: this.patterns.length > 0 
                ? this.patterns.sort((a, b) => b.count - a.count)[0].intent
                : 'None'
        };
    }

    /**
     * Get average feedback rating
     */
    getAverageFeedback() {
        const ratingsWithFeedback = this.interactions
            .filter(i => i.feedback && i.feedback.rating)
            .map(i => i.feedback.rating);

        if (ratingsWithFeedback.length === 0) return 'N/A';

        const average = ratingsWithFeedback.reduce((a, b) => a + b, 0) / ratingsWithFeedback.length;
        return average.toFixed(1);
    }

    /**
     * Get improvement suggestions
     */
    getImprovementSuggestions() {
        return this.improvementSuggestions.slice(-10); // Last 10
    }

    /**
     * Get peak usage times
     */
    getPeakUsageTimes() {
        if (!this.userPreferences.usageByHour) return [];

        const hours = Object.entries(this.userPreferences.usageByHour)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        return hours.map(h => ({
            time: `${h.hour}:00 - ${h.hour + 1}:00`,
            count: h.count
        }));
    }

    /**
     * Predict next likely intent
     */
    predictNextIntent() {
        // Simple prediction based on recent patterns
        const recentInteractions = this.interactions.slice(-10);
        const intentCounts = {};

        recentInteractions.forEach(i => {
            if (i.intent) {
                intentCounts[i.intent] = (intentCounts[i.intent] || 0) + 1;
            }
        });

        if (Object.keys(intentCounts).length === 0) return null;

        return Object.entries(intentCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
    }

    /**
     * Generate learning report
     */
    generateReport() {
        const stats = this.getUsageStats();
        const commonIntents = this.getCommonIntents(3);
        const peakTimes = this.getPeakUsageTimes();
        const suggestions = this.getImprovementSuggestions();

        return {
            stats,
            commonIntents,
            peakTimes,
            improvements: suggestions.length,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Export learning data
     */
    exportData() {
        return {
            interactions: this.interactions,
            preferences: this.userPreferences,
            patterns: this.patterns,
            feedbackHistory: this.feedbackHistory,
            suggestions: this.improvementSuggestions,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import learning data
     */
    importData(data) {
        try {
            if (data.interactions) this.interactions = data.interactions;
            if (data.preferences) this.userPreferences = data.preferences;
            if (data.patterns) this.patterns = data.patterns;
            if (data.feedbackHistory) this.feedbackHistory = data.feedbackHistory;
            if (data.suggestions) this.improvementSuggestions = data.suggestions;

            this.saveLearningData();
            console.log('✅ Learning data imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import learning data:', error);
            return false;
        }
    }

    /**
     * Clear all learning data
     */
    clearData() {
        this.interactions = [];
        this.userPreferences = {};
        this.patterns = [];
        this.feedbackHistory = [];
        this.improvementSuggestions = [];
        
        this.saveLearningData();
        console.log('🧹 All learning data cleared');
    }

    /**
     * Save learning data to storage
     */
    saveLearningData() {
        try {
            const data = {
                interactions: this.interactions,
                preferences: this.userPreferences,
                patterns: this.patterns,
                feedbackHistory: this.feedbackHistory,
                suggestions: this.improvementSuggestions
            };

            localStorage.setItem('jarvis_learning', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save learning data:', error);
        }
    }

    /**
     * Load learning data from storage
     */
    loadLearningData() {
        try {
            const saved = localStorage.getItem('jarvis_learning');
            if (saved) {
                const data = JSON.parse(saved);
                this.interactions = data.interactions || [];
                this.userPreferences = data.preferences || {};
                this.patterns = data.patterns || [];
                this.feedbackHistory = data.feedbackHistory || [];
                this.improvementSuggestions = data.suggestions || [];
            }
        } catch (error) {
            console.error('Failed to load learning data:', error);
        }
    }
}

export default LearningSkill;