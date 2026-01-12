/**
 * RAGEngine - Retrieval-Augmented Generation Engine
 * Provides semantic search and context retrieval for enhanced AI responses
 */
export class RAGEngine {
  constructor() {
    this.documents = [];
    this.embeddings = new Map();
    this.indexedDocuments = new Map();
    this.embeddingDimension = 384; // Default for small models
  }

  /**
   * Initialize the RAG engine
   */
  async initialize() {
    console.log('[RAGEngine] Initializing...');
    // In a real implementation, this would load a pretrained embedding model
    // For now, we'll use a simple TF-IDF like approach
    this.initialized = true;
  }

  /**
   * Add documents to the knowledge base
   * @param {Array<Object>} documents - Array of document objects
   */
  async ingestDocuments(documents) {
    console.log(`[RAGEngine] Ingesting ${documents.length} documents...`);

    for (const doc of documents) {
      const { id, content, metadata } = doc;
      
      // Store document
      this.documents.push({
        id: id || this.generateId(),
        content,
        metadata: metadata || {},
        timestamp: new Date()
      });

      // Generate and store embedding
      const embedding = await this.generateEmbedding(content);
      this.embeddings.set(id, embedding);
      
      // Index for quick retrieval
      this.indexDocument(id, content);
    }

    console.log(`[RAGEngine] Total documents: ${this.documents.length}`);
  }

  /**
   * Search for relevant documents
   * @param {string} query - Search query
   * @param {number} topK - Number of results to return
   * @returns {Promise<Array>} Relevant documents with scores
   */
  async search(query, topK = 5) {
    const queryEmbedding = await this.generateEmbedding(query);
    const results = [];

    // Calculate similarity scores
    for (const doc of this.documents) {
      const docEmbedding = this.embeddings.get(doc.id);
      const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
      
      results.push({
        document: doc,
        score: similarity
      });
    }

    // Sort by relevance and return top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Retrieve context for a query
   * @param {string} query - User query
   * @param {number} maxTokens - Maximum context length
   * @returns {Promise<string>} Formatted context
   */
  async retrieveContext(query, maxTokens = 2000) {
    const results = await this.search(query, 5);
    
    if (results.length === 0) {
      return '';
    }

    let context = 'Relevant information:\n\n';
    let tokenCount = 0;

    for (const result of results) {
      const docText = `${result.document.content}\n\n`;
      const docTokens = this.estimateTokens(docText);
      
      if (tokenCount + docTokens > maxTokens) {
        break;
      }

      context += docText;
      tokenCount += docTokens;
    }

    return context;
  }

  /**
   * Generate embedding for text
   * @param {string} text - Input text
   * @returns {Promise<Array<number>>} Embedding vector
   */
  async generateEmbedding(text) {
    // Simplified embedding using TF-IDF-like approach
    // In production, use a real embedding model (e.g., sentence-transformers)
    
    const words = this.tokenize(text.toLowerCase());
    const embedding = new Array(this.embeddingDimension).fill(0);
    
    // Simple hash-based pseudo-embedding
    for (const word of words) {
      const hash = this.hashString(word);
      for (let i = 0; i < this.embeddingDimension; i++) {
        embedding[i] += Math.sin(hash + i) * 0.1;
      }
    }

    // Normalize
    return this.normalize(embedding);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Normalize a vector
   */
  normalize(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  /**
   * Tokenize text into words
   */
  tokenize(text) {
    return text
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Simple string hash function
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Index document for quick retrieval
   */
  indexDocument(id, content) {
    const words = this.tokenize(content.toLowerCase());
    const uniqueWords = [...new Set(words)];

    for (const word of uniqueWords) {
      if (!this.indexedDocuments.has(word)) {
        this.indexedDocuments.set(word, new Set());
      }
      this.indexedDocuments.get(word).add(id);
    }
  }

  /**
   * Estimate token count
   */
  estimateTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delete document by ID
   */
  deleteDocument(id) {
    this.documents = this.documents.filter(doc => doc.id !== id);
    this.embeddings.delete(id);
    
    // Remove from index
    for (const [word, docs] of this.indexedDocuments.entries()) {
      docs.delete(id);
      if (docs.size === 0) {
        this.indexedDocuments.delete(word);
      }
    }
  }

  /**
   * Clear all documents
   */
  clear() {
    this.documents = [];
    this.embeddings.clear();
    this.indexedDocuments.clear();
    console.log('[RAGEngine] Cleared all documents');
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      documentCount: this.documents.length,
      embeddingCount: this.embeddings.size,
      indexedTerms: this.indexedDocuments.size,
      embeddingDimension: this.embeddingDimension
    };
  }
}

export default RAGEngine;