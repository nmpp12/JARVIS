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
                        <span class="subtitle">Advanced AI Assistant & OS Developer</span>
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

                        <div class="os-dev-toggle">
                            <label>
                                <input type="checkbox" id="osDevToggle" checked>
                                OS Development Mode
                            </label>
                        </div>
                    </div>

                    <div class="input-area">
                        <div class="input-container">
                            <input type="text" id="textInput" placeholder="Ask JARVIS about OS development, kernel programming, or anything else..." />
                            <button id="voiceButton" class="voice-btn">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                    <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                </svg>
                            </button>
                        </div>
                        <div class="quick-commands">
                            <button class="quick-cmd" data-command="Create a custom operating system from scratch">Create Custom OS</button>
                            <button class="quick-cmd" data-command="Help me develop a Linux-based operating system">Linux-based OS</button>
                            <button class="quick-cmd" data-command="Build an Ubuntu-based custom distribution">Ubuntu Derivative</button>
                            <button class="quick-cmd" data-command="Explain kernel development">Kernel Development</button>
                            <button class="quick-cmd" data-command="How to create device drivers">Device Drivers</button>
                            <button class="quick-cmd" data-command="Filesystem development guide">Filesystem Dev</button>
                        </div>
                    </div>
                </div>

                <div class="code-improvement-panel" id="codeImprovementPanel" style="display: none;">
                    <h3>Code Improvements</h3>
                    <div class="improvements-list" id="improvementsList"></div>
                    <button id="applyImprovements" class="apply-btn">Apply Improvements</button>
                </div>

                <div class="os-project-panel" id="osProjectPanel" style="display: none;">
                    <h3>OS Development Project</h3>
                    <div class="project-info" id="projectInfo"></div>
                    <div class="project-files" id="projectFiles"></div>
                    <div class="build-commands" id="buildCommands"></div>
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
        const quickCommands = document.querySelectorAll('.quick-cmd');

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

        quickCommands.forEach(button => {
            button.addEventListener('click', () => {
                const command = button.getAttribute('data-command');
                if (this.onTextInput) {
                    this.onTextInput(command);
                }
            });
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
            error: 'Error',
            warning: 'Warning'
        };
        return labels[type] || type;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }

    formatMessageContent(content) {
        // Enhanced markdown-like formatting for OS development content
        return content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
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

    showOSProject(project) {
        const panel = document.getElementById('osProjectPanel');
        const info = document.getElementById('projectInfo');
        const files = document.getElementById('projectFiles');
        const commands = document.getElementById('buildCommands');
        
        if (!panel || !info || !files || !commands) return;

        info.innerHTML = `
            <div class="project-details">
                <h4>${project.projectName}</h4>
                <p><strong>Type:</strong> ${project.type}</p>
                <p><strong>Architecture:</strong> ${project.architecture}</p>
                <p><strong>Components:</strong> ${project.steps.length} build steps</p>
            </div>
        `;

        files.innerHTML = `
            <h4>Generated Files</h4>
            <div class="file-list">
                ${project.files.map(file => `
                    <div class="file-item">
                        <span class="file-path">${file.path}</span>
                        <span class="file-size">${Math.round(file.content.length / 1024)}KB</span>
                    </div>
                `).join('')}
            </div>
        `;

        commands.innerHTML = `
            <h4>Build Commands</h4>
            <div class="command-list">
                ${project.buildCommands.map(cmd => `
                    <div class="command-item">
                        <code>${cmd}</code>
                    </div>
                `).join('')}
            </div>
        `;

        panel.style.display = 'block';
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}