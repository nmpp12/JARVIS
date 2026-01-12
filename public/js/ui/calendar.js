/**
 * Calendar UI Component
 */

export class CalendarUI {
    constructor(jarvis) {
        this.jarvis = jarvis;
        this.calendar = null;
        this.events = [];
    }

    async initialize() {
        console.log('📅 Initializing Calendar UI...');
        
        this.calendar = document.getElementById('calendar');
        
        // Load events from calendar plugin
        if (this.jarvis.calendar) {
            this.events = this.jarvis.calendar.getEvents();
        }
        
        this.render();
        this.setupEventListeners();
        
        console.log('✅ Calendar UI initialized');
    }

    setupEventListeners() {
        document.getElementById('btnAddEvent')?.addEventListener('click', () => {
            this.showAddEventDialog();
        });
    }

    render() {
        if (!this.calendar) return;
        
        // Simple calendar view for now
        const today = new Date();
        const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        this.calendar.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h3 style="margin-bottom: 20px;">${monthName}</h3>
                <p style="color: var(--text-muted);">Calendar view coming soon...</p>
                <p style="color: var(--text-muted); margin-top: 20px;">Events: ${this.events.length}</p>
            </div>
        `;
    }

    showAddEventDialog() {
        const title = prompt('Event title:');
        if (title) {
            this.addEvent({ title, date: new Date() });
        }
    }

    addEvent(eventData) {
        if (this.jarvis.calendar) {
            this.jarvis.calendar.addEvent(eventData);
            this.events = this.jarvis.calendar.getEvents();
            this.render();
        }
    }

    refresh() {
        if (this.jarvis.calendar) {
            this.events = this.jarvis.calendar.getEvents();
            this.render();
        }
    }
}

export default CalendarUI;