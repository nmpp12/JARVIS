/**
 * StorageManager - Manages data persistence across different storage mechanisms
 * Uses IndexedDB for conversations, LocalStorage for preferences, SessionStorage for temporary data
 */
export class StorageManager {
  constructor() {
    this.dbName = 'JarvisDB';
    this.dbVersion = 1;
    this.db = null;
    this.stores = {
      conversations: 'conversations',
      memories: 'memories',
      settings: 'settings',
      cache: 'cache'
    };
  }

  /**
   * Initialize storage manager
   */
  async initialize() {
    console.log('[StorageManager] Initializing...');
    await this.initIndexedDB();
    this.initLocalStorage();
  }

  /**
   * Initialize IndexedDB
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[StorageManager] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains(this.stores.conversations)) {
          const conversationStore = db.createObjectStore(this.stores.conversations, {
            keyPath: 'id',
            autoIncrement: true
          });
          conversationStore.createIndex('timestamp', 'timestamp', { unique: false });
          conversationStore.createIndex('sessionId', 'sessionId', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.stores.memories)) {
          const memoryStore = db.createObjectStore(this.stores.memories, {
            keyPath: 'id',
            autoIncrement: true
          });
          memoryStore.createIndex('category', 'category', { unique: false });
          memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.stores.cache)) {
          const cacheStore = db.createObjectStore(this.stores.cache, {
            keyPath: 'key'
          });
          cacheStore.createIndex('expiry', 'expiry', { unique: false });
        }
      };
    });
  }

  /**
   * Initialize LocalStorage for preferences
   */
  initLocalStorage() {
    if (!localStorage.getItem('jarvis_settings')) {
      const defaultSettings = {
        theme: 'dark',
        voice: {
          enabled: true,
          language: 'en-US',
          rate: 1.0,
          pitch: 1.0
        },
        ai: {
          model: 'llama2',
          temperature: 0.7,
          maxTokens: 2000
        },
        plugins: {},
        privacy: {
          saveHistory: true,
          analytics: false
        }
      };
      localStorage.setItem('jarvis_settings', JSON.stringify(defaultSettings));
    }
  }

  /**
   * Save conversation message
   */
  async saveMessage(message) {
    const transaction = this.db.transaction([this.stores.conversations], 'readwrite');
    const store = transaction.objectStore(this.stores.conversations);
    
    const data = {
      ...message,
      timestamp: new Date(),
      sessionId: this.getCurrentSessionId()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(limit = 50, sessionId = null) {
    const transaction = this.db.transaction([this.stores.conversations], 'readonly');
    const store = transaction.objectStore(this.stores.conversations);
    
    return new Promise((resolve, reject) => {
      let request;
      
      if (sessionId) {
        const index = store.index('sessionId');
        request = index.getAll(sessionId, limit);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const messages = request.result;
        messages.sort((a, b) => b.timestamp - a.timestamp);
        resolve(messages.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save long-term memory
   */
  async saveMemory(memory) {
    const transaction = this.db.transaction([this.stores.memories], 'readwrite');
    const store = transaction.objectStore(this.stores.memories);
    
    const data = {
      ...memory,
      timestamp: new Date()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search memories
   */
  async searchMemories(query, category = null) {
    const transaction = this.db.transaction([this.stores.memories], 'readonly');
    const store = transaction.objectStore(this.stores.memories);
    
    return new Promise((resolve, reject) => {
      let request;
      
      if (category) {
        const index = store.index('category');
        request = index.getAll(category);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const memories = request.result;
        // Simple text search
        const filtered = memories.filter(m => 
          JSON.stringify(m).toLowerCase().includes(query.toLowerCase())
        );
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save to cache with TTL
   */
  async saveToCache(key, value, ttlSeconds = 3600) {
    const transaction = this.db.transaction([this.stores.cache], 'readwrite');
    const store = transaction.objectStore(this.stores.cache);
    
    const data = {
      key,
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get from cache
   */
  async getFromCache(key) {
    const transaction = this.db.transaction([this.stores.cache], 'readonly');
    const store = transaction.objectStore(this.stores.cache);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const data = request.result;
        if (!data || data.expiry < Date.now()) {
          resolve(null);
        } else {
          resolve(data.value);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache() {
    const transaction = this.db.transaction([this.stores.cache], 'readwrite');
    const store = transaction.objectStore(this.stores.cache);
    const index = store.index('expiry');
    
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(Date.now());
      const request = index.openCursor(range);
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`[StorageManager] Cleared ${deletedCount} expired cache entries`);
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get/Set settings
   */
  getSettings() {
    const settings = localStorage.getItem('jarvis_settings');
    return settings ? JSON.parse(settings) : {};
  }

  saveSettings(settings) {
    localStorage.setItem('jarvis_settings', JSON.stringify(settings));
  }

  updateSettings(updates) {
    const current = this.getSettings();
    const merged = this.deepMerge(current, updates);
    this.saveSettings(merged);
  }

  /**
   * Session management
   */
  getCurrentSessionId() {
    let sessionId = sessionStorage.getItem('jarvis_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('jarvis_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Clear all data
   */
  async clearAllData() {
    // Clear IndexedDB
    for (const storeName of Object.values(this.stores)) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Clear LocalStorage and SessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('[StorageManager] All data cleared');
    this.initLocalStorage();
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const output = { ...target };
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const stats = {};

    for (const [name, storeName] of Object.entries(this.stores)) {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      stats[name] = await new Promise((resolve) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });
    }

    return stats;
  }
}

export default StorageManager;