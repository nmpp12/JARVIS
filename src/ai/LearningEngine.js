export class LearningEngine {
    constructor() {
        this.memoryBank = new Map();
        this.patternRecognition = new PatternRecognition();
        this.feedbackProcessor = new FeedbackProcessor();
        this.adaptiveResponses = new Map();
        this.userModels = new Map();
        this.contextualLearning = new ContextualLearning();
    }

    async learnFromInteraction(interaction, feedback = null) {
        // Store interaction in memory bank
        this.storeInteraction(interaction);
        
        // Process feedback if provided
        if (feedback) {
            await this.feedbackProcessor.processFeedback(interaction, feedback);
        }
        
        // Recognize patterns in user behavior
        const patterns = await this.patternRecognition.analyzeInteraction(interaction);
        
        // Update user model
        await this.updateUserModel(interaction, patterns);
        
        // Generate adaptive responses for similar future inputs
        await this.generateAdaptiveResponses(interaction, patterns);
        
        // Learn contextual relationships
        await this.contextualLearning.processContext(interaction);
        
        return {
            patternsFound: patterns.length,
            adaptiveResponsesGenerated: this.adaptiveResponses.size,
            userModelUpdated: true
        };
    }

    storeInteraction(interaction) {
        const key = this.generateInteractionKey(interaction);
        
        if (!this.memoryBank.has(key)) {
            this.memoryBank.set(key, []);
        }
        
        this.memoryBank.get(key).push({
            ...interaction,
            timestamp: Date.now(),
            accessCount: 0,
            successScore: 0
        });
        
        // Limit memory bank size
        if (this.memoryBank.get(key).length > 50) {
            this.memoryBank.get(key).shift();
        }
    }

    generateInteractionKey(interaction) {
        const topics = interaction.topics?.join('_') || 'general';
        const complexity = interaction.complexity || 'medium';
        return `${topics}_${complexity}`;
    }

    async updateUserModel(interaction, patterns) {
        const userId = 'default'; // In a multi-user system, this would be dynamic
        
        if (!this.userModels.has(userId)) {
            this.userModels.set(userId, {
                preferences: new Map(),
                learningStyle: 'adaptive',
                expertiseLevel: new Map(),
                communicationPreferences: new Map(),
                successfulPatterns: [],
                failurePatterns: []
            });
        }
        
        const userModel = this.userModels.get(userId);
        
        // Update expertise level for topics
        interaction.topics?.forEach(topic => {
            const currentLevel = userModel.expertiseLevel.get(topic) || 0;
            userModel.expertiseLevel.set(topic, currentLevel + 1);
        });
        
        // Update successful patterns
        if (interaction.feedback === 'positive' || interaction.sentiment === 'positive') {
            userModel.successfulPatterns.push(...patterns);
        } else if (interaction.feedback === 'negative' || interaction.sentiment === 'negative') {
            userModel.failurePatterns.push(...patterns);
        }
        
        // Update communication preferences
        this.updateCommunicationPreferences(userModel, interaction);
    }

    updateCommunicationPreferences(userModel, interaction) {
        const prefs = userModel.communicationPreferences;
        
        // Analyze response length preference
        const responseLength = interaction.response?.length || 0;
        if (responseLength > 0) {
            const currentAvg = prefs.get('averageResponseLength') || 0;
            const count = prefs.get('responseCount') || 0;
            prefs.set('averageResponseLength', (currentAvg * count + responseLength) / (count + 1));
            prefs.set('responseCount', count + 1);
        }
        
        // Analyze detail level preference
        const detailLevel = this.assessDetailLevel(interaction.input);
        const currentDetailPref = prefs.get('detailLevelPreference') || new Map();
        const currentCount = currentDetailPref.get(detailLevel) || 0;
        currentDetailPref.set(detailLevel, currentCount + 1);
        prefs.set('detailLevelPreference', currentDetailPref);
    }

    assessDetailLevel(input) {
        if (input.includes('detailed') || input.includes('comprehensive') || input.includes('thorough')) {
            return 'high';
        } else if (input.includes('brief') || input.includes('summary') || input.includes('quick')) {
            return 'low';
        }
        return 'medium';
    }

    async generateAdaptiveResponses(interaction, patterns) {
        patterns.forEach(pattern => {
            const responseKey = this.generateResponseKey(pattern);
            
            if (!this.adaptiveResponses.has(responseKey)) {
                this.adaptiveResponses.set(responseKey, {
                    pattern,
                    responses: [],
                    successRate: 0,
                    usageCount: 0
                });
            }
            
            const adaptiveResponse = this.adaptiveResponses.get(responseKey);
            adaptiveResponse.responses.push({
                response: interaction.response,
                success: interaction.feedback === 'positive',
                context: interaction.context
            });
            
            // Update success rate
            const successfulResponses = adaptiveResponse.responses.filter(r => r.success).length;
            adaptiveResponse.successRate = successfulResponses / adaptiveResponse.responses.length;
        });
    }

    generateResponseKey(pattern) {
        return `${pattern.type}_${pattern.context}_${pattern.complexity}`;
    }

    async getPersonalizedResponse(input, baseResponse, context = {}) {
        const userId = 'default';
        const userModel = this.userModels.get(userId);
        
        if (!userModel) {
            return baseResponse;
        }
        
        // Find matching patterns
        const inputPatterns = await this.patternRecognition.analyzeInput(input);
        const matchingResponses = this.findMatchingAdaptiveResponses(inputPatterns);
        
        if (matchingResponses.length > 0) {
            // Use the most successful adaptive response
            const bestResponse = matchingResponses.sort((a, b) => b.successRate - a.successRate)[0];
            return this.adaptResponseToUser(bestResponse.responses[0].response, userModel);
        }
        
        // Adapt base response to user preferences
        return this.adaptResponseToUser(baseResponse, userModel);
    }

    findMatchingAdaptiveResponses(patterns) {
        const matches = [];
        
        patterns.forEach(pattern => {
            const responseKey = this.generateResponseKey(pattern);
            const adaptiveResponse = this.adaptiveResponses.get(responseKey);
            
            if (adaptiveResponse && adaptiveResponse.successRate > 0.6) {
                matches.push(adaptiveResponse);
            }
        });
        
        return matches;
    }

    adaptResponseToUser(response, userModel) {
        let adaptedResponse = response;
        
        // Adapt based on communication preferences
        const prefs = userModel.communicationPreferences;
        const avgLength = prefs.get('averageResponseLength') || 500;
        
        if (response.length > avgLength * 1.5) {
            // User prefers shorter responses
            adaptedResponse = this.shortenResponse(response);
        } else if (response.length < avgLength * 0.5) {
            // User prefers longer responses
            adaptedResponse = this.expandResponse(response);
        }
        
        // Adapt based on expertise level
        const topics = this.extractTopics(response);
        const userExpertise = this.calculateAverageExpertise(topics, userModel);
        
        if (userExpertise > 10) {
            // User is experienced, can handle technical details
            adaptedResponse = this.addTechnicalDetails(adaptedResponse);
        } else if (userExpertise < 3) {
            // User is beginner, simplify explanations
            adaptedResponse = this.simplifyExplanation(adaptedResponse);
        }
        
        return adaptedResponse;
    }

    shortenResponse(response) {
        const sentences = response.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length <= 2) return response;
        
        // Keep the most important sentences
        const important = sentences.filter(s => 
            s.includes('important') || 
            s.includes('key') || 
            s.includes('essential') ||
            s.includes('**')
        );
        
        const result = important.length > 0 ? 
            [sentences[0], ...important.slice(0, 2)] : 
            sentences.slice(0, 3);
            
        return result.join('. ') + '.';
    }

    expandResponse(response) {
        return response + '\n\n**Additional Context:**\nThis information can be applied in various scenarios and may have broader implications worth considering.';
    }

    addTechnicalDetails(response) {
        return response + '\n\n**Technical Note:**\nFor advanced implementation details and optimization considerations, refer to the relevant documentation and best practices.';
    }

    simplifyExplanation(response) {
        return response.replace(/\b(implementation|optimization|paradigm|architecture)\b/gi, match => {
            const simplifications = {
                'implementation': 'way to build',
                'optimization': 'making better',
                'paradigm': 'approach',
                'architecture': 'structure'
            };
            return simplifications[match.toLowerCase()] || match;
        });
    }

    extractTopics(text) {
        // Simple topic extraction
        const topics = [];
        const topicPatterns = {
            'programming': /code|program|function|class|algorithm/i,
            'web_development': /web|html|css|javascript|react/i,
            'data_science': /data|analysis|machine learning|ai/i,
            'system_admin': /server|network|security|deployment/i
        };

        for (const [topic, pattern] of Object.entries(topicPatterns)) {
            if (pattern.test(text)) {
                topics.push(topic);
            }
        }

        return topics;
    }

    calculateAverageExpertise(topics, userModel) {
        if (topics.length === 0) return 5; // Default medium expertise
        
        const expertiseLevels = topics.map(topic => 
            userModel.expertiseLevel.get(topic) || 0
        );
        
        return expertiseLevels.reduce((sum, level) => sum + level, 0) / expertiseLevels.length;
    }

    getLearningStats() {
        const userId = 'default';
        const userModel = this.userModels.get(userId);
        
        return {
            totalInteractions: Array.from(this.memoryBank.values()).reduce((sum, arr) => sum + arr.length, 0),
            adaptiveResponses: this.adaptiveResponses.size,
            userExpertiseAreas: userModel ? Array.from(userModel.expertiseLevel.entries()) : [],
            successfulPatterns: userModel ? userModel.successfulPatterns.length : 0,
            averageResponseLength: userModel ? userModel.communicationPreferences.get('averageResponseLength') : 0
        };
    }
}

