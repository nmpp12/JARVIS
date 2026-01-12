/**
 * Memory Skill
 * Manages short-term and long-term memory for context awareness
 */

export class MemorySkill {
    constructor() {
        this.shortTermMemory = [];
        this.longTermMemory = [];
        this.entityMemory = {}; // Remember facts about entities
        this.conversationContext = null;
        this.maxShortTerm = 20;
        this.maxLongTerm = 500;
    }

    /**
     * Initialize memory skill
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Memory Skill...');
            
            this.loadMemories();
            
            console.log('✅ Memory Skill initialized');
            console.log(`   Short-term: ${this.shortTermMemory.length} items`);
            console.log(`   Long-term: ${this.longTermMemory.length} items`);
            console.log(`   Entities: ${Object.keys(this.entityMemory).length}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Memory Skill:', error);
            return false;
        }
    }

    /**
     * Remember something in short-term memory
     */
    rememberShortTerm(content, type = 'general') {
        const memory = {
            id: Date.now(),
            content,
            type,
            timestamp: new Date().toISOString(),
            accessCount: 0,
            importance: 1
        };

        this.shortTermMemory.push(memory);

        // Trim if exceeds max
        if (this.shortTermMemory.length > this.maxShortTerm) {
            // Keep most important/recent
            this.shortTermMemory.sort((a, b) => {
                const scoreA = a.importance + (a.accessCount * 0.5);
                const scoreB = b.importance + (b.accessCount * 0.5);
                return scoreB - scoreA;
            });
            this.shortTermMemory = this.shortTermMemory.slice(0, this.maxShortTerm);
        }

        console.log('💡 Short-term memory stored');
        return memory.id;
    }

    /**
     * Remember something in long-term memory
     */
    rememberLongTerm(content, type = 'general', metadata = {}) {
        const memory = {
            id: Date.now(),
            content,
            type,
            timestamp: new Date().toISOString(),
            accessCount: 0,
            importance: metadata.importance || 5,
            tags: metadata.tags || [],
            context: metadata.context || null
        };

        this.longTermMemory.push(memory);

        // Trim if exceeds max
        if (this.longTermMemory.length > this.maxLongTerm) {
            // Keep most important
            this.longTermMemory.sort((a, b) => {
                const scoreA = a.importance * 2 + a.accessCount;
                const scoreB = b.importance * 2 + b.accessCount;
                return scoreB - scoreA;
            });
            this.longTermMemory = this.longTermMemory.slice(0, this.maxLongTerm);
        }

        this.saveMemories();
        console.log('💾 Long-term memory stored');
        return memory.id;
    }

    /**
     * Remember fact about an entity
     */
    rememberEntity(entityName, fact, category = 'general') {
        const entity = entityName.toLowerCase();
        
        if (!this.entityMemory[entity]) {
            this.entityMemory[entity] = {
                name: entityName,
                facts: [],
                firstMentioned: new Date().toISOString(),
                lastMentioned: new Date().toISOString(),
                mentionCount: 0
            };
        }

        this.entityMemory[entity].facts.push({
            fact,
            category,
            timestamp: new Date().toISOString()
        });

        this.entityMemory[entity].lastMentioned = new Date().toISOString();
        this.entityMemory[entity].mentionCount++;

        this.saveMemories();
        console.log(`📌 Remembered fact about ${entityName}`);
    }

    /**
     * Recall from short-term memory
     */
    recallShortTerm(filter = {}) {
        let results = [...this.shortTermMemory];

        if (filter.type) {
            results = results.filter(m => m.type === filter.type);
        }

        if (filter.recent) {
            results = results.slice(-filter.recent);
        }

        // Update access count
        results.forEach(m => m.accessCount++);

        return results;
    }

    /**
     * Recall from long-term memory
     */
    recallLongTerm(query, options = {}) {
        if (typeof query === 'string') {
            return this.searchMemories(query, options);
        }

        let results = [...this.longTermMemory];

        if (query.type) {
            results = results.filter(m => m.type === query.type);
        }

        if (query.tags) {
            results = results.filter(m => 
                query.tags.some(tag => m.tags.includes(tag))
            );
        }

        if (query.minImportance) {
            results = results.filter(m => m.importance >= query.minImportance);
        }

        // Update access count
        results.forEach(m => m.accessCount++);

        return results;
    }

    /**
     * Recall facts about an entity
     */
    recallEntity(entityName) {
        const entity = entityName.toLowerCase();
        const memory = this.entityMemory[entity];

        if (memory) {
            memory.mentionCount++;
            memory.lastMentioned = new Date().toISOString();
            return memory;
        }

        return null;
    }

