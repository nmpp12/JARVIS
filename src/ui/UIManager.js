export class UIManager {
    constructor() {
        this.app = document.getElementById('app');
        this.messages = [];
        this.currentStatus = 'offline';
        this.onTextInput = null;
        this.onVoiceCommand = null;
        this.onModelChange = null;
        this.onSelfImprovementToggle = null;
    }

    render() {
        this.app.innerHTML = `
            <div class="jarvis-container">
                <header class="jarvis-header">
                    <div class="logo">
                        <div class="arc-reactor"></div>
                        <h1>JARVIS</h1>
                    </div>
                    <div class="status-indicator ${this.currentStatus}">
                        <span class="status-dot"></span>
                        <span class="status-text">${this.currentStatus.toUpperCase()}</span>
                    </div>
                </header>

                <div class="main-content">
                    <div class="chat-container">
                        <div class="messages" id="messages"></div>
                        <div class="voice-visualizer" id="voiceVisualizer">
                            <div class="voice-bars">
                                ${Array(20).fill(0).map(() => '<div class="voice-bar"></div>').join('')}
                            </div>
                        </div>
                    </div>

                    <div class="control-panel">
                        <div class="model-selector">
                            <label>AI Model:</label>
                            <select id="modelSelect">
                                <option value="">Select Model...</option>
                            </select>
                        </div>
                        
                        <div class="improvement-toggle">
                            <label>
                                <input type="checkbox" id="selfImprovementToggle">
                                Self-Improvement
                            </label>
                        </div>
                    </div>

                    <div class="input-area">
                        <div class="input-container">
                            <input type="text" id="textInput" placeholder="Ask JARVIS anything..." />
                            <button id="voiceButton" class="voice-btn">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                    <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="code-improvement-panel" id="codeImprovementPanel" style="display: none;">
                    <h3>Code Improvements</h3>
                    <div class="improvements-list" id="improvementsList"></div>
                    <button id="applyImprovements" class="apply-btn">Apply Improvements</button>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.renderMessages();
    }

    setupEventListeners() {
        const textInput = document.getElementById('textInput');
        const voiceButton = document.getElementById('voiceButton');
        const modelSelect = document.getElementById('modelSelect');
        const selfImprovementToggle = document.getElementById('selfImprovementToggle');

        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && textInput.value.trim()) {
                if (this.onTextInput) {
                    this.onTextInput(textInput.value.trim());
                    textInput.value = '';
                }
            }
        });

        voiceButton.addEventListener('click', () => {
            if (this.onVoiceCommand) {
                this.onVoiceCommand();
            }
        });

        modelSelect.addEventListener('change', (e) => {
            if (this.onModelChange && e.target.value) {
                this.onModelChange(e.target.value);
            }
        });

        selfImprovementToggle.addEventListener('change', (e) => {
            if (this.onSelfImprovementToggle) {
                this.onSelfImprovementToggle(e.target.checked);
            }
        });
    }

    addMessage(type, content) {
        const message = {
            id: Date.now(),
            type,
            content,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);
        this.renderMessages();
        this.scrollToBottom();
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = this.messages.map(message => `
            <div class="message ${message.type}">
                <div class="message-header">
                    <span class="message-type">${this.getMessageTypeLabel(message.type)}</span>
                    <span class="message-time">${this.formatTime(message.timestamp)}</span>
                </div>
                <div class="message-content">${this.formatMessageContent(message.content)}</div>
            </div>
        `).join('');
    }

    getMessageTypeLabel(type) {
        const labels = {
            user: 'You',
            assistant: 'JARVIS',
            system: 'System',
            error: 'Error'
        };
        return labels[type] || type;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }

    formatMessageContent(content) {
        // Basic markdown-like formatting
        return content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    updateStatus(status) {
        this.currentStatus = status;
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        if (statusIndicator && statusText) {
            statusIndicator.className = `status-indicator ${status}`;
            statusText.textContent = status.toUpperCase();
        }
    }

    updateModelList(models) {
        const modelSelect = document.getElementById('modelSelect');
        if (!modelSelect) return;

        modelSelect.innerHTML = '<option value="">Select Model...</option>' +
            models.map(model => `<option value="${model}">${model}</option>`).join('');
    }

    updateVoiceLevel(level) {
        const voiceBars = document.querySelectorAll('.voice-bar');
        const activeCount = Math.floor(level * voiceBars.length);
        
        voiceBars.forEach((bar, index) => {
            bar.classList.toggle('active', index < activeCount);
        });
    }

    showCodeImprovement(improvements) {
        const panel = document.getElementById('codeImprovementPanel');
        const list = document.getElementById('improvementsList');
        
        if (!panel || !list) return;

        list.innerHTML = improvements.map(improvement => `
            <div class="improvement-item">
                <div class="improvement-type">${improvement.type}</div>
                <div class="improvement-description">${improvement.description}</div>
                <div class="improvement-location">${improvement.file}:${improvement.line}</div>
            </div>
        `).join('');

        panel.style.display = 'block';
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}