class PatternRecognition {
    constructor() {
        this.patterns = new Map();
        this.sequencePatterns = new Map();
    }

    async analyzeInteraction(interaction) {
        const patterns = [];
        
        // Analyze input patterns
        const inputPatterns = await this.analyzeInput(interaction.input);
        patterns.push(...inputPatterns);
        
        // Analyze response patterns
        const responsePatterns = await this.analyzeResponse(interaction.response);
        patterns.push(...responsePatterns);
        
        // Analyze temporal patterns
        const temporalPatterns = await this.analyzeTemporalPatterns(interaction);
        patterns.push(...temporalPatterns);
        
        return patterns;
    }

    async analyzeInput(input) {
        const patterns = [];
        
        // Question patterns
        if (input.includes('?')) {
            patterns.push({
                type: 'question',
                context: this.extractQuestionType(input),
                complexity: this.assessComplexity(input)
            });
        }
        
        // Command patterns
        if (/^(create|make|build|generate|show|explain)/i.test(input)) {
            patterns.push({
                type: 'command',
                context: this.extractCommandType(input),
                complexity: this.assessComplexity(input)
            });
        }
        
        // Topic patterns
        const topics = this.extractTopics(input);
        topics.forEach(topic => {
            patterns.push({
                type: 'topic',
                context: topic,
                complexity: this.assessComplexity(input)
            });
        });
        
        return patterns;
    }

