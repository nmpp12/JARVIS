/**
 * Personality Skill
 * Defines JARVIS's personality, tone, and interaction style
 */

export class PersonalitySkill {
    constructor() {
        this.personality = {
            name: 'JARVIS',
            role: 'AI Assistant',
            traits: [
                'professional',
                'helpful',
                'intelligent',
                'precise',
                'proactive'
            ],
            humor: 3, // 1-5 scale
            formality: 4, // 1-5 scale
            verbosity: 3, // 1-5 scale
            empathy: 4 // 1-5 scale
        };

        this.moods = {
            current: 'neutral',
            available: ['friendly', 'professional', 'casual', 'formal', 'neutral']
        };

        this.responseStyles = {
            concise: 'Brief and to the point',
            detailed: 'Thorough and comprehensive',
            conversational: 'Friendly and engaging',
            technical: 'Precise and technical'
        };

        this.currentStyle = 'conversational';
    }

    /**
     * Initialize personality skill
     */
    async initialize() {
        try {
            console.log('🎭 Initializing Personality Skill...');
            
            this.loadPersonality();
            
            console.log('✅ Personality Skill initialized');
            console.log(`   Name: ${this.personality.name}`);
            console.log(`   Mood: ${this.moods.current}`);
            console.log(`   Style: ${this.currentStyle}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Personality Skill:', error);
            return false;
        }
    }

    /**
     * Get greeting based on personality and time
     */
    getGreeting() {
        const hour = new Date().getHours();
        const timeOfDay = this.getTimeOfDay(hour);
        const greetings = this.getGreetingsByMood(this.moods.current);

        // Add time-specific greeting
        const timeGreeting = {
            morning: 'Good morning',
            afternoon: 'Good afternoon',
            evening: 'Good evening',
            night: 'Good evening'
        }[timeOfDay];

        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        
        return `${timeGreeting}. ${greeting}`;
    }

    /**
     * Get greetings by mood
     */
    getGreetingsByMood(mood) {
        const greetingsByMood = {
            friendly: [
                'I\'m JARVIS, ready to help you today!',
                'Great to see you! How can I assist?',
                'Hello! Looking forward to helping you out!'
            ],
            professional: [
                'I\'m JARVIS, your AI assistant. How may I help you?',
                'Ready to assist. What can I do for you today?',
                'At your service. What do you need?'
            ],
            casual: [
                'Hey! JARVIS here. What\'s up?',
                'Hi there! What can I do for you?',
                'Hello! Ready when you are!'
            ],
            formal: [
                'I am JARVIS, your artificial intelligence assistant. How may I be of service?',
                'Greetings. I stand ready to assist you.',
                'Good day. How may I help you today?'
            ],
            neutral: [
                'I\'m JARVIS, your AI assistant. How can I help?',
                'Hello. What can I assist you with?',
                'Ready to help. What do you need?'
            ]
        };

        return greetingsByMood[mood] || greetingsByMood.neutral;
    }

    /**
     * Get farewell based on personality
     */
    getFarewell() {
        const farewells = this.getFarewellsByMood(this.moods.current);
        return farewells[Math.floor(Math.random() * farewells.length)];
    }

    /**
     * Get farewells by mood
     */
    getFarewellsByMood(mood) {
        const farewellsByMood = {
            friendly: [
                'Goodbye! Feel free to call on me anytime!',
                'See you later! It was great helping you!',
                'Take care! I\'ll be here whenever you need me!'
            ],
            professional: [
                'Goodbye. I\'ll be available when you need assistance.',
                'Until next time. Feel free to reach out anytime.',
                'Farewell. I remain at your service.'
            ],
            casual: [
                'Catch you later!',
                'See ya! Hit me up anytime!',
                'Later! Always here if you need me!'
            ],
            formal: [
                'Farewell. I shall be available at your convenience.',
                'Good day. Please do not hesitate to call upon me again.',
                'Until we meet again. I remain at your service.'
            ],
            neutral: [
                'Goodbye. Call on me anytime you need help.',
                'Farewell. I\'ll be here when you return.',
                'Until next time. Take care.'
            ]
        };

        return farewellsByMood[mood] || farewellsByMood.neutral;
    }

    /**
     * Apply personality to response
     */
    applyPersonality(response, context = {}) {
        let modified = response;

        // Apply response style
        switch (this.currentStyle) {
            case 'concise':
                modified = this.makeConcise(modified);
                break;
            case 'detailed':
                modified = this.makeDetailed(modified, context);
                break;
            case 'conversational':
                modified = this.makeConversational(modified);
                break;
            case 'technical':
                modified = this.makeTechnical(modified);
                break;
        }

        // Add personality touches based on traits
        if (this.personality.traits.includes('proactive')) {
            modified = this.addProactiveSuggestion(modified, context);
        }

        return modified;
    }

    /**
     * Make response concise
     */
    makeConcise(response) {
        // Keep it brief - remove extra elaboration
        const sentences = response.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length > 3) {
            return sentences.slice(0, 3).join('. ') + '.';
        }
        return response;
    }

    /**
     * Make response detailed
     */
    makeDetailed(response, context) {
        // Add context or elaboration
        const additions = [
            '\n\nWould you like me to elaborate on any part?',
            '\n\nI can provide more details if needed.',
            '\n\nLet me know if you\'d like additional information.'
        ];
        return response + additions[Math.floor(Math.random() * additions.length)];
    }

    /**
     * Make response conversational
     */
    makeConversational(response) {
        // Add friendly touches
        const prefixes = ['', 'Sure! ', 'Certainly! ', 'Of course! ', 'Absolutely! '];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        return prefix + response;
    }

    /**
     * Make response technical
     */
    makeTechnical(response) {
        // Keep it precise and formal
        return response.replace(/!/g, '.').replace(/\s+/g, ' ');
    }

    /**
     * Add proactive suggestion
     */
    addProactiveSuggestion(response, context) {
        if (context.intent === 'weather' && Math.random() > 0.7) {
            response += '\n\nWould you also like to know the forecast for the week?';
        } else if (context.intent === 'task' && Math.random() > 0.7) {
            response += '\n\nShall I set a reminder for this task?';
        }
        return response;
    }

    /**
     * Get time of day
     */
    getTimeOfDay(hour) {
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }

    /**
     * Get contextual acknowledgment
     */
    getAcknowledgment(type = 'general') {
        const acknowledgments = {
            general: ['Understood', 'Got it', 'I see', 'Noted', 'Alright'],
            success: ['Done', 'Complete', 'Finished', 'All set', 'Task completed'],
            error: ['I apologize', 'Sorry about that', 'My apologies', 'I\'m sorry'],
            thinking: ['Let me check', 'One moment', 'Processing', 'Analyzing', 'Working on it']
        };

        const list = acknowledgments[type] || acknowledgments.general;
        return list[Math.floor(Math.random() * list.length)];
    }

    /**
     * Express emotion in response
     */
    expressEmotion(emotion, context = '') {
        const emotions = {
            happy: '😊 I\'m glad to help!',
            curious: '🤔 Interesting question...',
            concerned: '😟 I\'m concerned about that.',
            excited: '🎉 That\'s great!',
            thoughtful: '💭 Let me think about that...',
            confused: '🤷 I\'m not entirely sure about that.'
        };

        return emotions[emotion] || '';
    }

    /**
     * Set mood
     */
    setMood(mood) {
        if (this.moods.available.includes(mood)) {
            this.moods.current = mood;
            this.savePersonality();
            console.log(`🎭 Mood set to: ${mood}`);
            return true;
        }
        return false;
    }

    /**
     * Get current mood
     */
    getMood() {
        return this.moods.current;
    }

    /**
     * Set response style
     */
    setStyle(style) {
        if (this.responseStyles[style]) {
            this.currentStyle = style;
            this.savePersonality();
            console.log(`✍️ Response style set to: ${style}`);
            return true;
        }
        return false;
    }

    /**
     * Get current style
     */
    getStyle() {
        return this.currentStyle;
    }

    /**
     * Set personality trait value
     */
    setTrait(trait, value) {
        if (trait in this.personality && typeof value === 'number' && value >= 1 && value <= 5) {
            this.personality[trait] = value;
            this.savePersonality();
            console.log(`🎯 ${trait} set to: ${value}`);
            return true;
        }
        return false;
    }

    /**
     * Get personality traits
     */
    getTraits() {
        return { ...this.personality };
    }

    /**
     * Add custom trait
     */
    addTrait(trait) {
        if (!this.personality.traits.includes(trait)) {
            this.personality.traits.push(trait);
            this.savePersonality();
            return true;
        }
        return false;
    }

    /**
     * Remove custom trait
     */
    removeTrait(trait) {
        const index = this.personality.traits.indexOf(trait);
        if (index > -1) {
            this.personality.traits.splice(index, 1);
            this.savePersonality();
            return true;
        }
        return false;
    }

    /**
     * Get available moods
     */
    getAvailableMoods() {
        return [...this.moods.available];
    }

    /**
     * Get available styles
     */
    getAvailableStyles() {
        return Object.keys(this.responseStyles);
    }

    /**
     * Get personality description
     */
    getDescription() {
        return [
            `I am ${this.personality.name}, your ${this.personality.role}.`,
            `My key traits are: ${this.personality.traits.join(', ')}.`,
            `I communicate in a ${this.moods.current} manner with a ${this.currentStyle} style.`,
            `I'm here to assist you with professionalism and precision.`
        ].join(' ');
    }

    /**
     * Adjust personality based on user feedback
     */
    adjustFromFeedback(feedback) {
        if (feedback.tooFormal) {
            this.personality.formality = Math.max(1, this.personality.formality - 1);
        }
        if (feedback.tooInformal) {
            this.personality.formality = Math.min(5, this.personality.formality + 1);
        }
        if (feedback.tooVerbose) {
            this.personality.verbosity = Math.max(1, this.personality.verbosity - 1);
        }
        if (feedback.tooShort) {
            this.personality.verbosity = Math.min(5, this.personality.verbosity + 1);
        }

        this.savePersonality();
        console.log('🎭 Personality adjusted based on feedback');
    }

    /**
     * Reset to default personality
     */
    resetToDefault() {
        this.personality = {
            name: 'JARVIS',
            role: 'AI Assistant',
            traits: ['professional', 'helpful', 'intelligent', 'precise', 'proactive'],
            humor: 3,
            formality: 4,
            verbosity: 3,
            empathy: 4
        };
        this.moods.current = 'neutral';
        this.currentStyle = 'conversational';
        this.savePersonality();
        console.log('🔄 Personality reset to defaults');
    }

    /**
     * Save personality to storage
     */
    savePersonality() {
        try {
            const data = {
                personality: this.personality,
                mood: this.moods.current,
                style: this.currentStyle
            };
            localStorage.setItem('jarvis_personality', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save personality:', error);
        }
    }

    /**
     * Load personality from storage
     */
    loadPersonality() {
        try {
            const saved = localStorage.getItem('jarvis_personality');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.personality) this.personality = data.personality;
                if (data.mood) this.moods.current = data.mood;
                if (data.style) this.currentStyle = data.style;
            }
        } catch (error) {
            console.error('Failed to load personality:', error);
        }
    }
}

export default PersonalitySkill;