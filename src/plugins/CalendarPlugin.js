/**
 * Calendar Plugin
 * Manages events, meetings, and appointments
 */

import BasePlugin from './BasePlugin.js';

export class CalendarPlugin extends BasePlugin {
    constructor() {
        super('calendar', 'Manages events, meetings, and appointments');
        this.events = [];
        this.nextId = 1;
    }

    async initialize() {
        await super.initialize();
        this.loadEvents();
        this.log('Calendar plugin ready');
        return true;
    }

    /**
     * Validate parameters
     */
    validate(params) {
        if (!params.action) {
            return false;
        }
        
        if (params.action === 'add' && (!params.event || !params.time)) {
            return false;
        }
        
        return true;
    }

    /**
     * Execute calendar operation
     */
    async execute(params) {
        try {
            const action = params.action;

            switch (action) {
                case 'add':
                    return this.addEvent(params);
                case 'list':
                    return this.listEvents(params.filter);
                case 'today':
                    return this.getTodayEvents();
                case 'week':
                    return this.getWeekEvents();
                case 'delete':
                    return this.deleteEvent(params.id);
                case 'update':
                    return this.updateEvent(params.id, params);
                default:
                    return this.listEvents();
            }
        } catch (error) {
            return this.handleError(error, 'executing calendar operation');
        }
    }

    /**
     * Add a new event
     */
    addEvent(params) {
        const event = {
            id: this.nextId++,
            title: params.event,
            description: params.description || '',
            startTime: this.parseTime(params.time),
            duration: params.duration || '1 hour',
            location: params.location || '',
            attendees: params.attendees || [],
            reminder: params.reminder || '15 minutes',
            type: params.type || 'meeting',
            createdAt: new Date().toISOString()
        };

        this.events.push(event);
        this.saveEvents();

        this.log(`Event added: ${event.title}`);
        return `📅 Event scheduled: "${event.title}" at ${this.formatDateTime(event.startTime)}`;
    }

    /**
     * List all events
     */
    listEvents(filter = 'upcoming') {
        let filteredEvents = this.events;
        const now = new Date();

        switch (filter) {
            case 'upcoming':
                filteredEvents = this.events.filter(e => new Date(e.startTime) >= now);
                break;
            case 'past':
                filteredEvents = this.events.filter(e => new Date(e.startTime) < now);
                break;
            case 'today':
                return this.getTodayEvents();
        }

        if (filteredEvents.length === 0) {
            return 'No events found.';
        }

        // Sort by time
        filteredEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        return this.formatEventList(filteredEvents);
    }

    /**
     * Get today's events
     */
    getTodayEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayEvents = this.events.filter(event => {
            const eventDate = new Date(event.startTime);
            return eventDate >= today && eventDate < tomorrow;
        });

        if (todayEvents.length === 0) {
            return '📅 No events scheduled for today.';
        }

        return `📅 Today's events:\n\n${this.formatEventList(todayEvents)}`;
    }

    /**
     * Get this week's events
     */
    getWeekEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekEvents = this.events.filter(event => {
            const eventDate = new Date(event.startTime);
            return eventDate >= today && eventDate < weekEnd;
        });

        if (weekEvents.length === 0) {
            return '📅 No events scheduled for this week.';
        }

        return `📅 This week's events:\n\n${this.formatEventList(weekEvents)}`;
    }

    /**
     * Delete an event
     */
    deleteEvent(id) {
        const index = this.events.findIndex(e => e.id === id);

        if (index === -1) {
            return `❌ Event not found: ${id}`;
        }

        const event = this.events[index];
        this.events.splice(index, 1);
        this.saveEvents();

        this.log(`Event deleted: ${event.title}`);
        return `🗑️ Event deleted: "${event.title}"`;
    }

    /**
     * Update an event
     */
    updateEvent(id, updates) {
        const event = this.events.find(e => e.id === id);

        if (!event) {
            return `❌ Event not found: ${id}`;
        }

        if (updates.event) event.title = updates.event;
        if (updates.description) event.description = updates.description;
        if (updates.time) event.startTime = this.parseTime(updates.time);
        if (updates.duration) event.duration = updates.duration;
        if (updates.location) event.location = updates.location;

        this.saveEvents();

        this.log(`Event updated: ${event.title}`);
        return `✏️ Event updated: "${event.title}"`;
    }

    /**
     * Format event list for display
     */
    formatEventList(events) {
        const lines = [];

        events.forEach(event => {
            const typeIcon = this.getEventTypeIcon(event.type);
            const datetime = this.formatDateTime(event.startTime);
            
            lines.push(
                `${typeIcon} [${event.id}] ${event.title}`,
                `   🕒 ${datetime}`,
                `   ⏱️ Duration: ${event.duration}`,
                event.location ? `   📍 ${event.location}` : '',
                event.attendees.length > 0 ? `   👥 ${event.attendees.join(', ')}` : '',
                ''
            );
        });

        return lines.join('\n');
    }

    /**
     * Get event type icon
     */
    getEventTypeIcon(type) {
        const icons = {
            meeting: '🤝',
            appointment: '📅',
            reminder: '⏰',
            birthday: '🎂',
            deadline: '⚠️',
            call: '📞',
            other: '📌'
        };
        return icons[type] || icons.other;
    }

    /**
     * Parse time string to Date
     */
    parseTime(timeStr) {
        // Simple parsing - would be more robust in production
        const now = new Date();
        
        if (timeStr.toLowerCase().includes('tomorrow')) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString();
        }
        
        if (timeStr.toLowerCase().includes('today')) {
            return now.toISOString();
        }

        // Try to parse as date
        try {
            return new Date(timeStr).toISOString();
        } catch {
            return now.toISOString();
        }
    }

    /**
     * Format date and time
     */
    formatDateTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Get upcoming reminders
     */
    getUpcomingReminders(minutes = 30) {
        const now = new Date();
        const threshold = new Date(now.getTime() + minutes * 60000);

        return this.events.filter(event => {
            const eventTime = new Date(event.startTime);
            return eventTime > now && eventTime <= threshold;
        });
    }

    /**
     * Check for conflicts
     */
    checkConflicts(newEvent) {
        const newStart = new Date(newEvent.startTime);
        const newEnd = new Date(newStart.getTime() + this.parseDuration(newEvent.duration));

        return this.events.filter(event => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(eventStart.getTime() + this.parseDuration(event.duration));

            return (newStart < eventEnd && newEnd > eventStart);
        });
    }

    /**
     * Parse duration to milliseconds
     */
    parseDuration(duration) {
        const match = duration.match(/(\d+)\s*(hour|minute|min|hr)s?/i);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            
            if (unit.startsWith('hour') || unit === 'hr') {
                return value * 60 * 60 * 1000;
            } else {
                return value * 60 * 1000;
            }
        }
        return 60 * 60 * 1000; // Default 1 hour
    }

    /**
     * Save events to storage
     */
    saveEvents() {
        try {
            localStorage.setItem('jarvis_events', JSON.stringify(this.events));
            localStorage.setItem('jarvis_event_nextid', this.nextId.toString());
        } catch (error) {
            this.log('Failed to save events', 'error');
        }
    }

    /**
     * Load events from storage
     */
    loadEvents() {
        try {
            const saved = localStorage.getItem('jarvis_events');
            if (saved) {
                this.events = JSON.parse(saved);
            }

            const nextId = localStorage.getItem('jarvis_event_nextid');
            if (nextId) {
                this.nextId = parseInt(nextId);
            }

            this.log(`Loaded ${this.events.length} events`);
        } catch (error) {
            this.log('Failed to load events', 'error');
        }
    }
}

export default CalendarPlugin;