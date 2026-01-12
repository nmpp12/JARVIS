import { BasePlugin } from './BasePlugin.js';

/**
 * TaskPlugin - Task and TODO list management
 * Provides comprehensive task tracking and project management
 */
export class TaskPlugin extends BasePlugin {
  constructor() {
    super();
    this.name = 'task';
    this.version = '1.0.0';
    this.description = 'Manages tasks, todos, and project tracking';
    this.capabilities = ['tasks', 'todos', 'projects'];
    this.tasks = [];
    this.projects = [];
  }

  async initialize() {
    await super.initialize();
    await this.loadTasks();
  }

  async handleRequest(request) {
    const { action, data } = request;

    try {
      switch (action) {
        case 'create_task':
          return await this.createTask(data);
        case 'get_tasks':
          return await this.getTasks(data.filter);
        case 'update_task':
          return await this.updateTask(data.id, data.updates);
        case 'complete_task':
          return await this.completeTask(data.id);
        case 'delete_task':
          return await this.deleteTask(data.id);
        case 'create_project':
          return await this.createProject(data);
        case 'get_project_tasks':
          return await this.getProjectTasks(data.projectId);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    const task = {
      id: this.generateTaskId(),
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      projectId: taskData.projectId || null,
      tags: taskData.tags || [],
      subtasks: taskData.subtasks || [],
      created: new Date(),
      modified: new Date(),
      completed: null
    };

    this.tasks.push(task);
    await this.saveTasks();

    return {
      success: true,
      task,
      message: 'Task created successfully'
    };
  }

  /**
   * Get tasks with optional filtering
   */
  async getTasks(filter = {}) {
    let filtered = [...this.tasks];

    // Apply filters
    if (filter.status) {
      filtered = filtered.filter(t => t.status === filter.status);
    }

    if (filter.priority) {
      filtered = filtered.filter(t => t.priority === filter.priority);
    }

    if (filter.projectId) {
      filtered = filtered.filter(t => t.projectId === filter.projectId);
    }

    if (filter.tag) {
      filtered = filtered.filter(t => t.tags.includes(filter.tag));
    }

    if (filter.dueSoon) {
      const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => t.dueDate && t.dueDate <= soon);
    }

    // Sort by priority and due date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => {
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate - b.dueDate;
      }
      return 0;
    });

    return {
      success: true,
      count: filtered.length,
      tasks: filtered
    };
  }

  /**
   * Update a task
   */
  async updateTask(taskId, updates) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const task = this.tasks[taskIndex];
    Object.assign(task, updates, { modified: new Date() });
    
    await this.saveTasks();

    return {
      success: true,
      task,
      message: 'Task updated successfully'
    };
  }

  /**
   * Mark task as complete
   */
  async completeTask(taskId) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const task = this.tasks[taskIndex];
    task.status = 'completed';
    task.completed = new Date();
    task.modified = new Date();
    
    await this.saveTasks();

    return {
      success: true,
      task,
      message: 'Task completed!'
    };
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    
    if (this.tasks.length === initialLength) {
      throw new Error('Task not found');
    }

    await this.saveTasks();

    return {
      success: true,
      message: 'Task deleted successfully'
    };
  }

  /**
   * Create a project
   */
  async createProject(projectData) {
    const project = {
      id: this.generateTaskId(),
      name: projectData.name,
      description: projectData.description || '',
      status: projectData.status || 'active',
      color: projectData.color || '#3b82f6',
      created: new Date(),
      modified: new Date()
    };

    this.projects.push(project);
    await this.saveTasks();

    return {
      success: true,
      project,
      message: 'Project created successfully'
    };
  }

  /**
   * Get tasks for a specific project
   */
  async getProjectTasks(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = this.tasks.filter(t => t.projectId === projectId);
    
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      todo: tasks.filter(t => t.status === 'todo').length
    };

    return {
      success: true,
      project,
      tasks,
      stats
    };
  }

  /**
   * Get task statistics
   */
  getStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const overdue = this.tasks.filter(t => 
      t.dueDate && t.dueDate < new Date() && t.status !== 'completed'
    ).length;

    return {
      total,
      completed,
      overdue,
      completionRate: total > 0 ? (completed / total * 100).toFixed(1) : 0,
      projects: this.projects.length
    };
  }

  /**
   * Load tasks from storage
   */
  async loadTasks() {
    const stored = localStorage.getItem('jarvis_tasks');
    if (stored) {
      const data = JSON.parse(stored);
      this.tasks = data.tasks.map(t => ({
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        created: new Date(t.created),
        modified: new Date(t.modified),
        completed: t.completed ? new Date(t.completed) : null
      }));
      this.projects = data.projects.map(p => ({
        ...p,
        created: new Date(p.created),
        modified: new Date(p.modified)
      }));
    }
  }

  /**
   * Save tasks to storage
   */
  async saveTasks() {
    const data = {
      tasks: this.tasks,
      projects: this.projects
    };
    localStorage.setItem('jarvis_tasks', JSON.stringify(data));
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown() {
    await this.saveTasks();
    await super.shutdown();
  }
}

export default TaskPlugin;