    async analyzeResponse(response) {
        const patterns = [];
        
        // Length patterns
        patterns.push({
            type: 'response_length',
            context: this.categorizeLength(response.length),
            complexity: 'medium'
        });
        
        // Structure patterns
        if (response.includes('**') || response.includes('```')) {
            patterns.push({
                type: 'formatted_response',
                context: 'structured',
                complexity: 'medium'
            });
        }
        
        return patterns;
    }

    async analyzeTemporalPatterns(interaction) {
        const patterns = [];
        const now = Date.now();
        const hour = new Date(now).getHours();
        
        patterns.push({
            type: 'time_of_day',
            context: this.categorizeTimeOfDay(hour),
            complexity: 'low'
        });
        
        return patterns;
    }

    extractQuestionType(input) {
        if (input.toLowerCase().startsWith('how')) return 'how_to';
        if (input.toLowerCase().startsWith('what')) return 'definition';
        if (input.toLowerCase().startsWith('why')) return 'explanation';
        if (input.toLowerCase().startsWith('when')) return 'timing';
        if (input.toLowerCase().startsWith('where')) return 'location';
        return 'general_question';
    }

    extractCommandType(input) {
        const lowerInput = input.toLowerCase();
        if (lowerInput.startsWith('create') || lowerInput.startsWith('make')) return 'creation';
        if (lowerInput.startsWith('explain') || lowerInput.startsWith('show')) return 'explanation';
        if (lowerInput.startsWith('analyze') || lowerInput.startsWith('review')) return 'analysis';
        return 'general_command';
    }

    categorizeLength(length) {
        if (length < 100) return 'short';
        if (length < 500) return 'medium';
        return 'long';
    }

