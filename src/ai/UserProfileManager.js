export class UserProfileManager {
    constructor() {
        this.profiles = new Map();
        this.currentUserId = 'default';
        this.profileAnalyzer = new ProfileAnalyzer();
        this.behaviorTracker = new BehaviorTracker();
        this.preferenceEngine = new PreferenceEngine();
    }

    async createUserProfile(userId = 'default') {
        const profile = {
            id: userId,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            
            // Communication preferences
            communication: {
                style: 'balanced', // formal, casual, balanced
                tone: 'helpful', // professional, friendly, helpful, technical
                detailLevel: 'medium', // brief, medium, detailed
                responseLength: 'medium', // short, medium, long
                useExamples: true,
                preferredFormat: 'structured' // structured, conversational, bullet_points
            },
            
            // Learning preferences
            learning: {
                pace: 'medium', // slow, medium, fast
                style: 'mixed', // visual, auditory, kinesthetic, mixed
                complexity: 'adaptive', // beginner, intermediate, advanced, adaptive
                feedbackFrequency: 'moderate', // minimal, moderate, frequent
                explanationDepth: 'medium' // surface, medium, deep
            },
            
            // Domain expertise
            expertise: {
                areas: new Map(), // topic -> level (0-10)
                interests: [],
                goals: [],
                currentFocus: null,
                learningPath: []
            },
            
            // Behavioral patterns
            behavior: {
                sessionPatterns: [],
                interactionFrequency: new Map(), // time_of_day -> frequency
                topicProgression: [],
                questionTypes: new Map(), // type -> count
                successPatterns: [],
                challengeAreas: []
            },
            
            // Personalization data
            personalization: {
                customResponses: new Map(),
                adaptiveTemplates: new Map(),
                contextualMemory: [],
                relationshipGraph: new Map(),
                personalizedExamples: new Map()
            },
            
            // Performance metrics
            metrics: {
                totalInteractions: 0,
                averageSessionLength: 0,
                satisfactionScore: 0,
                learningProgress: new Map(),
                goalAchievements: [],
                improvementAreas: []
            }
        };
        
        this.profiles.set(userId, profile);
        await this.saveProfile(userId);
        return profile;
    }

    async updateProfile(userId, interaction, feedback = null) {
        let profile = this.profiles.get(userId);
        
        if (!profile) {
            profile = await this.createUserProfile(userId);
        }
        
        // Update last updated timestamp
        profile.lastUpdated = new Date().toISOString();
        
        // Update metrics
        profile.metrics.totalInteractions++;
        
        // Analyze and update communication preferences
        await this.updateCommunicationPreferences(profile, interaction);
        
        // Update expertise levels
        await this.updateExpertise(profile, interaction);
        
        // Track behavioral patterns
        await this.updateBehaviorPatterns(profile, interaction);
        
        // Process feedback if provided
        if (feedback) {
            await this.processFeedback(profile, interaction, feedback);
        }
        
        // Update personalization data
        await this.updatePersonalization(profile, interaction);
        
        // Save updated profile
        await this.saveProfile(userId);
        
        return profile;
    }

    async updateCommunicationPreferences(profile, interaction) {
        const analyzer = this.profileAnalyzer;
        
        // Analyze user's communication style from input
        const detectedStyle = analyzer.analyzeCommunicationStyle(interaction.input);
        if (detectedStyle && detectedStyle !== profile.communication.style) {
            profile.communication.style = detectedStyle;
        }
        
        // Analyze preferred detail level
        const detailPreference = analyzer.analyzeDetailPreference(interaction.input);
        if (detailPreference) {
            profile.communication.detailLevel = detailPreference;
        }
        
        // Analyze response length preference based on engagement
        const responseLength = interaction.response?.length || 0;
        if (responseLength > 0) {
            const engagement = this.assessEngagement(interaction);
            this.updateLengthPreference(profile, responseLength, engagement);
        }
        
        // Update format preference
        const formatPreference = analyzer.analyzeFormatPreference(interaction.input);
        if (formatPreference) {
            profile.communication.preferredFormat = formatPreference;
        }
    }

    async updateExpertise(profile, interaction) {
        const topics = interaction.topics || [];
        
        topics.forEach(topic => {
            const currentLevel = profile.expertise.areas.get(topic) || 0;
            const complexity = this.mapComplexityToLevel(interaction.complexity);
            
            // Increase expertise based on successful interactions
            const increment = this.calculateExpertiseIncrement(interaction, complexity);
            const newLevel = Math.min(10, currentLevel + increment);
            
            profile.expertise.areas.set(topic, newLevel);
        });
        
        // Update interests based on repeated topics
        this.updateInterests(profile, topics);
        
        // Update current focus
        this.updateCurrentFocus(profile, topics);
    }

    async updateBehaviorPatterns(profile, interaction) {
        const behavior = profile.behavior;
        
        // Track session patterns
        const sessionInfo = {
            timestamp: interaction.timestamp,
            duration: interaction.duration || 0,
            topics: interaction.topics,
            complexity: interaction.complexity,
            satisfaction: interaction.feedback === 'positive' ? 1 : 0
        };
        
        behavior.sessionPatterns.push(sessionInfo);
        
        // Keep only recent sessions (last 100)
        if (behavior.sessionPatterns.length > 100) {
            behavior.sessionPatterns.shift();
        }
        
        // Update interaction frequency by time of day
        const hour = new Date(interaction.timestamp).getHours();
        const timeSlot = this.getTimeSlot(hour);
        const currentFreq = behavior.interactionFrequency.get(timeSlot) || 0;
        behavior.interactionFrequency.set(timeSlot, currentFreq + 1);
        
        // Track question types
        const questionType = this.classifyQuestionType(interaction.input);
        const currentCount = behavior.questionTypes.get(questionType) || 0;
        behavior.questionTypes.set(questionType, currentCount + 1);
        
        // Update topic progression
        this.updateTopicProgression(behavior, interaction.topics);
    }

    async processFeedback(profile, interaction, feedback) {
        const metrics = profile.metrics;
        
        // Update satisfaction score
        const feedbackScore = this.mapFeedbackToScore(feedback);
        const totalInteractions = metrics.totalInteractions;
        const currentSatisfaction = metrics.satisfactionScore;
        
        metrics.satisfactionScore = (currentSatisfaction * (totalInteractions - 1) + feedbackScore) / totalInteractions;
        
        // Track successful patterns
        if (feedback === 'positive') {
            const pattern = {
                topics: interaction.topics,
                complexity: interaction.complexity,
                responseLength: interaction.response?.length || 0,
                format: this.detectResponseFormat(interaction.response),
                timestamp: interaction.timestamp
            };
            
            profile.behavior.successPatterns.push(pattern);
        } else if (feedback === 'negative') {
            // Track challenge areas
            const challenge = {
                topics: interaction.topics,
                issue: this.identifyIssue(interaction, feedback),
                timestamp: interaction.timestamp
            };
            
            profile.behavior.challengeAreas.push(challenge);
        }
    }

    async updatePersonalization(profile, interaction) {
        const personalization = profile.personalization;
        
        // Update contextual memory
        const contextEntry = {
            input: interaction.input,
            response: interaction.response,
            topics: interaction.topics,
            timestamp: interaction.timestamp,
            success: interaction.feedback === 'positive'
        };
        
        personalization.contextualMemory.push(contextEntry);
        
        // Keep only recent context (last 50 interactions)
        if (personalization.contextualMemory.length > 50) {
            personalization.contextualMemory.shift();
        }
        
        // Update relationship graph
        this.updateRelationshipGraph(personalization, interaction);
        
        // Generate personalized examples
        await this.generatePersonalizedExamples(personalization, interaction);
    }

    updateRelationshipGraph(personalization, interaction) {
        const topics = interaction.topics || [];
        
        // Create relationships between topics discussed in the same interaction
        for (let i = 0; i < topics.length; i++) {
            for (let j = i + 1; j < topics.length; j++) {
                const key = `${topics[i]}_${topics[j]}`;
                const currentStrength = personalization.relationshipGraph.get(key) || 0;
                personalization.relationshipGraph.set(key, currentStrength + 1);
            }
        }
    }

    async generatePersonalizedExamples(personalization, interaction) {
        const topics = interaction.topics || [];
        
        topics.forEach(topic => {
            if (!personalization.personalizedExamples.has(topic)) {
                personalization.personalizedExamples.set(topic, []);
            }
            
            const examples = personalization.personalizedExamples.get(topic);
            
            // Extract examples from successful interactions
            if (interaction.feedback === 'positive' && interaction.response) {
                const extractedExamples = this.extractExamples(interaction.response);
                examples.push(...extractedExamples);
                
                // Keep only the most recent examples
                if (examples.length > 10) {
                    examples.splice(0, examples.length - 10);
                }
            }
        });
    }

    // Utility methods
    mapComplexityToLevel(complexity) {
        const mapping = { 'low': 2, 'medium': 5, 'high': 8 };
        return mapping[complexity] || 5;
    }

    calculateExpertiseIncrement(interaction, complexity) {
        let increment = 0.1;
        
        if (interaction.feedback === 'positive') increment *= 1.5;
        if (complexity > 6) increment *= 1.2;
        if (interaction.topics?.length === 1) increment *= 1.1; // Focused interaction
        
        return increment;
    }

    updateInterests(profile, topics) {
        const interests = profile.expertise.interests;
        
        topics.forEach(topic => {
            const topicLevel = profile.expertise.areas.get(topic) || 0;
            
            if (topicLevel >= 3 && !interests.includes(topic)) {
                interests.push(topic);
            }
        });
        
        // Keep interests list manageable
        if (interests.length > 20) {
            interests.splice(0, interests.length - 20);
        }
    }

    updateCurrentFocus(profile, topics) {
        if (topics.length === 1) {
            profile.expertise.currentFocus = topics[0];
        } else if (topics.length > 1) {
            // Find the topic with highest expertise level
            let maxLevel = 0;
            let focusTopic = null;
            
            topics.forEach(topic => {
                const level = profile.expertise.areas.get(topic) || 0;
                if (level > maxLevel) {
                    maxLevel = level;
                    focusTopic = topic;
                }
            });
            
            profile.expertise.currentFocus = focusTopic;
        }
    }

    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    classifyQuestionType(input) {
        const lowerInput = input.toLowerCase();
        
        if (lowerInput.startsWith('how')) return 'how_to';
        if (lowerInput.startsWith('what')) return 'definition';
        if (lowerInput.startsWith('why')) return 'explanation';
        if (lowerInput.startsWith('when')) return 'timing';
        if (lowerInput.startsWith('where')) return 'location';
        if (lowerInput.includes('create') || lowerInput.includes('make')) return 'creation';
        if (lowerInput.includes('explain') || lowerInput.includes('describe')) return 'explanation';
        
        return 'general';
    }

    updateTopicProgression(behavior, topics) {
        if (topics.length === 0) return;
        
        const progression = behavior.topicProgression;
        const lastEntry = progression[progression.length - 1];
        
        if (!lastEntry || !this.arraysEqual(lastEntry.topics, topics)) {
            progression.push({
                topics: [...topics],
                timestamp: Date.now(),
                sequence: progression.length
            });
            
            // Keep only recent progression (last 50 entries)
            if (progression.length > 50) {
                progression.shift();
            }
        }
    }

    arraysEqual(arr1, arr2) {
        return arr1.length === arr2.length && arr1.every((val, i) => val === arr2[i]);
    }

    mapFeedbackToScore(feedback) {
        const mapping = {
            'very_positive': 1.0,
            'positive': 0.8,
            'neutral': 0.5,
            'negative': 0.2,
            'very_negative': 0.0
        };
        return mapping[feedback] || 0.5;
    }

    identifyIssue(interaction, feedback) {
        // Simple issue identification - in a real system, this would be more sophisticated
        if (interaction.response?.length > 1000) return 'too_verbose';
        if (interaction.response?.length < 50) return 'too_brief';
        if (interaction.complexity === 'high') return 'too_complex';
        if (interaction.complexity === 'low') return 'too_simple';
        return 'unclear_response';
    }

    detectResponseFormat(response) {
        if (!response) return 'plain';
        
        if (response.includes('**') && response.includes('\n')) return 'structured';
        if (response.includes('```')) return 'code_included';
        if (response.includes('•') || response.includes('-')) return 'bullet_points';
        if (response.includes('1.') || response.includes('2.')) return 'numbered_list';
        
        return 'conversational';
    }

    extractExamples(response) {
        const examples = [];
        
        // Extract code examples
        const codeMatches = response.match(/```[\s\S]*?```/g);
        if (codeMatches) {
            examples.push(...codeMatches.map(match => ({ type: 'code', content: match })));
        }
        
        // Extract bullet point examples
        const bulletMatches = response.match(/^[•\-]\s+.+$/gm);
        if (bulletMatches) {
            examples.push(...bulletMatches.map(match => ({ type: 'bullet', content: match })));
        }
        
        return examples;
    }

    updateLengthPreference(profile, responseLength, engagement) {
        const communication = profile.communication;
        
        // Adjust preference based on engagement with different lengths
        if (engagement > 0.7) {
            if (responseLength < 200) {
                communication.responseLength = 'short';
            } else if (responseLength > 800) {
                communication.responseLength = 'long';
            } else {
                communication.responseLength = 'medium';
            }
        }
    }

    assessEngagement(interaction) {
        let engagement = 0.5; // Base engagement
        
        if (interaction.feedback === 'positive') engagement += 0.3;
        if (interaction.feedback === 'negative') engagement -= 0.3;
        if (interaction.followUpQuestions > 0) engagement += 0.2;
        if (interaction.duration > 30000) engagement += 0.1; // Long interaction
        
        return Math.max(0, Math.min(1, engagement));
    }

    async getPersonalizedRecommendations(userId) {
        const profile = this.profiles.get(userId);
        if (!profile) return [];
        
        const recommendations = [];
        
        // Learning recommendations based on expertise gaps
        const expertiseAreas = Array.from(profile.expertise.areas.entries());
        const beginnerAreas = expertiseAreas.filter(([topic, level]) => level < 3);
        
        beginnerAreas.forEach(([topic, level]) => {
            recommendations.push({
                type: 'learning',
                topic,
                suggestion: `Consider exploring ${topic} fundamentals to build stronger foundation`,
                priority: 'medium'
            });
        });
        
        // Communication recommendations
        if (profile.metrics.satisfactionScore < 0.6) {
            recommendations.push({
                type: 'communication',
                suggestion: 'Try adjusting response detail level or format preferences',
                priority: 'high'
            });
        }
        
        // Goal recommendations
        const interests = profile.expertise.interests;
        const currentFocus = profile.expertise.currentFocus;
        
        if (interests.length > 0 && !currentFocus) {
            recommendations.push({
                type: 'focus',
                suggestion: `Consider focusing on ${interests[0]} to deepen your expertise`,
                priority: 'medium'
            });
        }
        
        return recommendations;
    }

    async saveProfile(userId) {
        const profile = this.profiles.get(userId);
        if (profile) {
            // Convert Maps to Objects for JSON serialization
            const serializable = this.makeSerializable(profile);
            localStorage.setItem(`jarvis_profile_${userId}`, JSON.stringify(serializable));
        }
    }

    async loadProfile(userId) {
        try {
            const data = localStorage.getItem(`jarvis_profile_${userId}`);
            if (data) {
                const parsed = JSON.parse(data);
                const profile = this.makeDeserializable(parsed);
                this.profiles.set(userId, profile);
                return profile;
            }
        } catch (error) {
            console.warn(`Failed to load profile for ${userId}:`, error);
        }
        return null;
    }

    makeSerializable(profile) {
        const serializable = { ...profile };
        
        // Convert Maps to Objects
        serializable.expertise.areas = Object.fromEntries(profile.expertise.areas);
        serializable.behavior.interactionFrequency = Object.fromEntries(profile.behavior.interactionFrequency);
        serializable.behavior.questionTypes = Object.fromEntries(profile.behavior.questionTypes);
        serializable.metrics.learningProgress = Object.fromEntries(profile.metrics.learningProgress);
        serializable.personalization.customResponses = Object.fromEntries(profile.personalization.customResponses);
        serializable.personalization.adaptiveTemplates = Object.fromEntries(profile.personalization.adaptiveTemplates);
        serializable.personalization.relationshipGraph = Object.fromEntries(profile.personalization.relationshipGraph);
        serializable.personalization.personalizedExamples = Object.fromEntries(profile.personalization.personalizedExamples);
        
        return serializable;
    }

    makeDeserializable(data) {
        const profile = { ...data };
        
        // Convert Objects back to Maps
        profile.expertise.areas = new Map(Object.entries(data.expertise.areas));
        profile.behavior.interactionFrequency = new Map(Object.entries(data.behavior.interactionFrequency));
        profile.behavior.questionTypes = new Map(Object.entries(data.behavior.questionTypes));
        profile.metrics.learningProgress = new Map(Object.entries(data.metrics.learningProgress));
        profile.personalization.customResponses = new Map(Object.entries(data.personalization.customResponses));
        profile.personalization.adaptiveTemplates = new Map(Object.entries(data.personalization.adaptiveTemplates));
        profile.personalization.relationshipGraph = new Map(Object.entries(data.personalization.relationshipGraph));
        profile.personalization.personalizedExamples = new Map(Object.entries(data.personalization.personalizedExamples));
        
        return profile;
    }

    getProfileStats(userId) {
        const profile = this.profiles.get(userId);
        if (!profile) return null;
        
        return {
            totalInteractions: profile.metrics.totalInteractions,
            satisfactionScore: profile.metrics.satisfactionScore,
            expertiseAreas: profile.expertise.areas.size,
            interests: profile.expertise.interests.length,
            currentFocus: profile.expertise.currentFocus,
            communicationStyle: profile.communication.style,
            preferredDetailLevel: profile.communication.detailLevel,
            successPatterns: profile.behavior.successPatterns.length,
            challengeAreas: profile.behavior.challengeAreas.length
        };
    }
}

