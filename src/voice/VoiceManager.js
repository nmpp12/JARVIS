export class VoiceManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.onVoiceActivity = null;
        
        this.initializeSpeechRecognition();
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        }

        if (this.recognition) {
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
            };

            this.recognition.onend = () => {
                this.isListening = false;
                if (this.onVoiceActivity) {
                    this.onVoiceActivity(0);
                }
            };

            this.recognition.onaudiostart = () => {
                if (this.onVoiceActivity) {
                    this.onVoiceActivity(0.5);
                }
            };

            this.recognition.onsoundstart = () => {
                if (this.onVoiceActivity) {
                    this.onVoiceActivity(0.8);
                }
            };

            this.recognition.onspeechstart = () => {
                if (this.onVoiceActivity) {
                    this.onVoiceActivity(1.0);
                }
            };
        }
    }

    async listen() {
        return new Promise((resolve, reject) => {
            if (!this.recognition) {
                reject(new Error('Speech recognition not supported'));
                return;
            }

            let finalTranscript = '';

            this.recognition.onresult = (event) => {
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                // Update voice activity based on speech
                if (this.onVoiceActivity) {
                    const activity = interimTranscript.length > 0 ? 1.0 : 0.5;
                    this.onVoiceActivity(activity);
                }
            };

            this.recognition.onend = () => {
                resolve(finalTranscript.trim());
            };

            this.recognition.onerror = (event) => {
                reject(new Error(`Speech recognition error: ${event.error}`));
            };

            this.recognition.start();
        });
    }

    async speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configure voice settings
            utterance.rate = options.rate || 0.9;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 0.8;

            // Try to use a more natural voice
            const voices = this.synthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.name.includes('Google') || 
                voice.name.includes('Microsoft') ||
                voice.lang.startsWith('en')
            );
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

            this.synthesis.speak(utterance);
        });
    }

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
}