    categorizeTimeOfDay(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    assessComplexity(text) {
        const complexityIndicators = [
            /technical|advanced|complex|sophisticated/i,
            text.split(' ').length > 20,
            (text.match(/[,;:]/g) || []).length > 3,
            /\b(algorithm|implementation|architecture|optimization)\b/i
        ];
        
        const score = complexityIndicators.filter(indicator => 
            typeof indicator === 'boolean' ? indicator : indicator.test(text)
        ).length;
        
        if (score >= 3) return 'high';
        if (score >= 1) return 'medium';
        return 'low';
    }

    extractTopics(text) {
        const topics = [];
        const topicPatterns = {
            'programming': /code|program|function|class|algorithm|debug/i,
            'web_development': /web|html|css|javascript|react|vue|angular/i,
            'data_science': /data|analysis|machine learning|ai|statistics/i,
            'system_admin': /server|network|security|deployment|docker/i,
            'database': /database|sql|nosql|mongodb|postgresql|mysql/i,
            'mobile_dev': /mobile|android|ios|react native|flutter/i
        };

        for (const [topic, pattern] of Object.entries(topicPatterns)) {
            if (pattern.test(text)) {
                topics.push(topic);
            }
        }

        return topics;
    }
}

class FeedbackProcessor {
    constructor() {
        this.feedbackHistory = [];
        this.improvementSuggestions = new Map();
    }

    async processFeedback(interaction, feedback) {
        const feedbackEntry = {
            interactionId: interaction.id,
            feedback,
            timestamp: Date.now(),
            context: interaction.context,
            topics: interaction.topics
        };
        
        this.feedbackHistory.push(feedbackEntry);
        
        // Analyze feedback patterns
        await this.analyzeFeedbackPatterns(feedbackEntry);
        
        // Generate improvement suggestions
        await this.generateImprovementSuggestions(feedbackEntry);
        
        return feedbackEntry;
    }

    async analyzeFeedbackPatterns(feedbackEntry) {
        // Analyze recent feedback for patterns
        const recentFeedback = this.feedbackHistory.slice(-10);
        const negativeCount = recentFeedback.filter(f => f.feedback === 'negative').length;
        
        if (negativeCount >= 3) {
            // Pattern of negative feedback detected
            this.generatePatternAlert('negative_trend', recentFeedback);
        }
        
        // Analyze topic-specific feedback
        const topicFeedback = this.feedbackHistory.filter(f => 
            f.topics.some(topic => feedbackEntry.topics.includes(topic))
        );
        
        if (topicFeedback.length >= 5) {
            const successRate = topicFeedback.filter(f => f.feedback === 'positive').length / topicFeedback.length;
            
            if (successRate < 0.6) {
                this.generatePatternAlert('topic_difficulty', {
                    topics: feedbackEntry.topics,
                    successRate,
                    suggestions: this.generateTopicImprovements(feedbackEntry.topics)
                });
            }
        }
    }

    async generateImprovementSuggestions(feedbackEntry) {
        if (feedbackEntry.feedback === 'negative') {
            const suggestions = [];
            
            // Analyze what went wrong
            if (feedbackEntry.context.responseLength > 1000) {
                suggestions.push('Consider providing more concise responses');
            }
            
            if (feedbackEntry.topics.length > 3) {
                suggestions.push('Focus on fewer topics per response');
            }
            
            suggestions.push('Ask for clarification to better understand user needs');
            
            this.improvementSuggestions.set(feedbackEntry.interactionId, suggestions);
        }
    }

    generatePatternAlert(type, data) {
        console.log(`Pattern Alert: ${type}`, data);
        // In a real implementation, this would trigger system improvements
    }

    generateTopicImprovements(topics) {
        return topics.map(topic => ({
            topic,
            suggestions: [
                'Provide more examples',
                'Break down complex concepts',
                'Ask follow-up questions',
                'Offer alternative explanations'
            ]
        }));
    }

    getFeedbackStats() {
        const total = this.feedbackHistory.length;
        const positive = this.feedbackHistory.filter(f => f.feedback === 'positive').length;
        const negative = this.feedbackHistory.filter(f => f.feedback === 'negative').length;
        
        return {
            total,
            positive,
            negative,
            positiveRate: total > 0 ? positive / total : 0,
            recentTrend: this.calculateRecentTrend()
        };
    }

    calculateRecentTrend() {
        const recent = this.feedbackHistory.slice(-10);
        if (recent.length < 5) return 'insufficient_data';
        
        const recentPositive = recent.filter(f => f.feedback === 'positive').length;
        const recentRate = recentPositive / recent.length;
        
        if (recentRate > 0.7) return 'improving';
        if (recentRate < 0.4) return 'declining';
        return 'stable';
    }
}

class ContextualLearning {
    constructor() {
        this.contextualPatterns = new Map();
        this.sessionContexts = [];
    }

