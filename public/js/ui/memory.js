/**
 * Memory UI Component
 */

export class MemoryUI {
    constructor(jarvis) {
        this.jarvis = jarvis;
        this.statsContainer = null;
        this.contentContainer = null;
        this.currentTab = 'short';
    }

    async initialize() {
        console.log('🧠 Initializing Memory UI...');
        
        this.statsContainer = document.getElementById('memoryStats');
        this.contentContainer = document.getElementById('memoryContent');
        
        this.setupEventListeners();
        this.render();
        
        console.log('✅ Memory UI initialized');
    }

    setupEventListeners() {
        document.querySelectorAll('.memory-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        document.getElementById('btnExportMemory')?.addEventListener('click', () => {
            this.exportMemory();
        });

        document.getElementById('btnClearMemory')?.addEventListener('click', () => {
            this.clearMemory();
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        document.querySelectorAll('.memory-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        this.renderContent();
    }

    render() {
        this.renderStats();
        this.renderContent();
    }

    renderStats() {
        if (!this.statsContainer || !this.jarvis.memory) return;
        
        const stats = this.jarvis.memory.getStats();
        
        this.statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.shortTermCount}</div>
                <div class="stat-label">Short-term</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.longTermCount}</div>
                <div class="stat-label">Long-term</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.entityCount}</div>
                <div class="stat-label">Entities</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.contextSize}</div>
                <div class="stat-label">Context Size</div>
            </div>
        `;
    }

    renderContent() {
        if (!this.contentContainer || !this.jarvis.memory) return;
        
        let items = [];
        
        if (this.currentTab === 'short') {
            items = this.jarvis.memory.getShortTermMemory();
        } else if (this.currentTab === 'long') {
            items = this.jarvis.memory.getLongTermMemory().slice(0, 50);
        } else if (this.currentTab === 'entities') {
            const entities = this.jarvis.memory.getAllEntities();
            this.contentContainer.innerHTML = this.renderEntities(entities);
            return;
        }
        
        if (items.length === 0) {
            this.contentContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No memory items.</p>';
            return;
        }
        
        this.contentContainer.innerHTML = items.map(item => `
            <div class="task-item" style="margin-bottom: 12px;">
                <div class="task-content">
                    <div class="task-title">${item.content || item.query || 'Memory item'}</div>
                    <div class="task-meta">
                        <span>📅 ${new Date(item.timestamp).toLocaleString()}</span>
                        ${item.importance ? `<span>⭐ ${item.importance}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderEntities(entities) {
        if (entities.length === 0) {
            return '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No entities learned.</p>';
        }
        
        return entities.map(entity => `
            <div class="task-item" style="margin-bottom: 12px;">
                <div class="task-content">
                    <div class="task-title">${entity.name}</div>
                    <div class="task-meta">
                        <span>🏷️ ${entity.type}</span>
                        <span>📊 Count: ${entity.count}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    exportMemory() {
        if (!this.jarvis.memory) return;
        
        const data = {
            shortTerm: this.jarvis.memory.getShortTermMemory(),
            longTerm: this.jarvis.memory.getLongTermMemory(),
            entities: this.jarvis.memory.getAllEntities()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jarvis-memory-${Date.now()}.json`;
        a.click();
    }

    clearMemory() {
        if (confirm('Are you sure you want to clear all memory? This cannot be undone.')) {
            if (this.jarvis.memory) {
                this.jarvis.memory.clearAll();
                this.render();
            }
        }
    }

    refresh() {
        this.render();
    }
}

export default MemoryUI;