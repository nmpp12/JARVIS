/**
 * Task Plugin
 * Manages tasks, to-do lists, and reminders
 */

import BasePlugin from './BasePlugin.js';

export class TaskPlugin extends BasePlugin {
    constructor() {
        super('task', 'Manages tasks, to-do lists, and reminders');
        this.tasks = [];
        this.nextId = 1;
    }

    async initialize() {
        await super.initialize();
        this.loadTasks();
        this.log('Task plugin ready');
        return true;
    }

    /**
     * Validate parameters
     */
    validate(params) {
        if (!params.action) {
            return false;
        }
        
        if (params.action === 'add' && !params.description) {
            return false;
        }
        
        return true;
    }

    /**
     * Execute task operation
     */
    async execute(params) {
        try {
            const action = params.action;

            switch (action) {
                case 'add':
                    return this.addTask(params);
                case 'list':
                    return this.listTasks(params.filter);
                case 'complete':
                    return this.completeTask(params.id);
                case 'delete':
                    return this.deleteTask(params.id);
                case 'update':
                    return this.updateTask(params.id, params);
                case 'search':
                    return this.searchTasks(params.query);
                default:
                    return this.listTasks();
            }
        } catch (error) {
            return this.handleError(error, 'executing task operation');
        }
    }

    /**
     * Add a new task
     */
    addTask(params) {
        const task = {
            id: this.nextId++,
            description: params.description,
            status: 'pending',
            priority: params.priority || 'medium',
            deadline: params.deadline || null,
            tags: params.tags || [],
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.tasks.push(task);
        this.saveTasks();

        this.log(`Task added: ${task.description}`);
        return `✅ Task added: "${task.description}" (ID: ${task.id})`;
    }

    /**
     * List tasks
     */
    listTasks(filter = 'all') {
        let filteredTasks = this.tasks;

        switch (filter) {
            case 'pending':
                filteredTasks = this.tasks.filter(t => t.status === 'pending');
                break;
            case 'completed':
                filteredTasks = this.tasks.filter(t => t.status === 'completed');
                break;
            case 'high':
                filteredTasks = this.tasks.filter(t => t.priority === 'high');
                break;
        }

        if (filteredTasks.length === 0) {
            return 'No tasks found.';
        }

        return this.formatTaskList(filteredTasks);
    }

    /**
     * Complete a task
     */
    completeTask(id) {
        const task = this.tasks.find(t => t.id === id);

        if (!task) {
            return `❌ Task not found: ${id}`;
        }

        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        this.saveTasks();

        this.log(`Task completed: ${task.description}`);
        return `✅ Task completed: "${task.description}"`;
    }

    /**
     * Delete a task
     */
    deleteTask(id) {
        const index = this.tasks.findIndex(t => t.id === id);

        if (index === -1) {
            return `❌ Task not found: ${id}`;
        }

        const task = this.tasks[index];
        this.tasks.splice(index, 1);
        this.saveTasks();

        this.log(`Task deleted: ${task.description}`);
        return `🗑️ Task deleted: "${task.description}"`;
    }

    /**
     * Update a task
     */
    updateTask(id, updates) {
        const task = this.tasks.find(t => t.id === id);

        if (!task) {
            return `❌ Task not found: ${id}`;
        }

        if (updates.description) task.description = updates.description;
        if (updates.priority) task.priority = updates.priority;
        if (updates.deadline) task.deadline = updates.deadline;
        if (updates.tags) task.tags = updates.tags;

        this.saveTasks();

        this.log(`Task updated: ${task.description}`);
        return `✏️ Task updated: "${task.description}"`;
    }

    /**
     * Search tasks
     */
    searchTasks(query) {
        const lowerQuery = query.toLowerCase();
        const results = this.tasks.filter(task => 
            task.description.toLowerCase().includes(lowerQuery) ||
            task.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );

        if (results.length === 0) {
            return `No tasks found matching "${query}".`;
        }

        return this.formatTaskList(results);
    }

    /**
     * Format task list for display
     */
    formatTaskList(tasks) {
        const lines = ['Your tasks:\n'];

        tasks.forEach(task => {
            const statusIcon = task.status === 'completed' ? '✅' : '⏳';
            const priorityIcon = this.getPriorityIcon(task.priority);
            
            lines.push(
                `${statusIcon} ${priorityIcon} [${task.id}] ${task.description}`,
                `   Priority: ${task.priority}`,
                task.deadline ? `   Deadline: ${task.deadline}` : '',
                task.tags.length > 0 ? `   Tags: ${task.tags.join(', ')}` : '',
                ''
            );
        });

        return lines.join('\n');
    }

    /**
     * Get priority icon
     */
    getPriorityIcon(priority) {
        switch (priority) {
            case 'high':
                return '🔴';
            case 'medium':
                return '🟡';
            case 'low':
                return '🟢';
            default:
                return '⚪';
        }
    }

    /**
     * Get task statistics
     */
    getStatistics() {
        const total = this.tasks.length;
        const pending = this.tasks.filter(t => t.status === 'pending').length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const high = this.tasks.filter(t => t.priority === 'high' && t.status === 'pending').length;

        return {
            total,
            pending,
            completed,
            highPriority: high,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    /**
     * Get overdue tasks
     */
    getOverdueTasks() {
        const now = new Date();
        return this.tasks.filter(task => {
            if (!task.deadline || task.status === 'completed') return false;
            return new Date(task.deadline) < now;
        });
    }

    /**
     * Save tasks to storage
     */
    saveTasks() {
        try {
            localStorage.setItem('jarvis_tasks', JSON.stringify(this.tasks));
            localStorage.setItem('jarvis_task_nextid', this.nextId.toString());
        } catch (error) {
            this.log('Failed to save tasks', 'error');
        }
    }

    /**
     * Load tasks from storage
     */
    loadTasks() {
        try {
            const saved = localStorage.getItem('jarvis_tasks');
            if (saved) {
                this.tasks = JSON.parse(saved);
            }

            const nextId = localStorage.getItem('jarvis_task_nextid');
            if (nextId) {
                this.nextId = parseInt(nextId);
            }

            this.log(`Loaded ${this.tasks.length} tasks`);
        } catch (error) {
            this.log('Failed to load tasks', 'error');
        }
    }

    /**
     * Clear all tasks
     */
    clearAll() {
        this.tasks = [];
        this.nextId = 1;
        this.saveTasks();
        this.log('All tasks cleared');
        return 'All tasks have been cleared.';
    }
}

export default TaskPlugin;