class ProfileAnalyzer {
    analyzeCommunicationStyle(input) {
        const formalIndicators = /please|would you|could you|thank you|sincerely|kindly/i;
        const casualIndicators = /hey|hi|what's up|cool|awesome|yeah|ok|gonna/i;
        
        const formalCount = (input.match(formalIndicators) || []).length;
        const casualCount = (input.match(casualIndicators) || []).length;
        
        if (formalCount > casualCount) return 'formal';
        if (casualCount > formalCount) return 'casual';
        return 'balanced';
    }

    analyzeDetailPreference(input) {
        if (/detailed|comprehensive|thorough|in-depth|complete|full/i.test(input)) {
            return 'detailed';
        }
        if (/brief|summary|quick|short|concise|simple/i.test(input)) {
            return 'brief';
        }
        return 'medium';
    }

    analyzeFormatPreference(input) {
        if (/list|bullet|points|steps|numbered/i.test(input)) {
            return 'bullet_points';
        }
        if (/structure|organize|format|sections/i.test(input)) {
            return 'structured';
        }
        return 'conversational';
    }
}

class BehaviorTracker {
    constructor() {
        this.sessionData = [];
        this.patterns = new Map();
    }

    trackSession(userId, sessionInfo) {
        this.sessionData.push({
            userId,
            ...sessionInfo,
            timestamp: Date.now()
        });
        
        this.analyzePatterns(userId);
    }

