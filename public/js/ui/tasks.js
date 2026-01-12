/**
 * Tasks UI Component
 */

export class TasksUI {
    constructor(jarvis) {
        this.jarvis = jarvis;
        this.taskList = null;
        this.tasks = [];
    }

    async initialize() {
        console.log('✅ Initializing Tasks UI...');
        
        this.taskList = document.getElementById('taskList');
        
        // Load tasks from task plugin
        if (this.jarvis.taskManager) {
            this.tasks = this.jarvis.taskManager.getTasks();
        }
        
        this.render();
        this.setupEventListeners();
        
        console.log('✅ Tasks UI initialized');
    }

    setupEventListeners() {
        document.getElementById('btnAddTask')?.addEventListener('click', () => {
            this.showAddTaskDialog();
        });
    }

    render() {
        if (!this.taskList) return;
        
        if (this.tasks.length === 0) {
            this.taskList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No tasks yet. Click "Add Task" to create one.</p>';
            return;
        }
        
        this.taskList.innerHTML = this.tasks.map(task => `
            <div class="task-item" data-id="${task.id}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        ${task.dueDate ? `<span>📅 ${task.dueDate}</span>` : ''}
                        ${task.priority ? `<span>🔺 ${task.priority}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-icon" onclick="window.jarvisApp.ui.tasks.editTask(${task.id})">✏️</button>
                    <button class="btn-icon" onclick="window.jarvisApp.ui.tasks.deleteTask(${task.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    showAddTaskDialog() {
        const title = prompt('Task title:');
        if (title) {
            this.addTask({ title });
        }
    }

    addTask(taskData) {
        if (this.jarvis.taskManager) {
            this.jarvis.taskManager.addTask(taskData);
            this.tasks = this.jarvis.taskManager.getTasks();
            this.render();
        }
    }

    editTask(id) {
        // Implement edit dialog
        console.log('Edit task:', id);
    }

    deleteTask(id) {
        if (confirm('Delete this task?')) {
            if (this.jarvis.taskManager) {
                this.jarvis.taskManager.deleteTask(id);
                this.tasks = this.jarvis.taskManager.getTasks();
                this.render();
            }
        }
    }

    refresh() {
        if (this.jarvis.taskManager) {
            this.tasks = this.jarvis.taskManager.getTasks();
            this.render();
        }
    }
}

export default TasksUI;