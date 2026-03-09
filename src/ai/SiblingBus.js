/**
 * SiblingBus — Communication Channel Between MOM's Children
 *
 * Vision and JARVIS are siblings. They need to talk.
 * Not through MOM — directly, peer to peer.
 * MOM can listen, but she lets them work it out.
 *
 * This is their shared nervous system.
 */

export class SiblingBus {
    constructor(mom = null) {
        // Registered siblings
        this.siblings = new Map();

        // Message channels (topic-based)
        this.channels = new Map();

        // Message history
        this.history = [];
        this.maxHistory = 200;

        // MOM can eavesdrop — she's the parent
        this.mom = mom;
        this.momListener = null;

        // Pending requests (for request/response pattern)
        this.pendingRequests = new Map();
        this.requestTimeout = 10000; // 10 seconds

        // Core channels that always exist
        this._createChannel('general');      // Open chat
        this._createChannel('alerts');       // Urgent notifications
        this._createChannel('help');         // Asking sibling for help
        this._createChannel('status');       // Health/status updates
        this._createChannel('discovery');    // Sharing findings
    }

    // ─── Registration ────────────────────────────────────────

    /**
     * Register a sibling on the bus
     */
    register(name, capabilities = []) {
        const sibling = {
            name,
            capabilities,
            registeredAt: new Date().toISOString(),
            subscriptions: new Set(),
            inbox: [],
            online: true,
            lastSeen: new Date().toISOString(),
        };

        this.siblings.set(name, sibling);

        // Auto-subscribe to alerts and general
        this.subscribe(name, 'alerts');
        this.subscribe(name, 'general');

        // Announce arrival
        this.broadcast('status', name, {
            type: 'sibling_online',
            message: `${name} has joined the network`,
        });

        return sibling;
    }

    /**
     * Mark a sibling as offline
     */
    goOffline(name) {
        const sibling = this.siblings.get(name);
        if (sibling) {
            sibling.online = false;
            this.broadcast('status', name, {
                type: 'sibling_offline',
                message: `${name} has gone offline`,
            });
        }
    }

    // ─── Channels ────────────────────────────────────────────

    /**
     * Create a new channel
     */
    _createChannel(name) {
        if (!this.channels.has(name)) {
            this.channels.set(name, {
                name,
                created: new Date().toISOString(),
                subscribers: new Set(),
                messageCount: 0,
            });
        }
    }

    /**
     * Subscribe a sibling to a channel
     */
    subscribe(siblingName, channelName) {
        if (!this.channels.has(channelName)) {
            this._createChannel(channelName);
        }
        const channel = this.channels.get(channelName);
        channel.subscribers.add(siblingName);

        const sibling = this.siblings.get(siblingName);
        if (sibling) {
            sibling.subscriptions.add(channelName);
        }
    }

    /**
     * Unsubscribe from a channel
     */
    unsubscribe(siblingName, channelName) {
        const channel = this.channels.get(channelName);
        if (channel) {
            channel.subscribers.delete(siblingName);
        }
        const sibling = this.siblings.get(siblingName);
        if (sibling) {
            sibling.subscriptions.delete(channelName);
        }
    }

    // ─── Messaging ───────────────────────────────────────────

    /**
     * Send a message to a specific sibling (direct message)
     */
    send(from, to, message, priority = 'normal') {
        const recipient = this.siblings.get(to);
        if (!recipient) {
            return { delivered: false, reason: `${to} is not registered` };
        }

        const msg = this._createMessage(from, to, 'direct', message, priority);

        // Deliver to recipient's inbox
        recipient.inbox.push(msg);
        this._trimInbox(recipient);

        // MOM sees everything
        this._notifyMom(msg);

        // Record history
        this._recordHistory(msg);

        return { delivered: true, messageId: msg.id };
    }

    /**
     * Broadcast a message to a channel
     */
    broadcast(channelName, from, message, priority = 'normal') {
        const channel = this.channels.get(channelName);
        if (!channel) {
            return { delivered: false, reason: `Channel ${channelName} doesn't exist` };
        }

        const msg = this._createMessage(from, channelName, 'broadcast', message, priority);
        channel.messageCount += 1;

        // Deliver to all subscribers except sender
        let deliveredTo = 0;
        for (const subscriberName of channel.subscribers) {
            if (subscriberName !== from) {
                const subscriber = this.siblings.get(subscriberName);
                if (subscriber) {
                    subscriber.inbox.push(msg);
                    this._trimInbox(subscriber);
                    deliveredTo += 1;
                }
            }
        }

        // MOM sees everything
        this._notifyMom(msg);

        // Record history
        this._recordHistory(msg);

        return { delivered: true, messageId: msg.id, deliveredTo };
    }