    analyzePatterns(userId) {
        const userSessions = this.sessionData.filter(s => s.userId === userId);
        
        // Analyze time patterns
        const timePatterns = this.analyzeTimePatterns(userSessions);
        
        // Analyze topic patterns
        const topicPatterns = this.analyzeTopicPatterns(userSessions);
        
        // Store patterns
        this.patterns.set(userId, {
            time: timePatterns,
            topics: topicPatterns,
            lastAnalyzed: Date.now()
        });
    }

    analyzeTimePatterns(sessions) {
        const timeSlots = new Map();
        
        sessions.forEach(session => {
            const hour = new Date(session.timestamp).getHours();
            const slot = this.getTimeSlot(hour);
            
            timeSlots.set(slot, (timeSlots.get(slot) || 0) + 1);
        });
        
        return timeSlots;
    }

    analyzeTopicPatterns(sessions) {
        const topicFrequency = new Map();
        const topicTransitions = new Map();
        
        sessions.forEach((session, index) => {
            // Count topic frequency
            session.topics?.forEach(topic => {
                topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
            });
            
            // Track topic transitions
            if (index > 0 && sessions[index - 1].topics && session.topics) {
                const prevTopics = sessions[index - 1].topics;
                const currTopics = session.topics;
                
                prevTopics.forEach(prevTopic => {
                    currTopics.forEach(currTopic => {
                        if (prevTopic !== currTopic) {
                            const transition = `${prevTopic}_to_${currTopic}`;
                            topicTransitions.set(transition, (topicTransitions.get(transition) || 0) + 1);
                        }
                    });
                });
            }
        });
        
        return {
            frequency: topicFrequency,
            transitions: topicTransitions
        };
    }

    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    getBehaviorInsights(userId) {
        const patterns = this.patterns.get(userId);
        if (!patterns) return null;
        
        return {
            mostActiveTime: this.getMostActiveTime(patterns.time),
            favoriteTopics: this.getFavoriteTopics(patterns.topics.frequency),
            commonTransitions: this.getCommonTransitions(patterns.topics.transitions),
            sessionCount: this.sessionData.filter(s => s.userId === userId).length
        };
    }

