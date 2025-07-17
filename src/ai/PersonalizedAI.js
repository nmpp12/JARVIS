export class PersonalizedAI {
    constructor() {
        this.userProfile = new Map();
        this.interactionHistory = [];
        this.personalizedResponses = new Map();
        this.learningPatterns = new Map();
        this.preferences = new Map();
        this.contextualMemory = [];
        this.adaptationEngine = new AdaptationEngine();
        this.knowledgeGraph = new PersonalKnowledgeGraph();
        
        this.initializePersonalization();
    }

    initializePersonalization() {
        // Load existing personalization data from localStorage
        this.loadPersonalizationData();
        
        // Initialize user profile categories
        this.userProfile.set('communication_style', 'balanced'); // formal, casual, balanced
        this.userProfile.set('detail_level', 'medium'); // brief, medium, detailed
        this.userProfile.set('expertise_areas', []);
        this.userProfile.set('learning_goals', []);
        this.userProfile.set('preferred_examples', 'practical'); // theoretical, practical, mixed
        this.userProfile.set('response_tone', 'helpful'); // professional, friendly, helpful, technical
    }

    async processInteraction(input, response, feedback = null) {
        const interaction = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            input,
            response,
            feedback,
            context: this.getCurrentContext(),
            topics: this.extractTopics(input),
            sentiment: this.analyzeSentiment(input),
            complexity: this.assessComplexity(input)
        };

        this.interactionHistory.push(interaction);
        
        // Update user profile based on interaction
        await this.updateUserProfile(interaction);
        
        // Learn from the interaction
        await this.learnFromInteraction(interaction);
        
        // Update knowledge graph
        this.knowledgeGraph.addInteraction(interaction);
        
        // Adapt future responses
        this.adaptationEngine.processInteraction(interaction);
        
        // Save personalization data
        this.savePersonalizationData();
        
        return interaction;
    }

    async generatePersonalizedResponse(input, baseResponse, context = {}) {
        const userStyle = this.userProfile.get('communication_style');
        const detailLevel = this.userProfile.get('detail_level');
        const tone = this.userProfile.get('response_tone');
        const expertiseAreas = this.userProfile.get('expertise_areas');
        
        // Adapt response based on user preferences
        let personalizedResponse = await this.adaptResponseStyle(baseResponse, userStyle, tone);
        personalizedResponse = await this.adjustDetailLevel(personalizedResponse, detailLevel);
        personalizedResponse = await this.addPersonalizedExamples(personalizedResponse, input, expertiseAreas);
        personalizedResponse = await this.incorporateUserContext(personalizedResponse, context);
        
        return personalizedResponse;
    }

    async adaptResponseStyle(response, style, tone) {
        const adaptations = {
            formal: {
                helpful: response => this.makeFormal(response),
                professional: response => this.makeProfessional(response),
                technical: response => this.makeTechnical(response)
            },
            casual: {
                friendly: response => this.makeCasual(response),
                helpful: response => this.makeConversational(response)
            },
            balanced: {
                helpful: response => response // Keep as is for balanced style
            }
        };

        const adapter = adaptations[style]?.[tone];
        return adapter ? adapter(response) : response;
    }

    async adjustDetailLevel(response, level) {
        switch (level) {
            case 'brief':
                return this.summarizeResponse(response);
            case 'detailed':
                return this.expandResponse(response);
            default:
                return response;
        }
    }

    async addPersonalizedExamples(response, input, expertiseAreas) {
        const relevantArea = this.findRelevantExpertiseArea(input, expertiseAreas);
        if (relevantArea) {
            const personalizedExample = this.generateContextualExample(input, relevantArea);
            if (personalizedExample) {
                response += `\n\n**Personalized Example (${relevantArea}):**\n${personalizedExample}`;
            }
        }
        return response;
    }

    async updateUserProfile(interaction) {
        // Update communication style based on user's language patterns
        const detectedStyle = this.detectCommunicationStyle(interaction.input);
        if (detectedStyle) {
            this.userProfile.set('communication_style', detectedStyle);
        }

        // Update expertise areas based on topics discussed
        const currentExpertise = this.userProfile.get('expertise_areas');
        const newTopics = interaction.topics.filter(topic => 
            !currentExpertise.includes(topic) && 
            this.getTopicFrequency(topic) >= 3
        );
        
        if (newTopics.length > 0) {
            this.userProfile.set('expertise_areas', [...currentExpertise, ...newTopics]);
        }

        // Update preferred detail level based on feedback patterns
        if (interaction.feedback) {
            this.adjustDetailPreference(interaction.feedback);
        }
    }

    async learnFromInteraction(interaction) {
        const pattern = {
            inputPattern: this.extractPattern(interaction.input),
            responsePattern: this.extractPattern(interaction.response),
            success: this.evaluateSuccess(interaction),
            context: interaction.context
        };

        const patternKey = this.generatePatternKey(pattern.inputPattern);
        
        if (!this.learningPatterns.has(patternKey)) {
            this.learningPatterns.set(patternKey, []);
        }
        
        this.learningPatterns.get(patternKey).push(pattern);
        
        // If we have enough examples, create a personalized response template
        if (this.learningPatterns.get(patternKey).length >= 3) {
            const template = this.createResponseTemplate(this.learningPatterns.get(patternKey));
            this.personalizedResponses.set(patternKey, template);
        }
    }

    extractTopics(input) {
        const topics = [];
        const topicPatterns = {
            'programming': /code|program|function|class|algorithm|debug/i,
            'finance': /money|invest|budget|stock|financial|retirement/i,
            'health': /health|fitness|nutrition|exercise|medical|wellness/i,
            'business': /business|startup|marketing|strategy|entrepreneur/i,
            'education': /learn|study|education|course|skill|training/i,
            'technology': /tech|software|hardware|computer|digital/i,
            'os_development': /kernel|operating system|bootloader|driver|filesystem/i
        };

        for (const [topic, pattern] of Object.entries(topicPatterns)) {
            if (pattern.test(input)) {
                topics.push(topic);
            }
        }

        return topics;
    }

    analyzeSentiment(input) {
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'helpful', 'thanks', 'perfect'];
        const negativeWords = ['bad', 'terrible', 'awful', 'useless', 'wrong', 'error', 'problem'];
        
        const words = input.toLowerCase().split(/\s+/);
        let score = 0;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score += 1;
            if (negativeWords.includes(word)) score -= 1;
        });
        
        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }

    assessComplexity(input) {
        const complexityIndicators = {
            technical_terms: /algorithm|implementation|architecture|optimization|paradigm/i,
            long_sentences: input.split('.').some(sentence => sentence.split(' ').length > 20),
            multiple_questions: (input.match(/\?/g) || []).length > 1,
            specific_details: /specific|detailed|comprehensive|thorough|in-depth/i
        };

        let complexityScore = 0;
        Object.values(complexityIndicators).forEach(indicator => {
            if (typeof indicator === 'boolean' ? indicator : indicator.test(input)) {
                complexityScore++;
            }
        });

        if (complexityScore >= 3) return 'high';
        if (complexityScore >= 1) return 'medium';
        return 'low';
    }

    detectCommunicationStyle(input) {
        const formalIndicators = /please|would you|could you|thank you|sincerely/i;
        const casualIndicators = /hey|hi|what's up|cool|awesome|yeah/i;
        
        if (formalIndicators.test(input)) return 'formal';
        if (casualIndicators.test(input)) return 'casual';
        return 'balanced';
    }

    getTopicFrequency(topic) {
        return this.interactionHistory.filter(interaction => 
            interaction.topics.includes(topic)
        ).length;
    }

    getCurrentContext() {
        const recentInteractions = this.interactionHistory.slice(-5);
        return {
            recentTopics: [...new Set(recentInteractions.flatMap(i => i.topics))],
            averageSentiment: this.calculateAverageSentiment(recentInteractions),
            sessionLength: recentInteractions.length,
            timeSpan: this.calculateTimeSpan(recentInteractions)
        };
    }

    savePersonalizationData() {
        const data = {
            userProfile: Object.fromEntries(this.userProfile),
            interactionHistory: this.interactionHistory.slice(-100), // Keep last 100 interactions
            personalizedResponses: Object.fromEntries(this.personalizedResponses),
            learningPatterns: Object.fromEntries(this.learningPatterns),
            preferences: Object.fromEntries(this.preferences)
        };
        
        localStorage.setItem('jarvis_personalization', JSON.stringify(data));
    }

    loadPersonalizationData() {
        try {
            const data = JSON.parse(localStorage.getItem('jarvis_personalization') || '{}');
            
            if (data.userProfile) {
                this.userProfile = new Map(Object.entries(data.userProfile));
            }
            if (data.interactionHistory) {
                this.interactionHistory = data.interactionHistory;
            }
            if (data.personalizedResponses) {
                this.personalizedResponses = new Map(Object.entries(data.personalizedResponses));
            }
            if (data.learningPatterns) {
                this.learningPatterns = new Map(Object.entries(data.learningPatterns));
            }
            if (data.preferences) {
                this.preferences = new Map(Object.entries(data.preferences));
            }
        } catch (error) {
            console.warn('Failed to load personalization data:', error);
        }
    }

    // Utility methods for response adaptation
    makeFormal(response) {
        return response
            .replace(/\bcan't\b/g, 'cannot')
            .replace(/\bwon't\b/g, 'will not')
            .replace(/\bdon't\b/g, 'do not')
            .replace(/\bi'll\b/g, 'I will')
            .replace(/\byou'll\b/g, 'you will');
    }

    makeCasual(response) {
        return response
            .replace(/\bcannot\b/g, "can't")
            .replace(/\bwill not\b/g, "won't")
            .replace(/\bdo not\b/g, "don't")
            .replace(/\bI will\b/g, "I'll")
            .replace(/\byou will\b/g, "you'll");
    }

    summarizeResponse(response) {
        const sentences = response.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length <= 3) return response;
        
        // Keep first sentence and most important points
        const summary = [sentences[0]];
        const importantSentences = sentences.slice(1).filter(sentence => 
            sentence.includes('important') || 
            sentence.includes('key') || 
            sentence.includes('essential') ||
            sentence.includes('**')
        );
        
        summary.push(...importantSentences.slice(0, 2));
        return summary.join('. ') + '.';
    }

    expandResponse(response) {
        // Add more detailed explanations and examples
        const expanded = response + '\n\n**Additional Details:**\n';
        return expanded + 'For more comprehensive guidance, consider the broader context and implications of this information.';
    }

    getPersonalizationStatus() {
        return {
            interactionCount: this.interactionHistory.length,
            expertiseAreas: this.userProfile.get('expertise_areas'),
            communicationStyle: this.userProfile.get('communication_style'),
            detailLevel: this.userProfile.get('detail_level'),
            personalizedResponsesCount: this.personalizedResponses.size,
            learningPatternsCount: this.learningPatterns.size
        };
    }
}

class AdaptationEngine {
    constructor() {
        this.adaptationRules = new Map();
        this.successMetrics = new Map();
    }

    processInteraction(interaction) {
        this.updateSuccessMetrics(interaction);
        this.adjustAdaptationRules(interaction);
    }

    updateSuccessMetrics(interaction) {
        const key = this.generateMetricKey(interaction);
        if (!this.successMetrics.has(key)) {
            this.successMetrics.set(key, { total: 0, successful: 0 });
        }
        
        const metrics = this.successMetrics.get(key);
        metrics.total++;
        
        if (this.isSuccessfulInteraction(interaction)) {
            metrics.successful++;
        }
    }

    isSuccessfulInteraction(interaction) {
        // Define success criteria
        return interaction.feedback === 'positive' || 
               interaction.sentiment === 'positive' ||
               (interaction.feedback === null && interaction.sentiment !== 'negative');
    }

    generateMetricKey(interaction) {
        return `${interaction.topics.join('_')}_${interaction.complexity}`;
    }

    adjustAdaptationRules(interaction) {
        // Implement rule adjustment logic based on interaction success
        const key = this.generateMetricKey(interaction);
        const metrics = this.successMetrics.get(key);
        
        if (metrics && metrics.total >= 5) {
            const successRate = metrics.successful / metrics.total;
            
            if (successRate < 0.6) {
                // Low success rate - need to adapt
                this.createAdaptationRule(interaction, 'improve');
            } else if (successRate > 0.8) {
                // High success rate - reinforce current approach
                this.createAdaptationRule(interaction, 'reinforce');
            }
        }
    }

    createAdaptationRule(interaction, type) {
        const rule = {
            type,
            context: interaction.context,
            topics: interaction.topics,
            adaptations: this.generateAdaptations(interaction, type)
        };
        
        this.adaptationRules.set(this.generateRuleKey(interaction), rule);
    }

    generateAdaptations(interaction, type) {
        if (type === 'improve') {
            return {
                increaseDetailLevel: true,
                addMoreExamples: true,
                adjustTone: 'more_helpful'
            };
        } else if (type === 'reinforce') {
            return {
                maintainCurrentApproach: true,
                emphasizeSuccessfulPatterns: true
            };
        }
        return {};
    }

    generateRuleKey(interaction) {
        return `${interaction.topics.join('_')}_${interaction.complexity}_${interaction.context.sessionLength}`;
    }
}

class PersonalKnowledgeGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
        this.userConcepts = new Map();
    }

    addInteraction(interaction) {
        // Create nodes for topics and concepts
        interaction.topics.forEach(topic => {
            this.addNode(topic, 'topic', interaction);
        });

        // Extract concepts from input and response
        const concepts = this.extractConcepts(interaction.input + ' ' + interaction.response);
        concepts.forEach(concept => {
            this.addNode(concept, 'concept', interaction);
            
            // Create edges between topics and concepts
            interaction.topics.forEach(topic => {
                this.addEdge(topic, concept, 'relates_to', interaction);
            });
        });
    }

    addNode(id, type, interaction) {
        if (!this.nodes.has(id)) {
            this.nodes.set(id, {
                id,
                type,
                interactions: [],
                strength: 0,
                lastAccessed: null
            });
        }
        
        const node = this.nodes.get(id);
        node.interactions.push(interaction.id);
        node.strength++;
        node.lastAccessed = interaction.timestamp;
    }

    addEdge(from, to, relationship, interaction) {
        const edgeKey = `${from}-${relationship}-${to}`;
        
        if (!this.edges.has(edgeKey)) {
            this.edges.set(edgeKey, {
                from,
                to,
                relationship,
                strength: 0,
                interactions: []
            });
        }
        
        const edge = this.edges.get(edgeKey);
        edge.strength++;
        edge.interactions.push(interaction.id);
    }

    extractConcepts(text) {
        // Simple concept extraction - in a real implementation, this would be more sophisticated
        const concepts = [];
        const conceptPatterns = {
            'machine_learning': /machine learning|ml|neural network|deep learning/i,
            'web_development': /web development|html|css|javascript|react|vue/i,
            'database': /database|sql|nosql|mongodb|postgresql/i,
            'api': /api|rest|graphql|endpoint|microservice/i,
            'security': /security|encryption|authentication|authorization/i
        };

        for (const [concept, pattern] of Object.entries(conceptPatterns)) {
            if (pattern.test(text)) {
                concepts.push(concept);
            }
        }

        return concepts;
    }

    getRelatedConcepts(topic, limit = 5) {
        const related = [];
        
        for (const [edgeKey, edge] of this.edges) {
            if (edge.from === topic || edge.to === topic) {
                const relatedConcept = edge.from === topic ? edge.to : edge.from;
                related.push({
                    concept: relatedConcept,
                    strength: edge.strength,
                    relationship: edge.relationship
                });
            }
        }
        
        return related
            .sort((a, b) => b.strength - a.strength)
            .slice(0, limit);
    }

    getUserExpertise() {
        const expertise = [];
        
        for (const [nodeId, node] of this.nodes) {
            if (node.type === 'topic' && node.strength >= 5) {
                expertise.push({
                    topic: nodeId,
                    strength: node.strength,
                    lastAccessed: node.lastAccessed
                });
            }
        }
        
        return expertise.sort((a, b) => b.strength - a.strength);
    }
}