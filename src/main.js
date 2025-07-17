import { AIAssistant } from './core/AIAssistant.js';
import { UIManager } from './ui/UIManager.js';
import { VoiceManager } from './voice/VoiceManager.js';
import { OllamaClient } from './ai/OllamaClient.js';
import { SelfImprovement } from './ai/SelfImprovement.js';
import './styles/main.css';

class JARVISApp {
    constructor() {
        this.ollamaClient = new OllamaClient();
        this.selfImprovement = new SelfImprovement();
        this.aiAssistant = new AIAssistant(this.ollamaClient, this.selfImprovement);
        this.uiManager = new UIManager();
        this.voiceManager = new VoiceManager();
        
        this.init();
    }

    async init() {
        await this.setupUI();
        await this.setupEventListeners();
        await this.initializeAI();
        
        this.uiManager.addMessage('system', 'JARVIS Advanced AI Assistant & OS Developer initialized. Ready for commands.');
        this.uiManager.addMessage('system', 'I can help you create operating systems from scratch, develop Linux-based distributions, or build Ubuntu derivatives.');
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
        this.uiManager.addMessage('system', 'Connecting to Ollama service...');
        
        if (result.error) {
            this.handleOllamaOffline({ message: result.error });
        } else if (Array.isArray(result)) {
            // Success case - result is array of model names
            this.uiManager.updateModelList(result);
            
            if (result.length > 0) {
                this.ollamaClient.setModel(result[0]);
                this.uiManager.addMessage('system', `Connected to Ollama. Available models: ${result.join(', ')}`);
                this.uiManager.updateStatus('online');
            } else {
    }
    async processInput(text, inputType) {
        this.uiManager.addMessage('user', text);
        
        this.uiManager.updateStatus('thinking');

        try {
            const response = await this.aiAssistant.processCommand(text, {
                inputType,
                timestamp: new Date().toISOString()
            });

            this.uiManager.addMessage('assistant', response.text);
            
            if (response.speak && inputType === 'voice') {
                await this.voiceManager.speak(response.text);
            }

            if (response.codeImprovement) {
                this.uiManager.showCodeImprovement(response.codeImprovement);
            }

            if (response.osProject) {
                this.uiManager.showOSProject(response.osProject);
            }

            if (response.suggestions) {
                // Could add UI for suggestions in the future
            }
        } catch (error) {
            console.error('Processing error:', error);
            this.uiManager.addMessage('error', `Error: ${error.message}`);
        }

        this.uiManager.updateStatus(this.ollamaClient.isConnected ? 'online' : 'offline');
    }
}

// Initialize the application
new JARVISApp();