    getMostActiveTime(timePatterns) {
        let maxCount = 0;
        let mostActive = 'morning';
        
        for (const [slot, count] of timePatterns) {
            if (count > maxCount) {
                maxCount = count;
                mostActive = slot;
            }
        }
        
        return mostActive;
    }

    getFavoriteTopics(topicFrequency, limit = 5) {
        return Array.from(topicFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([topic, count]) => ({ topic, count }));
    }

    getCommonTransitions(transitions, limit = 3) {
        return Array.from(transitions.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([transition, count]) => ({ transition, count }));
    }
}

class PreferenceEngine {
    constructor() {
        this.preferences = new Map();
        this.adaptationRules = new Map();
    }

    updatePreferences(userId, interaction, feedback) {
        if (!this.preferences.has(userId)) {
            this.preferences.set(userId, {
                responseStyle: new Map(),
                contentType: new Map(),
                complexity: new Map(),
                examples: new Map()
            });
        }
        
        const userPrefs = this.preferences.get(userId);
        
        // Update based on positive feedback
        if (feedback === 'positive') {
            this.reinforcePreferences(userPrefs, interaction);
        } else if (feedback === 'negative') {
            this.adjustPreferences(userPrefs, interaction);
        }
    }

    reinforcePreferences(userPrefs, interaction) {
        // Reinforce successful patterns
        const responseStyle = this.detectResponseStyle(interaction.response);
        userPrefs.responseStyle.set(responseStyle, (userPrefs.responseStyle.get(responseStyle) || 0) + 1);
        
        const complexity = interaction.complexity;
        userPrefs.complexity.set(complexity, (userPrefs.complexity.get(complexity) || 0) + 1);
        
        const hasExamples = this.hasExamples(interaction.response);
        userPrefs.examples.set(hasExamples, (userPrefs.examples.get(hasExamples) || 0) + 1);
    }

