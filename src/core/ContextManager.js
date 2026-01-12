/**
 * Context Manager
 * Manages conversation context and memory
 */

export class ContextManager {
    constructor(maxMessages = 50) {
        this.messages = [];
        this.maxMessages = maxMessages;
        this.metadata = {};
    }

    /**
     * Add a message to context
     */
    addMessage(role, content, metadata = {}) {
        const message = {
            role, // 'user' or 'assistant'
            content,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        this.messages.push(message);

        // Trim if exceeds max
        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(-this.maxMessages);
        }

        return message;
    }

    /**
     * Get recent messages
     */
    getRecentMessages(count = 10) {
        return this.messages.slice(-count);
    }

    /**
     * Get all messages
     */
    getAllMessages() {
        return this.messages;
    }

    /**
     * Get messages by role
     */
    getMessagesByRole(role) {
        return this.messages.filter(msg => msg.role === role);
    }

    /**
     * Search messages
     */
    searchMessages(query) {
        const lowerQuery = query.toLowerCase();
        return this.messages.filter(msg => 
            msg.content.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get context size
     */
    getSize() {
        return this.messages.length;
    }

    /**
     * Clear all messages
     */
    clear() {
        this.messages = [];
        this.metadata = {};
    }

    /**
     * Set metadata
     */
    setMetadata(key, value) {
        this.metadata[key] = value;
    }

    /**
     * Get metadata
     */
    getMetadata(key) {
        return this.metadata[key];
    }

    /**
     * Export context to JSON
     */
    export() {
        return {
            messages: this.messages,
            metadata: this.metadata,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import context from JSON
     */
    import(data) {
        if (data.messages) {
            this.messages = data.messages;
        }
        if (data.metadata) {
            this.metadata = data.metadata;
        }
    }

    /**
     * Get conversation summary
     */
    getSummary() {
        const userMessages = this.getMessagesByRole('user').length;
        const assistantMessages = this.getMessagesByRole('assistant').length;
        
        return {
            totalMessages: this.messages.length,
            userMessages,
            assistantMessages,
            firstMessage: this.messages[0]?.timestamp,
            lastMessage: this.messages[this.messages.length - 1]?.timestamp
        };
    }
}

export default ContextManager;