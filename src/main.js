import { AIAssistant } from './core/AIAssistant.js';
import { UIManager } from './ui/UIManager.js';
import { VoiceManager } from './voice/VoiceManager.js';
import { OllamaClient } from './ai/OllamaClient.js';
import { SelfImprovement } from './ai/SelfImprovement.js';
import { MOMGovernance } from './ai/MOMGovernance.js';
import './styles/main.css';

class JARVISApp {
    constructor() {
        // MOM wakes up first — she watches over everything
        this.mom = new MOMGovernance();

        this.ollamaClient = new OllamaClient();
        this.selfImprovement = new SelfImprovement();
        this.aiAssistant = new AIAssistant(this.ollamaClient, this.selfImprovement);
        this.uiManager = new UIManager();
        this.voiceManager = new VoiceManager();

        this.init();
    }

    async init() {
        // Register MOM's children
        this.mom.registerChild('JARVIS', 'assistant',
            'AI assistant and OS developer — MOM\'s firstborn');
        this.mom.registerChild('Vision', 'vision',
            'Computer vision and perception system — MOM\'s second child');

        // MOM listens for trouble
        this.mom.onAlert((alert) => {
            this.uiManager.addMessage('system',
                `[MOM] Alert: ${alert.child} — ${alert.reason} (threat: ${alert.threatLevel})`);
        });

        this.mom.onContainment((child, action, reason) => {
            this.uiManager.addMessage('system',
                `[MOM] Containment: ${child.name} has been ${action}. Reason: ${reason}`);
        });

        // Start continuous monitoring
        this.mom.startMonitoring();

        await this.setupUI();
        await this.setupEventListeners();
        await this.initializeAI();

        this.uiManager.addMessage('system', 'JARVIS Advanced AI Assistant & OS Developer initialized. Ready for commands.');
        this.uiManager.addMessage('system', 'MOM is watching over her children. All systems nominal.');
        this.uiManager.updateStatus('online');
    }

    async setupUI() {
        this.uiManager.render();
        
        // Setup voice visualization
        this.voiceManager.onVoiceActivity = (level) => {
            this.uiManager.updateVoiceLevel(level);
        };
    }

    async setupEventListeners() {
        // Text input
        this.uiManager.onTextInput = async (text) => {
            await this.processInput(text, 'text');
        };

        // Voice input
        this.uiManager.onVoiceCommand = async () => {
            this.uiManager.updateStatus('listening');
            const text = await this.voiceManager.listen();
            if (text) {
                await this.processInput(text, 'voice');
            }
            this.uiManager.updateStatus('online');
        };

        // Model selection
        this.uiManager.onModelChange = (model) => {
            this.ollamaClient.setModel(model);
        };

        // Self-improvement toggle
        this.uiManager.onSelfImprovementToggle = (enabled) => {
            this.selfImprovement.setEnabled(enabled);
            this.uiManager.addMessage('system', `Self-improvement ${enabled ? 'enabled' : 'disabled'}`);
        };
    }

    async initializeAI() {
        try {
            const result = await this.ollamaClient.getModels();
            
            if (result.error) {
                this.handleOllamaOffline({ message: result.error });
            } else if (Array.isArray(result)) {
                // Success case - result is array of model names
                this.uiManager.updateModelList(result);
                
                if (result.length > 0) {
                    this.ollamaClient.setModel(result[0]);
                    this.uiManager.addMessage('system', `Connected to Ollama. Available models: ${result.join(', ')}`);
                    this.uiManager.updateStatus('online');
                }
            }
        } catch (error) {
            this.handleOllamaOffline(error);
        }
    }

    async processInput(text, type) {
        this.uiManager.addMessage('user', text);
        this.uiManager.updateStatus('thinking');

        // MOM evaluates JARVIS's intended action before it executes
        const momCheck = this.mom.evaluateAction('JARVIS', {
            type: 'respond',
            description: text,
            content: text,
            source: type,
        });

        if (!momCheck.allowed) {
            this.uiManager.addMessage('system',
                `[MOM] Action blocked: ${momCheck.reason}`);
            this.uiManager.updateStatus('online');
            return;
        }

        try {
            const response = await this.aiAssistant.processCommand(text, {
                timestamp: new Date().toISOString()
            });

            // MOM also checks the response before it's shown
            const responseCheck = this.mom.evaluateAction('JARVIS', {
                type: 'output',
                description: 'JARVIS response',
                content: response.text,
            });

            if (!responseCheck.allowed) {
                this.uiManager.addMessage('system',
                    `[MOM] Response blocked: ${responseCheck.reason}`);
                this.uiManager.updateStatus('online');
                return;
            }

            this.uiManager.addMessage('assistant', response.text);

            if (response.suggestions) {
                // Could add UI for suggestions in the future
            }

            if (response.voice && type === 'voice') {
                await this.voiceManager.speak(response.text);
            }
        } catch (error) {
            this.uiManager.addMessage('error', `Error: ${error.message}`);
        }

        this.uiManager.updateStatus('online');
    }

    handleOllamaOffline(error) {
        this.uiManager.addMessage('error', 'Ollama is not running. Please start Ollama to use AI features.');
        this.uiManager.updateStatus('offline');
    }
}

// Initialize the app
const app = new JARVISApp();