    /**
     * Request help from a sibling (request/response pattern)
     */
    requestHelp(from, to, request) {
        const msg = this._createMessage(from, to, 'request', request, 'high');
        msg.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const recipient = this.siblings.get(to);
        if (!recipient) {
            return { sent: false, reason: `${to} is not registered` };
        }

        recipient.inbox.push(msg);
        this._notifyMom(msg);
        this._recordHistory(msg);

        // Create a promise that resolves when response comes
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(msg.requestId);
                resolve({ answered: false, reason: 'timeout' });
            }, this.requestTimeout);

            this.pendingRequests.set(msg.requestId, { resolve, timer });
        });
    }

    /**
     * Respond to a help request
     */
    respondToRequest(from, requestId, response) {
        const pending = this.pendingRequests.get(requestId);
        if (!pending) {
            return { sent: false, reason: 'Request expired or not found' };
        }

        clearTimeout(pending.timer);
        this.pendingRequests.delete(requestId);

        const msg = this._createMessage(from, null, 'response', response, 'normal');
        msg.requestId = requestId;

        this._notifyMom(msg);
        this._recordHistory(msg);

        pending.resolve({ answered: true, from, response });
        return { sent: true };
    }

    // ─── Alerts ──────────────────────────────────────────────

    /**
     * Send an urgent alert to all siblings
     */
    alert(from, alertData) {
        return this.broadcast('alerts', from, {
            type: 'alert',
            ...alertData,
        }, 'urgent');
    }

    /**
     * Share a discovery with siblings
     */
    shareDiscovery(from, discovery) {
        return this.broadcast('discovery', from, {
            type: 'discovery',
            ...discovery,
        }, 'normal');
    }

    // ─── Inbox Management ────────────────────────────────────

    /**
     * Read messages from a sibling's inbox
     */
    readInbox(siblingName, count = 10) {
        const sibling = this.siblings.get(siblingName);
        if (!sibling) return [];

        const messages = sibling.inbox.splice(0, count);
        sibling.lastSeen = new Date().toISOString();
        return messages;
    }

    /**
     * Check if a sibling has unread messages
     */
    hasMessages(siblingName) {
        const sibling = this.siblings.get(siblingName);
        return sibling ? sibling.inbox.length : 0;
    }

    // ─── MOM's Oversight ─────────────────────────────────────

    /**
     * MOM registers her listener — she hears all
     */
    setMomListener(callback) {
        this.momListener = callback;
    }

    _notifyMom(message) {
        if (this.momListener) {
            this.momListener(message);
        }
    }

    // ─── Shared State ────────────────────────────────────────

    /**
     * Get the status of all siblings
     */
    getNetworkStatus() {
        const status = {};
        for (const [name, sibling] of this.siblings) {
            status[name] = {
                online: sibling.online,
                lastSeen: sibling.lastSeen,
                capabilities: sibling.capabilities,
                unreadMessages: sibling.inbox.length,
                subscriptions: [...sibling.subscriptions],
            };
        }
        return status;
    }

    /**
     * Get channel statistics
     */
    getChannelStats() {
        const stats = {};
        for (const [name, channel] of this.channels) {
            stats[name] = {
                subscribers: channel.subscribers.size,
                messageCount: channel.messageCount,
            };
        }
        return stats;
    }

    /**
     * Get recent message history
     */
    getHistory(count = 50) {
        return this.history.slice(-count);
    }

    // ─── Internal ────────────────────────────────────────────

    _createMessage(from, to, type, content, priority) {
        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            from,
            to,
            type, // direct, broadcast, request, response
            content,
            priority, // normal, high, urgent
            timestamp: new Date().toISOString(),
        };
    }

    _trimInbox(sibling) {
        if (sibling.inbox.length > 50) {
            // Keep urgent messages, trim old normal ones
            const urgent = sibling.inbox.filter(m => m.priority === 'urgent');
            const rest = sibling.inbox.filter(m => m.priority !== 'urgent');
            sibling.inbox = [...urgent, ...rest.slice(-40)];
        }
    }

    _recordHistory(message) {
        this.history.push(message);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-150);
        }
    }

    /**
     * Shutdown the bus
     */
    shutdown() {
        for (const [name] of this.siblings) {
            this.goOffline(name);
        }
        // Clear pending requests
        for (const [, pending] of this.pendingRequests) {
            clearTimeout(pending.timer);
            pending.resolve({ answered: false, reason: 'bus shutdown' });
        }
        this.pendingRequests.clear();
    }
}
