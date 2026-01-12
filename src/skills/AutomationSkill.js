/**
 * Automation Skill
 * Manages automated workflows, routines, and scheduled actions
 */

export class AutomationSkill {
    constructor() {
        this.routines = [];
        this.workflows = [];
        this.scheduledActions = [];
        this.triggers = [];
        this.nextId = 1;
        this.isRunning = false;
        this.checkInterval = null;
    }

    /**
     * Initialize automation skill
     */
    async initialize() {
        try {
            console.log('⚙️ Initializing Automation Skill...');
            
            this.loadAutomations();
            this.startScheduler();
            
            console.log('✅ Automation Skill initialized');
            console.log(`   Routines: ${this.routines.length}`);
            console.log(`   Workflows: ${this.workflows.length}`);
            console.log(`   Scheduled: ${this.scheduledActions.length}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Automation Skill:', error);
            return false;
        }
    }

    /**
     * Create a routine (recurring automation)
     */
    createRoutine(config) {
        const routine = {
            id: this.nextId++,
            name: config.name,
            description: config.description || '',
            schedule: config.schedule, // e.g., 'daily', 'weekly', 'monthly'
            time: config.time, // e.g., '09:00'
            actions: config.actions || [],
            enabled: true,
            lastRun: null,
            nextRun: this.calculateNextRun(config.schedule, config.time),
            createdAt: new Date().toISOString()
        };

        this.routines.push(routine);
        this.saveAutomations();

        console.log(`🔁 Routine created: ${routine.name}`);
        return routine.id;
    }

    /**
     * Create a workflow (sequence of actions)
     */
    createWorkflow(config) {
        const workflow = {
            id: this.nextId++,
            name: config.name,
            description: config.description || '',
            trigger: config.trigger, // e.g., 'manual', 'event', 'condition'
            steps: config.steps || [],
            enabled: true,
            runCount: 0,
            lastRun: null,
            createdAt: new Date().toISOString()
        };

        this.workflows.push(workflow);
        this.saveAutomations();

        console.log(`🔀 Workflow created: ${workflow.name}`);
        return workflow.id;
    }

    /**
     * Schedule a one-time action
     */
    scheduleAction(config) {
        const action = {
            id: this.nextId++,
            name: config.name,
            action: config.action,
            params: config.params || {},
            scheduledFor: new Date(config.when).toISOString(),
            executed: false,
            result: null,
            createdAt: new Date().toISOString()
        };

        this.scheduledActions.push(action);
        this.saveAutomations();

        console.log(`⏰ Action scheduled: ${action.name} for ${action.scheduledFor}`);
        return action.id;
    }

    /**
     * Create a trigger
     */
    createTrigger(config) {
        const trigger = {
            id: this.nextId++,
            name: config.name,
            type: config.type, // 'time', 'event', 'condition'
            condition: config.condition,
            action: config.action,
            enabled: true,
            triggerCount: 0,
            lastTriggered: null,
            createdAt: new Date().toISOString()
        };

        this.triggers.push(trigger);
        this.saveAutomations();

        console.log(`⚡ Trigger created: ${trigger.name}`);
        return trigger.id;
    }

    /**
     * Execute a routine
     */
    async executeRoutine(routineId) {
        const routine = this.routines.find(r => r.id === routineId);
        
        if (!routine) {
            console.error(`Routine not found: ${routineId}`);
            return false;
        }

        if (!routine.enabled) {
            console.log(`Routine disabled: ${routine.name}`);
            return false;
        }

        console.log(`▶️ Executing routine: ${routine.name}`);

        try {
            // Execute each action in the routine
            for (const action of routine.actions) {
                await this.executeAction(action);
            }

            routine.lastRun = new Date().toISOString();
            routine.nextRun = this.calculateNextRun(routine.schedule, routine.time);
            this.saveAutomations();

            console.log(`✅ Routine completed: ${routine.name}`);
            return true;
        } catch (error) {
            console.error(`❌ Routine failed: ${routine.name}`, error);
            return false;
        }
    }

    /**
     * Execute a workflow
     */
    async executeWorkflow(workflowId) {
        const workflow = this.workflows.find(w => w.id === workflowId);
        
        if (!workflow) {
            console.error(`Workflow not found: ${workflowId}`);
            return false;
        }

        if (!workflow.enabled) {
            console.log(`Workflow disabled: ${workflow.name}`);
            return false;
        }

        console.log(`▶️ Executing workflow: ${workflow.name}`);

        try {
            const results = [];

            // Execute each step
            for (const step of workflow.steps) {
                const result = await this.executeAction(step);
                results.push(result);

                // Stop if step fails and is critical
                if (!result && step.critical) {
                    console.error(`Critical step failed in workflow: ${workflow.name}`);
                    return false;
                }
            }

            workflow.runCount++;
            workflow.lastRun = new Date().toISOString();
            this.saveAutomations();

            console.log(`✅ Workflow completed: ${workflow.name}`);
            return results;
        } catch (error) {
            console.error(`❌ Workflow failed: ${workflow.name}`, error);
            return false;
        }
    }

    /**
     * Execute a single action
     */
    async executeAction(action) {
        console.log(`  ➡️ Action: ${action.type}`);

        try {
            switch (action.type) {
                case 'notification':
                    return this.showNotification(action.params);
                case 'speak':
                    return this.speak(action.params.text);
                case 'reminder':
                    return this.setReminder(action.params);
                case 'task':
                    return this.createTask(action.params);
                case 'weather':
                    return this.checkWeather(action.params);
                case 'custom':
                    return action.handler ? await action.handler(action.params) : true;
                default:
                    console.warn(`Unknown action type: ${action.type}`);
                    return false;
            }
        } catch (error) {
            console.error(`Action failed:`, error);
            return false;
        }
    }

    /**
     * Calculate next run time
     */
    calculateNextRun(schedule, time) {
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        let nextRun = new Date();
        nextRun.setHours(hours, minutes, 0, 0);

        // If time has passed today, move to next occurrence
        if (nextRun <= now) {
            switch (schedule) {
                case 'daily':
                    nextRun.setDate(nextRun.getDate() + 1);
                    break;
                case 'weekly':
                    nextRun.setDate(nextRun.getDate() + 7);
                    break;
                case 'monthly':
                    nextRun.setMonth(nextRun.getMonth() + 1);
                    break;
            }
        }

        return nextRun.toISOString();
    }

    /**
     * Start the scheduler
     */
    startScheduler() {
        if (this.isRunning) return;

        this.isRunning = true;
        
        // Check every minute
        this.checkInterval = setInterval(() => {
            this.checkSchedule();
        }, 60000);

        console.log('▶️ Scheduler started');
    }

    /**
     * Stop the scheduler
     */
    stopScheduler() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('⏸️ Scheduler stopped');
    }

    /**
     * Check schedule and execute due items
     */
    async checkSchedule() {
        const now = new Date();

        // Check routines
        for (const routine of this.routines) {
            if (routine.enabled && routine.nextRun) {
                const nextRun = new Date(routine.nextRun);
                if (nextRun <= now) {
                    await this.executeRoutine(routine.id);
                }
            }
        }

        // Check scheduled actions
        for (const action of this.scheduledActions) {
            if (!action.executed) {
                const scheduledFor = new Date(action.scheduledFor);
                if (scheduledFor <= now) {
                    await this.executeScheduledAction(action.id);
                }
            }
        }

        // Check triggers
        for (const trigger of this.triggers) {
            if (trigger.enabled) {
                await this.checkTrigger(trigger);
            }
        }
    }

    /**
     * Execute a scheduled action
     */
    async executeScheduledAction(actionId) {
        const action = this.scheduledActions.find(a => a.id === actionId);
        
        if (!action || action.executed) return;

        console.log(`⏰ Executing scheduled action: ${action.name}`);

        try {
            const result = await this.executeAction({
                type: action.action,
                params: action.params
            });

            action.executed = true;
            action.result = result;
            this.saveAutomations();

            console.log(`✅ Scheduled action completed: ${action.name}`);
        } catch (error) {
            console.error(`❌ Scheduled action failed: ${action.name}`, error);
        }
    }

    /**
     * Check if trigger should fire
     */
    async checkTrigger(trigger) {
        // This would evaluate the trigger condition
        // Simplified for now
        return false;
    }

    /**
     * Helper action: Show notification
     */
    showNotification(params) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(params.title || 'JARVIS', {
                body: params.message,
                icon: params.icon || '/icon.png'
            });
            return true;
        }
        return false;
    }

    /**
     * Helper action: Speak
     */
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
            return true;
        }
        return false;
    }

    /**
     * Helper action: Set reminder
     */
    setReminder(params) {
        // Would integrate with calendar/task plugin
        console.log(`Reminder set: ${params.message}`);
        return true;
    }

    /**
     * Helper action: Create task
     */
    createTask(params) {
        // Would integrate with task plugin
        console.log(`Task created: ${params.description}`);
        return true;
    }

    /**
     * Helper action: Check weather
     */
    async checkWeather(params) {
        // Would integrate with weather plugin
        console.log(`Checking weather for: ${params.location}`);
        return true;
    }

    /**
     * List all routines
     */
    listRoutines() {
        return this.routines.map(r => ({
            id: r.id,
            name: r.name,
            schedule: r.schedule,
            time: r.time,
            enabled: r.enabled,
            nextRun: r.nextRun
        }));
    }

    /**
     * List all workflows
     */
    listWorkflows() {
        return this.workflows.map(w => ({
            id: w.id,
            name: w.name,
            trigger: w.trigger,
            enabled: w.enabled,
            runCount: w.runCount
        }));
    }

    /**
     * Get automation statistics
     */
    getStats() {
        return {
            routines: {
                total: this.routines.length,
                enabled: this.routines.filter(r => r.enabled).length
            },
            workflows: {
                total: this.workflows.length,
                enabled: this.workflows.filter(w => w.enabled).length
            },
            scheduled: {
                total: this.scheduledActions.length,
                pending: this.scheduledActions.filter(a => !a.executed).length,
                completed: this.scheduledActions.filter(a => a.executed).length
            },
            triggers: {
                total: this.triggers.length,
                enabled: this.triggers.filter(t => t.enabled).length
            },
            schedulerRunning: this.isRunning
        };
    }

    /**
     * Enable/disable routine
     */
    toggleRoutine(routineId, enabled) {
        const routine = this.routines.find(r => r.id === routineId);
        if (routine) {
            routine.enabled = enabled;
            this.saveAutomations();
            return true;
        }
        return false;
    }

    /**
     * Enable/disable workflow
     */
    toggleWorkflow(workflowId, enabled) {
        const workflow = this.workflows.find(w => w.id === workflowId);
        if (workflow) {
            workflow.enabled = enabled;
            this.saveAutomations();
            return true;
        }
        return false;
    }

    /**
     * Delete routine
     */
    deleteRoutine(routineId) {
        const index = this.routines.findIndex(r => r.id === routineId);
        if (index > -1) {
            this.routines.splice(index, 1);
            this.saveAutomations();
            return true;
        }
        return false;
    }

    /**
     * Delete workflow
     */
    deleteWorkflow(workflowId) {
        const index = this.workflows.findIndex(w => w.id === workflowId);
        if (index > -1) {
            this.workflows.splice(index, 1);
            this.saveAutomations();
            return true;
        }
        return false;
    }

    /**
     * Save automations to storage
     */
    saveAutomations() {
        try {
            const data = {
                routines: this.routines,
                workflows: this.workflows,
                scheduledActions: this.scheduledActions,
                triggers: this.triggers,
                nextId: this.nextId
            };
            localStorage.setItem('jarvis_automations', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save automations:', error);
        }
    }

    /**
     * Load automations from storage
     */
    loadAutomations() {
        try {
            const saved = localStorage.getItem('jarvis_automations');
            if (saved) {
                const data = JSON.parse(saved);
                this.routines = data.routines || [];
                this.workflows = data.workflows || [];
                this.scheduledActions = data.scheduledActions || [];
                this.triggers = data.triggers || [];
                this.nextId = data.nextId || 1;
            }
        } catch (error) {
            console.error('Failed to load automations:', error);
        }
    }

    /**
     * Cleanup on shutdown
     */
    cleanup() {
        this.stopScheduler();
        this.saveAutomations();
        console.log('🧹 Automation Skill cleaned up');
    }
}

export default AutomationSkill;