import { BasePlugin } from './BasePlugin.js';

/**
 * CalendarPlugin - Manages calendar events and reminders
 * Provides scheduling and event management capabilities
 */
export class CalendarPlugin extends BasePlugin {
  constructor() {
    super();
    this.name = 'calendar';
    this.version = '1.0.0';
    this.description = 'Manages calendar events, reminders, and scheduling';
    this.capabilities = ['calendar', 'events', 'reminders', 'schedule'];
    this.events = [];
    this.reminders = [];
  }

  async initialize() {
    await super.initialize();
    await this.loadEvents();
    this.startReminderCheck();
  }

  async handleRequest(request) {
    const { action, data } = request;

    try {
      switch (action) {
        case 'create_event':
          return await this.createEvent(data);
        case 'get_events':
          return await this.getEvents(data.from, data.to);
        case 'update_event':
          return await this.updateEvent(data.id, data.updates);
        case 'delete_event':
          return await this.deleteEvent(data.id);
        case 'create_reminder':
          return await this.createReminder(data);
        case 'get_upcoming':
          return await this.getUpcomingEvents(data.days || 7);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new event
   */
  async createEvent(eventData) {
    const event = {
      id: this.generateEventId(),
      title: eventData.title,
      description: eventData.description || '',
      start: new Date(eventData.start),
      end: eventData.end ? new Date(eventData.end) : null,
      location: eventData.location || '',
      attendees: eventData.attendees || [],
      reminders: eventData.reminders || [],
      recurrence: eventData.recurrence || null,
      created: new Date(),
      modified: new Date()
    };

    this.events.push(event);
    await this.saveEvents();

    // Schedule reminders
    for (const reminderMinutes of event.reminders) {
      await this.scheduleReminder(event, reminderMinutes);
    }

    return {
      success: true,
      event,
      message: 'Event created successfully'
    };
  }

  /**
   * Get events within date range
   */
  async getEvents(from, to) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const filteredEvents = this.events.filter(event => {
      const eventDate = event.start;
      return eventDate >= fromDate && eventDate <= toDate;
    });

    filteredEvents.sort((a, b) => a.start - b.start);

    return {
      success: true,
      count: filteredEvents.length,
      events: filteredEvents
    };
  }

  /**
   * Update an event
   */
  async updateEvent(eventId, updates) {
    const eventIndex = this.events.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      throw new Error('Event not found');
    }

    const event = this.events[eventIndex];
    Object.assign(event, updates, { modified: new Date() });
    
    await this.saveEvents();

    return {
      success: true,
      event,
      message: 'Event updated successfully'
    };
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId) {
    const initialLength = this.events.length;
    this.events = this.events.filter(e => e.id !== eventId);
    
    if (this.events.length === initialLength) {
      throw new Error('Event not found');
    }

    await this.saveEvents();

    return {
      success: true,
      message: 'Event deleted successfully'
    };
  }

  /**
   * Create a reminder
   */
  async createReminder(reminderData) {
    const reminder = {
      id: this.generateEventId(),
      title: reminderData.title,
      time: new Date(reminderData.time),
      message: reminderData.message || '',
      created: new Date()
    };

    this.reminders.push(reminder);
    await this.saveEvents();

    return {
      success: true,
      reminder,
      message: 'Reminder created successfully'
    };
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(days = 7) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const upcoming = this.events.filter(event => {
      return event.start >= now && event.start <= futureDate;
    });

    upcoming.sort((a, b) => a.start - b.start);

    return {
      success: true,
      count: upcoming.length,
      events: upcoming,
      period: `Next ${days} days`
    };
  }

  /**
   * Schedule a reminder for an event
   */
  async scheduleReminder(event, minutesBefore) {
    const reminderTime = new Date(event.start.getTime() - minutesBefore * 60000);
    const now = new Date();

    if (reminderTime > now) {
      const delay = reminderTime.getTime() - now.getTime();
      setTimeout(() => {
        this.triggerReminder(event, minutesBefore);
      }, delay);
    }
  }

  /**
   * Trigger a reminder notification
   */
  triggerReminder(event, minutesBefore) {
    const message = `Reminder: ${event.title} in ${minutesBefore} minutes`;
    console.log(`[CalendarPlugin] ${message}`);
    
    // In a real app, this would trigger a system notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('JARVIS Reminder', {
        body: message,
        icon: '/icon.png'
      });
    }
  }

  /**
   * Check for due reminders (called periodically)
   */
  checkReminders() {
    const now = new Date();
    const dueReminders = this.reminders.filter(r => r.time <= now);

    for (const reminder of dueReminders) {
      this.triggerReminder(reminder, 0);
      // Remove triggered reminder
      this.reminders = this.reminders.filter(r => r.id !== reminder.id);
    }
  }

  /**
   * Start periodic reminder checking
   */
  startReminderCheck() {
    setInterval(() => {
      this.checkReminders();
    }, 60000); // Check every minute
  }

  /**
   * Load events from storage
   */
  async loadEvents() {
    const stored = localStorage.getItem('jarvis_calendar_events');
    if (stored) {
      const data = JSON.parse(stored);
      this.events = data.events.map(e => ({
        ...e,
        start: new Date(e.start),
        end: e.end ? new Date(e.end) : null,
        created: new Date(e.created),
        modified: new Date(e.modified)
      }));
      this.reminders = data.reminders.map(r => ({
        ...r,
        time: new Date(r.time),
        created: new Date(r.created)
      }));
    }
  }

  /**
   * Save events to storage
   */
  async saveEvents() {
    const data = {
      events: this.events,
      reminders: this.reminders
    };
    localStorage.setItem('jarvis_calendar_events', JSON.stringify(data));
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown() {
    await this.saveEvents();
    await super.shutdown();
  }
}

export default CalendarPlugin;