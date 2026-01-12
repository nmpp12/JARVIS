/**
 * AI Assistant
 * Main orchestration layer for JARVIS
 */

import OllamaClient from '../ai/OllamaClient.js';
import IntentRecognizer from '../ai/IntentRecognizer.js';
import PluginManager from '../plugins/PluginManager.js';
import ContextManager from './ContextManager.js';

export class AIAssistant {
    constructor() {
        this.ollamaClient = new OllamaClient();
        this.intentRecognizer = new IntentRecognizer();
        this.pluginManager = new PluginManager();
        this.contextManager = new ContextManager();
        this.isInitialized = false;
        this.selfImprovementEnabled = false;
    }

    /**
     * Initialize the AI Assistant
     */
    async initialize() {
        try {
            console.log('🤖 Initializing JARVIS...');
            
            // Initialize Ollama client
            await this.ollamaClient.initialize();
            
            // Initialize plugins
            await this.pluginManager.initialize();
            
            this.isInitialized = true;
            console.log('✅ JARVIS initialized successfully');
            
            return {
                success: true,
                models: this.ollamaClient.getAvailableModels(),
                plugins: this.pluginManager.getLoadedPlugins()
            };
        } catch (error) {
            console.error('❌ Failed to initialize JARVIS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process user input
     */
    async process(input, options = {}) {
        if (!this.isInitialized) {
            throw new Error('JARVIS is not initialized');
        }

        try {
            // Add to context
            this.contextManager.addMessage('user', input);

            // Recognize intent
            const intent = this.intentRecognizer.recognize(input);
            const entities = this.intentRecognizer.extractEntities(input, intent);

            console.log(`🎯 Intent: ${intent}`, entities);

            // Route to appropriate handler
            let response;
            switch (intent) {
                case 'greeting':
                    response = await this.handleGreeting(input);
                    break;
                    
                case 'farewell':
                    response = await this.handleFarewell(input);
                    break;
                    
                case 'weather':
                    response = await this.handleWeather(input, entities);
                    break;
                    
                case 'task':
                    response = await this.handleTask(input, entities);
                    break;
                    
                case 'calendar':
                    response = await this.handleCalendar(input, entities);
                    break;
                    
                case 'code':
                    response = await this.handleCode(input, entities);
                    break;
                    
                case 'news':
                    response = await this.handleNews(input, entities);
                    break;
                    
                case 'selfImprovement':
                    response = await this.handleSelfImprovement(input);
                    break;
                    
                case 'help':
                    response = await this.handleHelp();
                    break;
                    
                default:
                    response = await this.handleGeneral(input, options);
            }

            // Add response to context
            this.contextManager.addMessage('assistant', response.text);

            return {
                ...response,
                intent,
                entities
            };
        } catch (error) {
            console.error('Error processing input:', error);
            return {
                text: 'I apologize, but I encountered an error processing your request.',
                error: error.message,
                speak: true
            };
        }
    }

    /**
     * Handle greeting
     */
    async handleGreeting(input) {
        const greetings = [
            'Hello! I\'m JARVIS, your AI assistant. How may I help you today?',
            'Good day! JARVIS at your service. What can I do for you?',
            'Greetings! I\'m ready to assist you with any task.',
            'Hello! Ready to help. What do you need?'
        ];

        return {
            text: greetings[Math.floor(Math.random() * greetings.length)],
            speak: true
        };
    }

    /**
     * Handle farewell
     */
    async handleFarewell(input) {
        const farewells = [
            'Goodbye! Feel free to call on me anytime you need assistance.',
            'Farewell! I\'ll be here whenever you need me.',
            'Until next time! Have a great day!',
            'Goodbye! Looking forward to our next interaction.'
        ];

        return {
            text: farewells[Math.floor(Math.random() * farewells.length)],
            speak: true
        };
    }

    /**
     * Handle weather query
     */
    async handleWeather(input, entities) {
        try {
            const plugin = this.pluginManager.getPlugin('weather');
            if (plugin) {
                const result = await plugin.execute({ location: entities.location });
                return {
                    text: result,
                    speak: true
                };
            }
        } catch (error) {
            console.error('Weather plugin error:', error);
        }

        return {
            text: 'I\'m sorry, but the weather service is currently unavailable.',
            speak: true
        };
    }

    /**
     * Handle task management
     */
    async handleTask(input, entities) {
        try {
            const plugin = this.pluginManager.getPlugin('task');
            if (plugin) {
                const result = await plugin.execute({
                    action: 'add',
                    description: entities.taskDescription,
                    deadline: entities.deadline
                });
                return {
                    text: result,
                    speak: true
                };
            }
        } catch (error) {
            console.error('Task plugin error:', error);
        }

        return {
            text: 'Task noted. I\'ll keep track of that for you.',
            speak: true
        };
    }

    /**
     * Handle calendar events
     */
    async handleCalendar(input, entities) {
        try {
            const plugin = this.pluginManager.getPlugin('calendar');
            if (plugin) {
                const result = await plugin.execute({
                    action: 'add',
                    event: entities.eventName,
                    time: entities.time,
                    duration: entities.duration
                });
                return {
                    text: result,
                    speak: true
                };
            }
        } catch (error) {
            console.error('Calendar plugin error:', error);
        }

        return {
            text: 'Event scheduled. I\'ll remind you when it\'s time.',
            speak: true
        };
    }

    /**
     * Handle code-related requests
     */
    async handleCode(input, entities) {
        try {
            const plugin = this.pluginManager.getPlugin('code');
            if (plugin) {
                const result = await plugin.execute({
                    request: input,
                    language: entities.language,
                    type: entities.codeType
                });
                return {
                    text: result,
                    speak: false // Don't speak code
                };
            }
        } catch (error) {
            console.error('Code plugin error:', error);
        }

        // Fallback to general AI
        return await this.handleGeneral(input, { useContext: false });
    }

    /**
     * Handle news requests
     */
    async handleNews(input, entities) {
        try {
            const plugin = this.pluginManager.getPlugin('news');
            if (plugin) {
                const result = await plugin.execute({ query: input });
                return {
                    text: result,
                    speak: true
                };
            }
        } catch (error) {
            console.error('News plugin error:', error);
        }

        return {
            text: 'I\'m sorry, but I cannot access news at the moment.',
            speak: true
        };
    }

    /**
     * Handle self-improvement requests
     */
    async handleSelfImprovement(input) {
        if (!this.selfImprovementEnabled) {
            return {
                text: 'Self-improvement mode is currently disabled. Would you like to enable it?',
                speak: true
            };
        }

        return {
            text: 'Analyzing my systems for potential improvements... This feature is under development.',
            speak: true
        };
    }

    /**
     * Handle help requests
     */
    async handleHelp() {
        const capabilities = [
            'I can help you with:',
            '• Weather information',
            '• Task management',
            '• Calendar and scheduling',
            '• Code assistance',
            '• Latest news',
            '• General questions and conversation',
            '',
            'Just ask me naturally, and I\'ll do my best to assist!'
        ];

        return {
            text: capabilities.join('\n'),
            speak: true
        };
    }

    /**
     * Handle general queries with AI
     */
    async handleGeneral(input, options = {}) {
        try {
            let response;
            
            if (options.useContext !== false) {
                // Use chat with context
                response = await this.ollamaClient.chat(input, options);
            } else {
                // Use simple generation
                response = await this.ollamaClient.generate(input, options);
            }

            return {
                text: response,
                speak: true
            };
        } catch (error) {
            console.error('AI generation error:', error);
            return {
                text: 'I\'m having trouble connecting to my AI systems. Please make sure Ollama is running.',
                speak: true,
                error: error.message
            };
        }
    }

    /**
     * Enable/disable self-improvement
     */
    setSelfImprovement(enabled) {
        this.selfImprovementEnabled = enabled;
    }

    /**
     * Set AI model
     */
    setModel(modelName) {
        return this.ollamaClient.setModel(modelName);
    }

    /**
     * Get current model
     */
    getCurrentModel() {
        return this.ollamaClient.getCurrentModel();
    }

    /**
     * Get available models
     */
    getAvailableModels() {
        return this.ollamaClient.getAvailableModels();
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.ollamaClient.clearHistory();
        this.contextManager.clear();
    }

    /**
     * Get system status
     */
    async getStatus() {
        return {
            initialized: this.isInitialized,
            model: this.getCurrentModel(),
            plugins: this.pluginManager.getLoadedPlugins(),
            selfImprovement: this.selfImprovementEnabled,
            contextSize: this.contextManager.getSize()
        };
    }
}

export default AIAssistant;