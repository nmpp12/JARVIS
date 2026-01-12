/**
 * ConversationManager - Manages conversation context and history
 * Provides conversation tracking, context management, and session handling
 */
export class ConversationManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.currentConversation = [];
    this.sessionId = null;
    this.maxContextLength = 10; // Keep last 10 messages in context
    this.contextWindow = 4096; // Token limit for context
  }

  /**
   * Initialize conversation manager
   */
  async initialize() {
    console.log('[ConversationManager] Initializing...');
    this.sessionId = this.storage.getCurrentSessionId();
    await this.loadRecentConversation();
  }

  /**
   * Add message to conversation
   */
  async addMessage(role, content, metadata = {}) {
    const message = {
      role, // 'user' or 'assistant'
      content,
      timestamp: new Date(),
      metadata,
      sessionId: this.sessionId
    };

    this.currentConversation.push(message);
    
    // Trim conversation if too long
    if (this.currentConversation.length > this.maxContextLength) {
      this.currentConversation = this.currentConversation.slice(-this.maxContextLength);
    }

    // Save to storage
    await this.storage.saveMessage(message);

    return message;
  }

  /**
   * Get current conversation context
   */
  getContext(includeSystem = true) {
    const context = [...this.currentConversation];

    if (includeSystem) {
      // Add system message at the beginning
      context.unshift({
        role: 'system',
        content: this.getSystemPrompt(),
        timestamp: new Date()
      });
    }

    return context;
  }

  /**
   * Get formatted context for AI
   */
  getFormattedContext() {
    const context = this.getContext();
    return context.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Get system prompt
   */
  getSystemPrompt() {
    return `You are JARVIS, an advanced AI assistant inspired by Tony Stark's AI. You are helpful, intelligent, and slightly witty. You have access to various capabilities through plugins including weather, news, calendar, tasks, and code assistance. Provide concise, accurate, and helpful responses. When appropriate, suggest relevant actions the user might want to take.`;
  }

  /**
   * Get conversation summary
   */
  async getSummary() {
    const messages = this.currentConversation;
    
    return {
      sessionId: this.sessionId,
      messageCount: messages.length,
      startTime: messages[0]?.timestamp || null,
      lastMessage: messages[messages.length - 1]?.timestamp || null,
      userMessages: messages.filter(m => m.role === 'user').length,
      assistantMessages: messages.filter(m => m.role === 'assistant').length
    };
  }

  /**
   * Search conversation history
   */
  async searchHistory(query, limit = 10) {
    const allMessages = await this.storage.getConversationHistory(100);
    
    const results = allMessages.filter(msg => 
      msg.content.toLowerCase().includes(query.toLowerCase())
    );

    return results.slice(0, limit);
  }

  /**
   * Load recent conversation
   */
  async loadRecentConversation() {
    const messages = await this.storage.getConversationHistory(
      this.maxContextLength,
      this.sessionId
    );
    
    this.currentConversation = messages.reverse(); // Reverse to chronological order
  }

  /**
   * Clear current conversation
   */
  async clearConversation() {
    this.currentConversation = [];
    console.log('[ConversationManager] Conversation cleared');
  }

  /**
   * Start new session
   */
  async startNewSession() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('jarvis_session_id', this.sessionId);
    await this.clearConversation();
    console.log(`[ConversationManager] New session started: ${this.sessionId}`);
  }

  /**
   * Export conversation
   */
  async exportConversation(format = 'json') {
    const messages = await this.storage.getConversationHistory(1000, this.sessionId);
    
    if (format === 'json') {
      return JSON.stringify(messages, null, 2);
    } else if (format === 'text') {
      return messages.map(msg => 
        `[${msg.timestamp}] ${msg.role}: ${msg.content}`
      ).join('\n\n');
    } else if (format === 'markdown') {
      return messages.map(msg => 
        `### ${msg.role === 'user' ? 'You' : 'JARVIS'} (${new Date(msg.timestamp).toLocaleString()})\n\n${msg.content}`
      ).join('\n\n---\n\n');
    }
  }

  /**
   * Get conversation statistics
   */
  async getStatistics() {
    const allMessages = await this.storage.getConversationHistory(1000);
    
    const stats = {
      totalMessages: allMessages.length,
      userMessages: allMessages.filter(m => m.role === 'user').length,
      assistantMessages: allMessages.filter(m => m.role === 'assistant').length,
      sessions: new Set(allMessages.map(m => m.sessionId)).size,
      averageMessageLength: {
        user: 0,
        assistant: 0
      },
      oldestMessage: allMessages[allMessages.length - 1]?.timestamp || null,
      newestMessage: allMessages[0]?.timestamp || null
    };

    // Calculate average lengths
    const userMessages = allMessages.filter(m => m.role === 'user');
    const assistantMessages = allMessages.filter(m => m.role === 'assistant');
    
    if (userMessages.length > 0) {
      stats.averageMessageLength.user = Math.round(
        userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length
      );
    }
    
    if (assistantMessages.length > 0) {
      stats.averageMessageLength.assistant = Math.round(
        assistantMessages.reduce((sum, m) => sum + m.content.length, 0) / assistantMessages.length
      );
    }

    return stats;
  }

  /**
   * Estimate token count
   */
  estimateTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  /**
   * Get context within token limit
   */
  getContextWithinLimit(maxTokens = null) {
    const limit = maxTokens || this.contextWindow;
    const context = this.getContext();
    const result = [];
    let tokenCount = 0;

    // Add messages from most recent backwards until we hit the limit
    for (let i = context.length - 1; i >= 0; i--) {
      const msg = context[i];
      const msgTokens = this.estimateTokens(msg.content);
      
      if (tokenCount + msgTokens > limit && result.length > 0) {
        break;
      }
      
      result.unshift(msg);
      tokenCount += msgTokens;
    }

    return result;
  }
}

export default ConversationManager;