    adjustPreferences(userPrefs, interaction) {
        // Reduce preference for unsuccessful patterns
        const responseStyle = this.detectResponseStyle(interaction.response);
        const currentCount = userPrefs.responseStyle.get(responseStyle) || 0;
        userPrefs.responseStyle.set(responseStyle, Math.max(0, currentCount - 1));
    }

    detectResponseStyle(response) {
        if (!response) return 'plain';
        
        if (response.includes('**') && response.includes('\n')) return 'structured';
        if (response.includes('```')) return 'technical';
        if (response.length > 800) return 'detailed';
        if (response.length < 200) return 'concise';
        
        return 'conversational';
    }

    hasExamples(response) {
        return response && (
            response.includes('example') ||
            response.includes('for instance') ||
            response.includes('```') ||
            response.includes('e.g.')
        );
    }

    getPreferredStyle(userId) {
        const userPrefs = this.preferences.get(userId);
        if (!userPrefs) return null;
        
        return {
            responseStyle: this.getTopPreference(userPrefs.responseStyle),
            complexity: this.getTopPreference(userPrefs.complexity),
            includeExamples: this.getTopPreference(userPrefs.examples)
        };
    }

    getTopPreference(preferenceMap) {
        let maxCount = 0;
        let topPreference = null;
        
        for (const [pref, count] of preferenceMap) {
            if (count > maxCount) {
                maxCount = count;
                topPreference = pref;
            }
        }
        
        return topPreference;
    }
}