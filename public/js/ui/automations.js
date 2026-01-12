/**
 * Automations UI Component
 */

export class AutomationsUI {
    constructor(jarvis) {
        this.jarvis = jarvis;
        this.list = null;
        this.currentTab = 'routines';
    }

    async initialize() {
        console.log('⚙️ Initializing Automations UI...');
        
        this.list = document.getElementById('automationList');
        
        this.setupEventListeners();
        this.render();
        
        console.log('✅ Automations UI initialized');
    }

    setupEventListeners() {
        document.querySelectorAll('.automation-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        document.getElementById('btnCreateAutomation')?.addEventListener('click', () => {
            this.showCreateDialog();
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        document.querySelectorAll('.automation-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        this.render();
    }

    render() {
        if (!this.list) return;
        
        let content = '';
        
        if (this.currentTab === 'routines') {
            const routines = this.jarvis.automation?.listRoutines() || [];
            content = this.renderRoutines(routines);
        } else if (this.currentTab === 'workflows') {
            const workflows = this.jarvis.automation?.listWorkflows() || [];
            content = this.renderWorkflows(workflows);
        } else if (this.currentTab === 'scheduled') {
            content = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">Scheduled actions view coming soon...</p>';
        }
        
        this.list.innerHTML = content || '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No automations yet.</p>';
    }

    renderRoutines(routines) {
        if (routines.length === 0) return '';
        
        return routines.map(r => `
            <div class="task-item">
                <div class="task-content">
                    <div class="task-title">${r.name}</div>
                    <div class="task-meta">
                        <span>🔁 ${r.schedule}</span>
                        <span>⏰ ${r.time}</span>
                        <span>${r.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderWorkflows(workflows) {
        if (workflows.length === 0) return '';
        
        return workflows.map(w => `
            <div class="task-item">
                <div class="task-content">
                    <div class="task-title">${w.name}</div>
                    <div class="task-meta">
                        <span>⚡ ${w.trigger}</span>
                        <span>📊 Runs: ${w.runCount}</span>
                        <span>${w.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showCreateDialog() {
        alert('Create automation dialog coming soon!');
    }

    refresh() {
        this.render();
    }
}

export default AutomationsUI;