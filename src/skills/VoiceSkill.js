/**
 * Voice Skill
 * Handles speech recognition and text-to-speech
 */

export class VoiceSkill {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.voices = [];
        this.selectedVoice = null;
        this.settings = {
            language: 'en-US',
            continuous: false,
            interimResults: true,
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        };
    }

    /**
     * Initialize voice skill
     */
    async initialize() {
        try {
            console.log('🎤 Initializing Voice Skill...');

            // Initialize Speech Recognition
            if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.setupRecognition();
                console.log('✅ Speech Recognition initialized');
            } else {
                console.warn('⚠️ Speech Recognition not supported');
            }

            // Load available voices
            if (this.synthesis) {
                this.loadVoices();
                // Voices load asynchronously
                this.synthesis.addEventListener('voiceschanged', () => {
                    this.loadVoices();
                });
                console.log('✅ Text-to-Speech initialized');
            } else {
                console.warn('⚠️ Text-to-Speech not supported');
            }

            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Voice Skill:', error);
            return false;
        }
    }

    /**
     * Setup speech recognition
     */
    setupRecognition() {
        if (!this.recognition) return;

        this.recognition.continuous = this.settings.continuous;
        this.recognition.interimResults = this.settings.interimResults;
        this.recognition.lang = this.settings.language;

        // Will be set by caller
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('🎤 Listening started');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            console.log('🎤 Listening stopped');
        };

        this.recognition.onerror = (event) => {
            console.error('🎤 Speech recognition error:', event.error);
            this.isListening = false;
        };
    }

    /**
     * Start listening
     */
    startListening(onResult, onError) {
        if (!this.recognition) {
            const error = 'Speech recognition not available';
            if (onError) onError(error);
            return false;
        }

        if (this.isListening) {
            console.warn('Already listening');
            return false;
        }

        try {
            // Set result handler
            this.recognition.onresult = (event) => {
                const results = event.results;
                const lastResult = results[results.length - 1];
                const transcript = lastResult[0].transcript;
                const isFinal = lastResult.isFinal;

                if (onResult) {
                    onResult(transcript, isFinal);
                }
            };

            // Set error handler
            if (onError) {
                this.recognition.onerror = (event) => {
                    onError(event.error);
                };
            }

            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Failed to start listening:', error);
            if (onError) onError(error);
            return false;
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (!this.recognition || !this.isListening) {
            return false;
        }

        try {
            this.recognition.stop();
            return true;
        } catch (error) {
            console.error('Failed to stop listening:', error);
            return false;
        }
    }

    /**
     * Speak text
     */
    speak(text, options = {}) {
        if (!this.synthesis) {
            console.warn('Text-to-Speech not available');
            return false;
        }

        // Stop any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply settings
        utterance.rate = options.rate || this.settings.rate;
        utterance.pitch = options.pitch || this.settings.pitch;
        utterance.volume = options.volume || this.settings.volume;
        utterance.lang = options.language || this.settings.language;

        // Set voice
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        // Event handlers
        utterance.onstart = () => {
            console.log('🔊 Speaking started');
            if (options.onStart) options.onStart();
        };

        utterance.onend = () => {
            console.log('🔊 Speaking ended');
            if (options.onEnd) options.onEnd();
        };

        utterance.onerror = (event) => {
            console.error('🔊 Speech synthesis error:', event.error);
            if (options.onError) options.onError(event.error);
        };

        try {
            this.synthesis.speak(utterance);
            return true;
        } catch (error) {
            console.error('Failed to speak:', error);
            return false;
        }
    }

    /**
     * Stop speaking
     */
    stopSpeaking() {
        if (!this.synthesis) return false;
        
        this.synthesis.cancel();
        return true;
    }

    /**
     * Pause speaking
     */
    pauseSpeaking() {
        if (!this.synthesis) return false;
        
        this.synthesis.pause();
        return true;
    }

    /**
     * Resume speaking
     */
    resumeSpeaking() {
        if (!this.synthesis) return false;
        
        this.synthesis.resume();
        return true;
    }

    /**
     * Load available voices
     */
    loadVoices() {
        this.voices = this.synthesis.getVoices();
        
        // Try to select a good default voice
        if (!this.selectedVoice && this.voices.length > 0) {
            // Prefer English voices
            const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
            this.selectedVoice = englishVoices[0] || this.voices[0];
        }

        console.log(`📢 Loaded ${this.voices.length} voices`);
    }

    /**
     * Get available voices
     */
    getVoices() {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            default: voice.default,
            localService: voice.localService
        }));
    }

    /**
     * Set voice by name
     */
    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.selectedVoice = voice;
            console.log(`🔊 Voice set to: ${voiceName}`);
            return true;
        }
        return false;
    }

    /**
     * Set language
     */
    setLanguage(language) {
        this.settings.language = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
        console.log(`🌐 Language set to: ${language}`);
    }

    /**
     * Set speech rate
     */
    setRate(rate) {
        if (rate >= 0.1 && rate <= 10) {
            this.settings.rate = rate;
            return true;
        }
        return false;
    }

    /**
     * Set speech pitch
     */
    setPitch(pitch) {
        if (pitch >= 0 && pitch <= 2) {
            this.settings.pitch = pitch;
            return true;
        }
        return false;
    }

    /**
     * Set speech volume
     */
    setVolume(volume) {
        if (volume >= 0 && volume <= 1) {
            this.settings.volume = volume;
            return true;
        }
        return false;
    }

    /**
     * Set continuous mode
     */
    setContinuous(continuous) {
        this.settings.continuous = continuous;
        if (this.recognition) {
            this.recognition.continuous = continuous;
        }
    }

    /**
     * Check if listening
     */
    getIsListening() {
        return this.isListening;
    }

    /**
     * Check if speaking
     */
    getIsSpeaking() {
        return this.synthesis && this.synthesis.speaking;
    }

    /**
     * Check if voice recognition is available
     */
    isRecognitionAvailable() {
        return this.recognition !== null;
    }

    /**
     * Check if text-to-speech is available
     */
    isSynthesisAvailable() {
        return this.synthesis !== null;
    }

    /**
     * Get current settings
     */
    getSettings() {
        return {
            ...this.settings,
            voice: this.selectedVoice?.name,
            voiceCount: this.voices.length
        };
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        const languages = new Set();
        this.voices.forEach(voice => {
            languages.add(voice.lang);
        });
        return Array.from(languages).sort();
    }
}

export default VoiceSkill;