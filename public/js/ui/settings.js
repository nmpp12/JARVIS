/**
 * Settings UI Component
 */

export class SettingsUI {
    constructor(jarvis) {
        this.jarvis = jarvis;
    }

    async initialize() {
        console.log('⚙️ Initializing Settings UI...');
        
        this.setupEventListeners();
        this.loadSettings();
        
        console.log('✅ Settings UI initialized');
    }

    setupEventListeners() {
        // Personality settings
        document.getElementById('moodSelect')?.addEventListener('change', (e) => {
            this.jarvis.personality?.setMood(e.target.value);
        });

        document.getElementById('styleSelect')?.addEventListener('change', (e) => {
            this.jarvis.personality?.setStyle(e.target.value);
        });

        // Voice settings
        document.getElementById('voiceSelect')?.addEventListener('change', (e) => {
            this.jarvis.voice?.setVoice(e.target.value);
        });

        const rateSlider = document.getElementById('rateSlider');
        rateSlider?.addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('rateValue').textContent = value;
            this.jarvis.voice?.setRate(parseFloat(value));
        });

        document.getElementById('enableVoice')?.addEventListener('change', (e) => {
            this.jarvis.config?.set('voice.enabled', e.target.checked);
        });

        // AI settings
        document.getElementById('ollamaUrl')?.addEventListener('change', (e) => {
            this.jarvis.config?.set('ollama.url', e.target.value);
        });

        const tempSlider = document.getElementById('temperatureSlider');
        tempSlider?.addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('temperatureValue').textContent = value;
            this.jarvis.config?.set('ollama.temperature', parseFloat(value));
        });

        document.getElementById('maxTokens')?.addEventListener('change', (e) => {
            this.jarvis.config?.set('ollama.maxTokens', parseInt(e.target.value));
        });

        // Learning settings
        document.getElementById('enableLearning')?.addEventListener('change', (e) => {
            this.jarvis.config?.set('learning.enabled', e.target.checked);
        });

        document.getElementById('enableSelfImprovement')?.addEventListener('change', (e) => {
            this.jarvis.config?.set('learning.selfImprovement', e.target.checked);
        });
    }

    loadSettings() {
        // Load personality settings
        if (this.jarvis.personality) {
            const mood = this.jarvis.personality.getMood();
            const style = this.jarvis.personality.getStyle();
            
            const moodSelect = document.getElementById('moodSelect');
            if (moodSelect) moodSelect.value = mood;
            
            const styleSelect = document.getElementById('styleSelect');
            if (styleSelect) styleSelect.value = style;
        }

        // Load voice settings
        if (this.jarvis.voice) {
            this.loadVoices();
        }

        // Load config settings
        if (this.jarvis.config) {
            const ollamaUrl = document.getElementById('ollamaUrl');
            if (ollamaUrl) ollamaUrl.value = this.jarvis.config.get('ollama.url');
            
            const temp = this.jarvis.config.get('ollama.temperature');
            const tempSlider = document.getElementById('temperatureSlider');
            const tempValue = document.getElementById('temperatureValue');
            if (tempSlider) tempSlider.value = temp;
            if (tempValue) tempValue.textContent = temp;
            
            const maxTokens = document.getElementById('maxTokens');
            if (maxTokens) maxTokens.value = this.jarvis.config.get('ollama.maxTokens');
            
            const enableVoice = document.getElementById('enableVoice');
            if (enableVoice) enableVoice.checked = this.jarvis.config.get('voice.enabled');
            
            const enableLearning = document.getElementById('enableLearning');
            if (enableLearning) enableLearning.checked = this.jarvis.config.get('learning.enabled');
            
            const enableSelfImprovement = document.getElementById('enableSelfImprovement');
            if (enableSelfImprovement) enableSelfImprovement.checked = this.jarvis.config.get('learning.selfImprovement');
        }
    }

    loadVoices() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect) return;
        
        const voices = this.jarvis.voice.getVoices();
        voiceSelect.innerHTML = voices.map(voice => 
            `<option value="${voice.name}">${voice.name} (${voice.lang})</option>`
        ).join('');
    }

    refresh() {
        this.loadSettings();
    }
}

export default SettingsUI;