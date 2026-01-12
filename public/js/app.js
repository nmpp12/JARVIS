/**
 * JARVIS Desktop App - Main Application
 */

import { JarvisCore } from '../../src/core/JarvisCore.js';
import { ChatUI } from './ui/chat.js';
import { TasksUI } from './ui/tasks.js';
import { CalendarUI } from './ui/calendar.js';
import { CodeUI } from './ui/code.js';
import { AutomationsUI } from './ui/automations.js';
import { MemoryUI } from './ui/memory.js';
import { SettingsUI } from './ui/settings.js';

class JarvisApp {
    constructor() {
        this.jarvis = null;
        this.currentView = 'chat';
        this.ui = {};
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('🚀 Starting JARVIS Desktop App...');
            
            // Show loading overlay
            this.showLoading('Initializing JARVIS...');

            // Initialize JARVIS Core
            this.jarvis = new JarvisCore();
            await this.jarvis.initialize();

            // Initialize UI Components
            await this.initializeUI();

            // Setup event listeners
            this.setupEventListeners();

            // Setup window controls
            this.setupWindowControls();

            // Hide loading overlay
            this.hideLoading();

            // Show welcome message
            this.showWelcome();

            this.isInitialized = true;
            console.log('✅ JARVIS Desktop App initialized');

        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to initialize JARVIS. Please check the console.');
        }
    }

    /**
     * Initialize UI components
     */
    async initializeUI() {
        console.log('🎨 Initializing UI components...');

        this.ui.chat = new ChatUI(this.jarvis);
        this.ui.tasks = new TasksUI(this.jarvis);
        this.ui.calendar = new CalendarUI(this.jarvis);
        this.ui.code = new CodeUI(this.jarvis);
        this.ui.automations = new AutomationsUI(this.jarvis);
        this.ui.memory = new MemoryUI(this.jarvis);
        this.ui.settings = new SettingsUI(this.jarvis);

        // Initialize each UI component
        await Promise.all([
            this.ui.chat.initialize(),
            this.ui.tasks.initialize(),
            this.ui.calendar.initialize(),
            this.ui.code.initialize(),
            this.ui.automations.initialize(),
            this.ui.memory.initialize(),
            this.ui.settings.initialize()
        ]);

        console.log('✅ UI components initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Model selection
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.changeModel(e.target.value);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcut(e);
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Setup window controls (minimize, maximize, close)
     */
    setupWindowControls() {
        const btnMinimize = document.getElementById('btnMinimize');
        
        if (btnMinimize) {
            btnMinimize.addEventListener('click', () => {
                if (window.electronAPI) {
                    window.electronAPI.minimize();
                }
            });
        }
    }

    /**
     * Switch between views
     */
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const view = document.getElementById(`${viewName}View`);
        if (view) {
            view.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            }
        });

        this.currentView = viewName;

        // Refresh view if needed
        if (this.ui[viewName] && this.ui[viewName].refresh) {
            this.ui[viewName].refresh();
        }
    }

    /**
     * Change AI model
     */
    async changeModel(modelName) {
        try {
            console.log(`🔄 Switching to model: ${modelName}`);
            this.showLoading('Switching model...');
            
            await this.jarvis.config.set('ollama.model', modelName);
            
            this.hideLoading();
            this.showNotification(`Switched to ${modelName}`, 'success');
        } catch (error) {
            console.error('Failed to switch model:', error);
            this.showNotification('Failed to switch model', 'error');
            this.hideLoading();
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcut(e) {
        // Ctrl/Cmd + K - Focus chat input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.switchView('chat');
            document.getElementById('chatInput')?.focus();
        }

        // Ctrl/Cmd + , - Open settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            this.switchView('settings');
        }

        // Ctrl/Cmd + N - New chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (this.ui.chat && this.ui.chat.clearChat) {
                this.ui.chat.clearChat();
            }
        }
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            const text = overlay.querySelector('p');
            if (text) text.textContent = message;
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Show welcome message
     */
    showWelcome() {
        const greeting = this.jarvis.personality?.getGreeting() || 
            'Good evening. I\'m JARVIS, your AI assistant. How may I help you today?';
        
        // This will be handled by ChatUI
        console.log('👋', greeting);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.textContent = message;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Position it
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.zIndex = '10000';
        notification.style.maxWidth = '300px';
        
        // Style based on type
        if (type === 'success') {
            notification.style.background = 'var(--success)';
            notification.style.color = 'white';
        } else if (type === 'error') {
            notification.style.background = 'var(--danger)';
            notification.style.color = 'white';
        } else {
            notification.style.background = 'var(--primary)';
            notification.style.color = 'white';
        }
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Show error message
     */
    showError(message) {
        this.hideLoading();
        
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div style="text-align: center; max-width: 400px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="margin-bottom: 10px; color: var(--danger);">Error</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">${message}</p>
                    <button class="btn-primary" onclick="location.reload()">Reload App</button>
                </div>
            `;
        }
    }

    /**
     * Cleanup before closing
     */
    cleanup() {
        console.log('🧹 Cleaning up...');
        
        // Save state
        if (this.jarvis) {
            // Save any pending data
            if (this.jarvis.memory) {
                this.jarvis.memory.saveMemory();
            }
            if (this.jarvis.learning) {
                this.jarvis.learning.saveLearningData();
            }
        }
        
        console.log('✅ Cleanup complete');
    }

    /**
     * Get current JARVIS instance
     */
    getJarvis() {
        return this.jarvis;
    }

    /**
     * Get current view
     */
    getCurrentView() {
        return this.currentView;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

async function initApp() {
    window.jarvisApp = new JarvisApp();
    await window.jarvisApp.initialize();
}

export default JarvisApp;