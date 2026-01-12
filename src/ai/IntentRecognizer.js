/**
 * Intent Recognizer
 * Classifies user input into different intent categories
 */

export class IntentRecognizer {
    constructor() {
        this.intents = this.defineIntents();
    }

    /**
     * Define intent patterns and keywords
     */
    defineIntents() {
        return {
            greeting: {
                keywords: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'],
                patterns: [/^(hello|hi|hey)/i, /good (morning|afternoon|evening)/i]
            },
            farewell: {
                keywords: ['goodbye', 'bye', 'see you', 'farewell', 'exit', 'quit'],
                patterns: [/^(goodbye|bye|see you)/i, /(exit|quit)/i]
            },
            weather: {
                keywords: ['weather', 'temperature', 'forecast', 'rain', 'sunny', 'climate'],
                patterns: [/weather/i, /temperature/i, /forecast/i]
            },
            task: {
                keywords: ['task', 'todo', 'remind', 'reminder', 'schedule', 'add task'],
                patterns: [/add task/i, /create task/i, /remind me/i, /todo/i]
            },
            calendar: {
                keywords: ['calendar', 'event', 'meeting', 'appointment', 'schedule'],
                patterns: [/schedule/i, /calendar/i, /meeting/i, /appointment/i]
            },
            code: {
                keywords: ['code', 'program', 'function', 'debug', 'fix', 'implement'],
                patterns: [/write code/i, /fix bug/i, /implement/i, /function/i]
            },
            news: {
                keywords: ['news', 'headlines', 'updates', 'current events'],
                patterns: [/latest news/i, /headlines/i, /what.*happening/i]
            },
            selfImprovement: {
                keywords: ['improve', 'optimize', 'analyze', 'self-improve', 'upgrade'],
                patterns: [/improve yourself/i, /analyze.*code/i, /optimize/i]
            },
            help: {
                keywords: ['help', 'what can you do', 'capabilities', 'features', 'commands'],
                patterns: [/help/i, /what can you/i, /how do/i, /capabilities/i]
            },
            general: {
                keywords: [],
                patterns: []
            }
        };
    }

    /**
     * Recognize intent from user input
     */
    recognize(input) {
        if (!input || typeof input !== 'string') {
            return 'general';
        }

        const normalizedInput = input.toLowerCase().trim();
        let bestMatch = { intent: 'general', confidence: 0 };

        for (const [intentName, intentData] of Object.entries(this.intents)) {
            if (intentName === 'general') continue;

            let score = 0;

            // Check keywords
            for (const keyword of intentData.keywords) {
                if (normalizedInput.includes(keyword)) {
                    score += 1;
                }
            }

            // Check patterns
            for (const pattern of intentData.patterns) {
                if (pattern.test(normalizedInput)) {
                    score += 2; // Patterns get higher weight
                }
            }

            // Update best match if score is higher
            if (score > bestMatch.confidence) {
                bestMatch = {
                    intent: intentName,
                    confidence: score
                };
            }
        }

        return bestMatch.intent;
    }

    /**
     * Extract entities from input based on intent
     */
    extractEntities(input, intent) {
        const entities = {};

        switch (intent) {
            case 'weather':
                entities.location = this.extractLocation(input);
                entities.time = this.extractTime(input);
                break;

            case 'task':
                entities.taskDescription = this.extractTaskDescription(input);
                entities.deadline = this.extractTime(input);
                break;

            case 'calendar':
                entities.eventName = this.extractEventName(input);
                entities.time = this.extractTime(input);
                entities.duration = this.extractDuration(input);
                break;

            case 'code':
                entities.language = this.extractProgrammingLanguage(input);
                entities.codeType = this.extractCodeType(input);
                break;
        }

        return entities;
    }

    /**
     * Extract location from input
     */
    extractLocation(input) {
        const locationPattern = /in ([a-zA-Z\s]+)/i;
        const match = input.match(locationPattern);
        return match ? match[1].trim() : null;
    }

    /**
     * Extract time references
     */
    extractTime(input) {
        const timePatterns = [
            /tomorrow/i,
            /today/i,
            /tonight/i,
            /next (week|month|year)/i,
            /at (\d{1,2}(:\d{2})?(am|pm)?)/i
        ];

        for (const pattern of timePatterns) {
            const match = input.match(pattern);
            if (match) return match[0];
        }

        return null;
    }

    /**
     * Extract task description
     */
    extractTaskDescription(input) {
        const patterns = [
            /add task (.+)/i,
            /remind me to (.+)/i,
            /todo: (.+)/i
        ];

        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match) return match[1].trim();
        }

        return input;
    }

    /**
     * Extract event name
     */
    extractEventName(input) {
        const patterns = [
            /schedule (.+?) (at|on|for)/i,
            /meeting (with|about) (.+)/i
        ];

        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match) return match[1].trim();
        }

        return null;
    }

    /**
     * Extract duration
     */
    extractDuration(input) {
        const durationPattern = /(\d+)\s*(hour|minute|min|hr)s?/i;
        const match = input.match(durationPattern);
        return match ? `${match[1]} ${match[2]}` : null;
    }

    /**
     * Extract programming language
     */
    extractProgrammingLanguage(input) {
        const languages = ['javascript', 'python', 'java', 'c++', 'ruby', 'go', 'rust', 'typescript'];
        const normalizedInput = input.toLowerCase();

        for (const lang of languages) {
            if (normalizedInput.includes(lang)) {
                return lang;
            }
        }

        return null;
    }

    /**
     * Extract code type (function, class, etc.)
     */
    extractCodeType(input) {
        const types = ['function', 'class', 'method', 'script', 'algorithm'];
        const normalizedInput = input.toLowerCase();

        for (const type of types) {
            if (normalizedInput.includes(type)) {
                return type;
            }
        }

        return 'code';
    }
}

export default IntentRecognizer;