    /**
     * Search memories
     */
    searchMemories(query, options = {}) {
        const lowerQuery = query.toLowerCase();
        const searchIn = options.searchIn || 'both'; // 'short', 'long', 'both'

        let results = [];

        if (searchIn === 'short' || searchIn === 'both') {
            results = results.concat(
                this.shortTermMemory.filter(m => 
                    m.content.toLowerCase().includes(lowerQuery)
                )
            );
        }

        if (searchIn === 'long' || searchIn === 'both') {
            results = results.concat(
                this.longTermMemory.filter(m => 
                    m.content.toLowerCase().includes(lowerQuery) ||
                    m.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
                )
            );
        }

        // Update access counts
        results.forEach(m => m.accessCount++);

        // Sort by relevance (access count and importance)
        results.sort((a, b) => {
            const scoreA = (a.importance || 1) + a.accessCount;
            const scoreB = (b.importance || 1) + b.accessCount;
            return scoreB - scoreA;
        });

        return results.slice(0, options.limit || 10);
    }

    /**
     * Set conversation context
     */
    setContext(context) {
        this.conversationContext = {
            ...context,
            setAt: new Date().toISOString()
        };
        console.log('🎯 Context set:', context);
    }

    /**
     * Get conversation context
     */
    getContext() {
        return this.conversationContext;
    }

    /**
     * Clear context
     */
    clearContext() {
        this.conversationContext = null;
        console.log('🧹 Context cleared');
    }

    /**
     * Promote short-term to long-term memory
     */
    promoteToLongTerm(shortTermId, importance = 5) {
        const memory = this.shortTermMemory.find(m => m.id === shortTermId);
        
        if (!memory) return false;

        // Remove from short-term
        this.shortTermMemory = this.shortTermMemory.filter(m => m.id !== shortTermId);

        // Add to long-term
        this.rememberLongTerm(memory.content, memory.type, {
            importance,
            tags: [],
            context: 'promoted from short-term'
        });

        console.log('⬆️ Memory promoted to long-term');
        return true;
    }

    /**
     * Forget from short-term memory
     */
    forgetShortTerm(id) {
        const before = this.shortTermMemory.length;
        this.shortTermMemory = this.shortTermMemory.filter(m => m.id !== id);
        return this.shortTermMemory.length < before;
    }

    /**
     * Forget from long-term memory
     */
    forgetLongTerm(id) {
        const before = this.longTermMemory.length;
        this.longTermMemory = this.longTermMemory.filter(m => m.id !== id);
        this.saveMemories();
        return this.longTermMemory.length < before;
    }

    /**
     * Forget entity
     */
    forgetEntity(entityName) {
        const entity = entityName.toLowerCase();
        if (this.entityMemory[entity]) {
            delete this.entityMemory[entity];
            this.saveMemories();
            return true;
        }
        return false;
    }

    /**
     * Get memory statistics
     */
    getStats() {
        const totalMemories = this.shortTermMemory.length + this.longTermMemory.length;
        const mostAccessedShort = this.shortTermMemory
            .sort((a, b) => b.accessCount - a.accessCount)[0];
        const mostAccessedLong = this.longTermMemory
            .sort((a, b) => b.accessCount - a.accessCount)[0];

        return {
            shortTerm: this.shortTermMemory.length,
            longTerm: this.longTermMemory.length,
            entities: Object.keys(this.entityMemory).length,
            total: totalMemories,
            mostAccessedShort: mostAccessedShort?.content.substring(0, 50) || 'None',
            mostAccessedLong: mostAccessedLong?.content.substring(0, 50) || 'None',
            hasContext: this.conversationContext !== null
        };
    }

    /**
     * Get recently accessed memories
     */
    getRecentlyAccessed(limit = 5) {
        const allMemories = [...this.shortTermMemory, ...this.longTermMemory];
        return allMemories
            .filter(m => m.accessCount > 0)
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, limit);
    }

    /**
     * Get all entities
     */
    getAllEntities() {
        return Object.entries(this.entityMemory).map(([key, value]) => ({
            name: value.name,
            factsCount: value.facts.length,
            mentionCount: value.mentionCount,
            lastMentioned: value.lastMentioned
        }));
    }

    /**
     * Clear all short-term memory
     */
    clearShortTerm() {
        this.shortTermMemory = [];
        console.log('🧹 Short-term memory cleared');
    }

    /**
     * Clear all long-term memory
     */
    clearLongTerm() {
        this.longTermMemory = [];
        this.saveMemories();
        console.log('🧹 Long-term memory cleared');
    }

    /**
     * Clear all entity memories
     */
    clearEntities() {
        this.entityMemory = {};
        this.saveMemories();
        console.log('🧹 Entity memory cleared');
    }

    /**
     * Clear all memories
     */
    clearAll() {
        this.clearShortTerm();
        this.clearLongTerm();
        this.clearEntities();
        this.clearContext();
        console.log('🧹 All memory cleared');
    }

    /**
     * Save memories to storage
     */
    saveMemories() {
        try {
            const data = {
                longTerm: this.longTermMemory,
                entities: this.entityMemory
            };
            localStorage.setItem('jarvis_memory', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save memories:', error);
        }
    }

    /**
     * Load memories from storage
     */
    loadMemories() {
        try {
            const saved = localStorage.getItem('jarvis_memory');
            if (saved) {
                const data = JSON.parse(saved);
                this.longTermMemory = data.longTerm || [];
                this.entityMemory = data.entities || {};
            }
        } catch (error) {
            console.error('Failed to load memories:', error);
        }
    }
}

export default MemorySkill;