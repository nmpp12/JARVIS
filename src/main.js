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
                this.uiManager.updateStatus('online');
            } else {
                this.uiManager.addMessage('warning', 'Connected to Ollama but no models found. Please pull a model using: ollama pull llama2');
                this.uiManager.updateStatus('online');
            }
        } catch (error) {
            console.warn('Ollama initialization failed:', error.message);
            
            // Handle Ollama service unavailable gracefully
            this.handleOllamaOffline(error);
        }
    }

    handleOllamaOffline(error) {
        // Check if it's a connection refused error (Ollama not running)  
        if (error.message.includes('503') || error.message.includes('ECONNREFUSED') || error.message.includes('not running') || error.message.includes('Service Unavailable')) {
            this.uiManager.addMessage('warning', '⚠️ Ollama AI service is not running');
            this.uiManager.addMessage('system', '🔧 To enable AI features, please:');
            this.uiManager.addMessage('system', '   1. Install Ollama: https://ollama.ai/download');
            this.uiManager.addMessage('system', '   2. Open terminal and run: ollama serve (keep terminal open)');
            this.uiManager.addMessage('system', '   3. Install a model: ollama pull llama2');
            this.uiManager.addMessage('system', '   4. Refresh this page');
            this.uiManager.addMessage('system', '');
            this.uiManager.addMessage('system', '💡 JARVIS is running in offline mode');
            this.uiManager.addMessage('system', '   All non-AI features (Finance, Health, Education, Business, Legal, OS development) are still available!');
        } else {
            this.uiManager.addMessage('warning', `Failed to connect to Ollama: ${error.message}`);
            this.uiManager.addMessage('system', 'JARVIS is running in offline mode. All non-AI features are still available!');
        }
        this.uiManager.updateStatus('offline');
    }
    async processInput(text, inputType) {
        this.uiManager.addMessage('user', text);
        
        // Check if Ollama is connected before processing AI requests
        const requiresAI = !this.isOSDevCommand(text);
        if (requiresAI && !this.ollamaClient.isConnected) {
            this.uiManager.addMessage('warning', 'AI features unavailable - Ollama service is not connected. Processing with offline capabilities...');
            
            // Try to handle the request with offline capabilities
            try {
                const response = await this.aiAssistant.processCommand(text, {
                    inputType,
                    timestamp: new Date().toISOString(),
                    offlineMode: true
                });
                this.uiManager.addMessage('assistant', response.text);
            } catch (offlineError) {
                this.uiManager.addMessage('system', 'This request requires AI capabilities. Please start Ollama service to enable full functionality.');
            }
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

            if (response.osProject) {
                this.uiManager.showOSProject(response.osProject);
            }

        } catch (error) {
            console.error('Processing error:', error);
            this.uiManager.addMessage('error', `Error: ${error.message}`);
        }

        this.uiManager.updateStatus('online');
    }

    isOSDevCommand(text) {
        const osKeywords = [
            'operating system', 'os', 'kernel', 'bootloader', 'filesystem',
            'device driver', 'memory management', 'scheduler', 'init system',
            'package manager', 'linux', 'ubuntu', 'custom os', 'build os',
            'create os', 'develop os', 'make os'
        ];
        
        return osKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }
}

// Initialize the application
new JARVISApp();