import { BasePlugin } from './BasePlugin.js';

/**
 * NewsPlugin - Provides news aggregation and search
 * Can integrate with NewsAPI, RSS feeds, or other news sources
 */
export class NewsPlugin extends BasePlugin {
  constructor() {
    super();
    this.name = 'news';
    this.version = '1.0.0';
    this.description = 'Provides news articles and updates from various sources';
    this.capabilities = ['news', 'headlines', 'search_news'];
    this.apiKey = '';
    this.apiUrl = 'https://newsapi.org/v2';
    this.categories = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'];
  }

  async initialize() {
    await super.initialize();
    this.apiKey = this.config.apiKey || process.env.NEWS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[NewsPlugin] No API key configured. Using demo mode.');
    }
  }

  async handleRequest(request) {
    const { action, data } = request;

    try {
      switch (action) {
        case 'top_headlines':
          return await this.getTopHeadlines(data.category, data.country);
        case 'search':
          return await this.searchNews(data.query, data.from, data.to);
        case 'by_source':
          return await this.getNewsBySource(data.source);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get top headlines
   */
  async getTopHeadlines(category = 'general', country = 'us') {
    if (!this.apiKey) {
      return this.getDemoHeadlines(category);
    }

    const url = `${this.apiUrl}/top-headlines?category=${category}&country=${country}&apiKey=${this.apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`News API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.formatNewsResponse(data);
  }

  /**
   * Search news articles
   */
  async searchNews(query, from = null, to = null) {
    if (!this.apiKey) {
      return this.getDemoSearch(query);
    }

    let url = `${this.apiUrl}/everything?q=${encodeURIComponent(query)}&apiKey=${this.apiKey}&sortBy=publishedAt`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`News API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.formatNewsResponse(data);
  }

  /**
   * Get news from specific source
   */
  async getNewsBySource(source) {
    if (!this.apiKey) {
      return this.getDemoHeadlines('general');
    }

    const url = `${this.apiUrl}/top-headlines?sources=${source}&apiKey=${this.apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`News API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.formatNewsResponse(data);
  }

  /**
   * Format news API response
   */
  formatNewsResponse(data) {
    return {
      success: true,
      totalResults: data.totalResults,
      articles: data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        author: article.author,
        publishedAt: new Date(article.publishedAt),
        image: article.urlToImage,
        content: article.content
      })).slice(0, 10) // Limit to 10 articles
    };
  }

  /**
   * Demo mode - return sample data
   */
  getDemoHeadlines(category) {
    const sampleArticles = [
      {
        title: `Sample ${category} headline 1`,
        description: 'This is a sample news article description.',
        url: 'https://example.com/article1',
        source: 'Demo News',
        author: 'Demo Author',
        publishedAt: new Date(),
        image: null,
        content: 'Sample article content...'
      },
      {
        title: `Sample ${category} headline 2`,
        description: 'Another sample news article description.',
        url: 'https://example.com/article2',
        source: 'Demo News',
        author: 'Demo Author',
        publishedAt: new Date(Date.now() - 3600000),
        image: null,
        content: 'More sample content...'
      }
    ];

    return {
      success: true,
      totalResults: 2,
      articles: sampleArticles,
      demoMode: true
    };
  }

  getDemoSearch(query) {
    return this.getDemoHeadlines('general');
  }
}

export default NewsPlugin;