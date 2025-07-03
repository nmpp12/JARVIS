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
        
        this.uiManager.addMessage('system', 'JARVIS Advanced AI Assistant initialized. Ready for commands.');
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
            this.uiManager.addMessage('system', `Switched to model: ${model}`);
        };

        // Self-improvement toggle
        this.uiManager.onSelfImprovementToggle = (enabled) => {
            this.selfImprovement.setEnabled(enabled);
            this.uiManager.addMessage('system', `Self-improvement ${enabled ? 'enabled' : 'disabled'}`);
        };
    }

    async initializeAI() {
        try {
            this.uiManager.addMessage('system', 'Connecting to Ollama service...');
            const models = await this.ollamaClient.getAvailableModels();
            this.uiManager.updateModelList(models);
            
            if (models.length > 0) {
                this.ollamaClient.setModel(models[0]);
                this.uiManager.addMessage('system', `Connected to Ollama. Available models: ${models.join(', ')}`);
            } else {
                this.uiManager.addMessage('warning', 'Connected to Ollama but no models found. Please pull a model using: ollama pull llama2');
            }
        } catch (error) {
            console.error('Ollama initialization failed:', error);
            this.uiManager.addMessage('error', `Failed to connect to Ollama: ${error.message}`);
            this.uiManager.addMessage('system', 'JARVIS is running in offline mode. To enable AI features:');
            this.uiManager.addMessage('system', '1. Install Ollama from https://ollama.ai');
            this.uiManager.addMessage('system', '2. Run: ollama serve');
            this.uiManager.addMessage('system', '3. Pull a model: ollama pull llama2');
            this.uiManager.addMessage('system', '4. Refresh this page');
        }
    }

    async processInput(text, inputType) {
        this.uiManager.addMessage('user', text);
        
        // Check if Ollama is connected before processing
        if (!this.ollamaClient.isConnected) {
            this.uiManager.addMessage('error', 'Cannot process AI requests - Ollama service is not connected. Please ensure Ollama is running.');
            return;
        }
        
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

        } catch (error) {
            console.error('Processing error:', error);
            this.uiManager.addMessage('error', `Error: ${error.message}`);
        }

        this.uiManager.updateStatus('online');
    }
}

// Initialize the application
new JARVISApp();