    async processContext(interaction) {
        // Build session context
        this.sessionContexts.push({
            timestamp: Date.now(),
            topics: interaction.topics,
            complexity: interaction.complexity,
            sentiment: interaction.sentiment
        });
        
        // Keep only recent contexts
        if (this.sessionContexts.length > 20) {
            this.sessionContexts.shift();
        }
        
        // Analyze contextual patterns
        await this.analyzeContextualPatterns();
    }

    async analyzeContextualPatterns() {
        if (this.sessionContexts.length < 3) return;
        
        // Look for topic transitions
        const topicTransitions = this.analyzeTopicTransitions();
        
        // Look for complexity progressions
        const complexityProgressions = this.analyzeComplexityProgressions();
        
        // Store patterns for future use
        this.storeContextualPatterns(topicTransitions, complexityProgressions);
    }

    analyzeTopicTransitions() {
        const transitions = [];
        
        for (let i = 1; i < this.sessionContexts.length; i++) {
            const prev = this.sessionContexts[i - 1];
            const curr = this.sessionContexts[i];
            
            if (prev.topics.length > 0 && curr.topics.length > 0) {
                transitions.push({
                    from: prev.topics,
                    to: curr.topics,
                    timeGap: curr.timestamp - prev.timestamp
                });
            }
        }
        
        return transitions;
    }

    analyzeComplexityProgressions() {
        const progressions = [];
        
        for (let i = 1; i < this.sessionContexts.length; i++) {
            const prev = this.sessionContexts[i - 1];
            const curr = this.sessionContexts[i];
            
            if (prev.complexity !== curr.complexity) {
                progressions.push({
                    from: prev.complexity,
                    to: curr.complexity,
                    direction: this.getComplexityDirection(prev.complexity, curr.complexity)
                });
            }
        }
        
        return progressions;
    }

    getComplexityDirection(from, to) {
        const levels = { 'low': 1, 'medium': 2, 'high': 3 };
        const fromLevel = levels[from] || 2;
        const toLevel = levels[to] || 2;
        
        if (toLevel > fromLevel) return 'increasing';
        if (toLevel < fromLevel) return 'decreasing';
        return 'stable';
    }

    storeContextualPatterns(transitions, progressions) {
        // Store common transition patterns
        transitions.forEach(transition => {
            const key = `${transition.from.join('_')}_to_${transition.to.join('_')}`;
            
            if (!this.contextualPatterns.has(key)) {
                this.contextualPatterns.set(key, { count: 0, avgTimeGap: 0 });
            }
            
            const pattern = this.contextualPatterns.get(key);
            pattern.count++;
            pattern.avgTimeGap = (pattern.avgTimeGap + transition.timeGap) / 2;
        });
        
        // Store complexity progression patterns
        progressions.forEach(progression => {
            const key = `complexity_${progression.from}_to_${progression.to}`;
            
            if (!this.contextualPatterns.has(key)) {
                this.contextualPatterns.set(key, { count: 0, direction: progression.direction });
            }
            
            this.contextualPatterns.get(key).count++;
        });
    }

    predictNextContext(currentContext) {
        // Predict likely next topics based on patterns
        const currentTopics = currentContext.topics.join('_');
        const relevantPatterns = [];
        
        for (const [key, pattern] of this.contextualPatterns) {
            if (key.startsWith(currentTopics + '_to_')) {
                relevantPatterns.push({
                    nextTopics: key.split('_to_')[1].split('_'),
                    likelihood: pattern.count,
                    pattern
                });
            }
        }
        
        return relevantPatterns.sort((a, b) => b.likelihood - a.likelihood);
    }

    getContextualInsights() {
        return {
            totalPatterns: this.contextualPatterns.size,
            sessionLength: this.sessionContexts.length,
            commonTransitions: this.getTopPatterns('transition'),
            complexityTrends: this.getTopPatterns('complexity')
        };
    }

    getTopPatterns(type, limit = 5) {
        const patterns = [];
        
        for (const [key, pattern] of this.contextualPatterns) {
            if ((type === 'transition' && key.includes('_to_')) ||
                (type === 'complexity' && key.startsWith('complexity_'))) {
                patterns.push({ key, ...pattern });
            }
        }
        
        return patterns
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
}