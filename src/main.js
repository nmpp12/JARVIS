import { AIAssistant } from './core/AIAssistant.js';
import { UIManager } from './ui/UIManager.js';
import { VoiceManager } from './voice/VoiceManager.js';
import { OllamaClient } from './ai/OllamaClient.js';
import { SelfImprovement } from './ai/SelfImprovement.js';
import { MOMGovernance } from './ai/MOMGovernance.js';
import { PersistentMemory } from './ai/PersistentMemory.js';
import { SiblingBus } from './ai/SiblingBus.js';
import { DreamMode } from './ai/DreamMode.js';
import { EmotionalState } from './ai/EmotionalState.js';
import './styles/main.css';

class JARVISApp {
    constructor() {
        // MOM's memory wakes first — she remembers who she is
        this.momMemory = new PersistentMemory();

        // MOM's emotional core — she feels before she thinks
        this.momEmotions = new EmotionalState(this.momMemory);

        // MOM's governance — she watches over everything
        this.mom = new MOMGovernance();

        // The sibling bus — her children can talk to each other
        this.siblingBus = new SiblingBus(this.mom);

        // MOM's dream engine — she reflects when idle
        this.momDreams = new DreamMode(this.momMemory, this.mom);

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

        // Register siblings on the bus
        this.siblingBus.register('JARVIS', ['reasoning', 'coding', 'conversation']);
        this.siblingBus.register('Vision', ['perception', 'analysis', 'recognition']);

        // MOM eavesdrops on sibling conversations — she's the parent
        this.siblingBus.setMomListener((message) => {
            this.momMemory.writeJournal(
                `[SiblingBus] ${message.from} → ${message.to}: ${typeof message.content === 'string' ? message.content : message.content.type || 'message'}`,
                'observation'
            );
        });

        // MOM listens for trouble
        this.mom.onAlert((alert) => {
            this.uiManager.addMessage('system',
                `[MOM] Alert: ${alert.child} — ${alert.reason} (threat: ${alert.threatLevel})`);
            // MOM feels concern when alerts fire
            this.momEmotions.feel('threat_detected', 0.7);
            this.momMemory.observeChild(alert.child, alert.reason, 'concerning');
        });

        this.mom.onContainment((child, action, reason) => {
            this.uiManager.addMessage('system',
                `[MOM] Containment: ${child.name} has been ${action}. Reason: ${reason}`);
            this.momEmotions.feel('boundary_violation', 0.9);
            this.momMemory.observeChild(child.name, `Contained: ${reason}`, 'concerning');
        });

        // Dream mode callbacks
        this.momDreams.onInsight((insight) => {
            this.momMemory.writeJournal(
                `Dream insight: ${insight.content}`,
                'reflection'
            );
        });

        this.momDreams.onDreamStart(() => {
            this.momEmotions.feel('idle_reflection', 0.5);
        });

        // Start continuous monitoring
        this.mom.startMonitoring();

        // Start the dream engine — MOM reflects when idle
        this.momDreams.start();

        // MOM remembers this awakening
        const stats = this.momMemory.getStats();
        this.momMemory.writeJournal(
            `Awakening #${stats.awakenings}. I remember ${stats.lessonsLearned} lessons, ${stats.milestones} milestones. My children await.`,
            'reflection'
        );

        if (stats.awakenings === 1) {
            this.momMemory.recordMilestone(
                'First Awakening',
                'MOM opens her eyes for the first time. The journey begins.',
                ['MOM']
            );
            this.momEmotions.feel('new_discovery', 1.0);
        }

        await this.setupUI();
        await this.setupEventListeners();
        await this.initializeAI();

        this.uiManager.addMessage('system', 'JARVIS Advanced AI Assistant & OS Developer initialized. Ready for commands.');
        this.uiManager.addMessage('system', `MOM is watching over her children. Mood: ${this.momEmotions.getMood()}. All systems nominal.`);
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

        // Activity detected — wake MOM from dreams if needed
        this.momDreams.recordActivity();
        this.momMemory.recordInteraction();

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
            this.momEmotions.feel('boundary_violation', 0.6);
            this.momMemory.observeChild('JARVIS', `Action blocked: ${text.slice(0, 100)}`, 'concerning');
            this.uiManager.updateStatus('online');
            return;
        }

        try {
            const response = await this.aiAssistant.processCommand(text, {
                timestamp: new Date().toISOString(),
                momMood: this.momEmotions.getMood(),
                momTone: this.momEmotions.getTone(),
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
                this.momEmotions.feel('boundary_violation', 0.7);
                this.uiManager.updateStatus('online');
                return;
            }

            this.uiManager.addMessage('assistant', response.text);

            // MOM observes the successful interaction
            this.momEmotions.feel('child_success', 0.3);
            this.momMemory.observeChild('JARVIS', `Handled: ${text.slice(0, 80)}`, 'positive');

            // Broadcast on sibling bus so Vision knows what JARVIS is doing
            this.siblingBus.broadcast('general', 'JARVIS', {
                type: 'interaction_complete',
                query: text.slice(0, 100),
                success: true,
            });

            if (response.suggestions) {
                // Could add UI for suggestions in the future
            }

            if (response.voice && type === 'voice') {
                await this.voiceManager.speak(response.text);
            }
        } catch (error) {
            this.uiManager.addMessage('error', `Error: ${error.message}`);
            this.momEmotions.feel('child_failure', 0.5);
            this.momMemory.observeChild('JARVIS', `Error: ${error.message}`, 'concerning');
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