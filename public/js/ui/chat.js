/**
 * Chat UI Component
 */

export class ChatUI {
    constructor(jarvis) {
        this.jarvis = jarvis;
        this.messagesContainer = null;
        this.inputField = null;
        this.sendButton = null;
        this.voiceButton = null;
        this.isListening = false;
    }

    /**
     * Initialize chat UI
     */
    async initialize() {
        console.log('💬 Initializing Chat UI...');

        // Get DOM elements
        this.messagesContainer = document.getElementById('chatMessages');
        this.inputField = document.getElementById('chatInput');
        this.sendButton = document.getElementById('btnSend');
        this.voiceButton = document.getElementById('btnVoice');
        this.clearButton = document.getElementById('btnClearChat');

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ Chat UI initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Send button
        this.sendButton?.addEventListener('click', () => this.sendMessage());

        // Input field - Enter to send
        this.inputField?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.inputField?.addEventListener('input', () => {
            this.autoResizeInput();
        });

        // Voice button
        this.voiceButton?.addEventListener('click', () => this.toggleVoiceInput());

        // Clear chat button
        this.clearButton?.addEventListener('click', () => this.clearChat());
    }

    /**
     * Send message
     */
    async sendMessage() {
        const message = this.inputField?.value.trim();
        
        if (!message) return;

        // Add user message to chat
        this.addMessage('user', message);

        // Clear input
        this.inputField.value = '';
        this.autoResizeInput();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Get response from JARVIS
            const response = await this.jarvis.processQuery(message);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add assistant response
            this.addMessage('assistant', response);

            // Speak response if enabled
            if (this.jarvis.voice && this.jarvis.config.get('voice.enabled')) {
                this.jarvis.voice.speak(response);
            }

        } catch (error) {
            console.error('Error getting response:', error);
            this.hideTypingIndicator();
            this.addMessage('assistant', 'I apologize, but I encountered an error processing your request.');
        }
    }

    /**
     * Add message to chat
     */
    addMessage(type, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = type === 'user' ? 'U' : 'J';

        const content = document.createElement('div');
        content.className = 'message-content';

        const header = document.createElement('div');
        header.className = 'message-header';

        const sender = document.createElement('span');
        sender.className = 'message-sender';
        sender.textContent = type === 'user' ? 'You' : 'JARVIS';

        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = this.formatTime(new Date());

        header.appendChild(sender);
        header.appendChild(time);

        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = text;

        content.appendChild(header);
        content.appendChild(messageText);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        this.messagesContainer?.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.className = 'message assistant';
        indicator.innerHTML = `
            <div class="message-avatar">J</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        this.messagesContainer?.appendChild(indicator);
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        indicator?.remove();
    }

    /**
     * Toggle voice input
     */
    toggleVoiceInput() {
        if (!this.jarvis.voice) {
            console.warn('Voice skill not available');
            return;
        }

        if (this.isListening) {
            this.jarvis.voice.stopListening();
            this.isListening = false;
            this.voiceButton?.classList.remove('active');
        } else {
            this.jarvis.voice.startListening({
                onResult: (text) => {
                    this.inputField.value = text;
                    this.autoResizeInput();
                },
                onEnd: () => {
                    this.isListening = false;
                    this.voiceButton?.classList.remove('active');
                }
            });
            this.isListening = true;
            this.voiceButton?.classList.add('active');
        }
    }

    /**
     * Clear chat
     */
    clearChat() {
        if (confirm('Are you sure you want to clear the chat?')) {
            this.messagesContainer.innerHTML = '';
            // Add welcome message back
            const greeting = this.jarvis.personality?.getGreeting() || 
                'Good evening. I\'m JARVIS, your AI assistant. How may I help you today?';
            this.addMessage('assistant', greeting);
        }
    }

    /**
     * Auto-resize input textarea
     */
    autoResizeInput() {
        if (!this.inputField) return;
        
        this.inputField.style.height = 'auto';
        this.inputField.style.height = this.inputField.scrollHeight + 'px';
    }

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    /**
     * Format time
     */
    formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * Refresh view
     */
    refresh() {
        // Nothing to refresh for now
    }
}

export default ChatUI;