/**
 * Web Search Plugin
 * Performs web searches and retrieves information
 */

import BasePlugin from './BasePlugin.js';

export class WebSearchPlugin extends BasePlugin {
    constructor() {
        super('websearch', 'Performs web searches and retrieves information');
        this.searchEngine = 'google';
        this.resultsCount = 5;
    }

    async initialize() {
        await super.initialize();
        this.log('Web Search plugin ready');
        return true;
    }

    /**
     * Validate parameters
     */
    validate(params) {
        return params.query !== undefined;
    }

    /**
     * Execute search operation
     */
    async execute(params) {
        try {
            const query = params.query;
            const type = params.type || 'web';

            switch (type) {
                case 'web':
                    return this.webSearch(query);
                case 'images':
                    return this.imageSearch(query);
                case 'videos':
                    return this.videoSearch(query);
                case 'news':
                    return this.newsSearch(query);
                default:
                    return this.webSearch(query);
            }
        } catch (error) {
            return this.handleError(error, 'executing search');
        }
    }

    /**
     * Perform web search
     */
    webSearch(query) {
        if (!query) {
            return '❌ Please provide a search query.';
        }

        // Generate search URL
        const searchUrl = this.getSearchUrl(query);

        // Mock results - would integrate with search API in production
        const results = this.generateMockResults(query);

        return [
            `🔍 Search results for "${query}":\n`,
            `Search URL: ${searchUrl}\n`,
            ...results.map((result, i) => {
                return [
                    `${i + 1}. ${result.title}`,
                    `   ${result.description}`,
                    `   🔗 ${result.url}`,
                    ''
                ].join('\n');
            }),
            `\nNote: Open the search URL in a browser for live results.`
        ].join('\n');
    }

    /**
     * Image search
     */
    imageSearch(query) {
        const searchUrl = this.getSearchUrl(query, 'images');
        return `🖼️ Image search for "${query}":\n${searchUrl}\n\nOpen this URL in a browser to view image results.`;
    }

    /**
     * Video search
     */
    videoSearch(query) {
        const searchUrl = this.getSearchUrl(query, 'videos');
        return `🎥 Video search for "${query}":\n${searchUrl}\n\nOpen this URL in a browser to view video results.`;
    }

    /**
     * News search
     */
    newsSearch(query) {
        const searchUrl = this.getSearchUrl(query, 'news');
        return `📰 News search for "${query}":\n${searchUrl}\n\nOpen this URL in a browser to view news results.`;
    }

    /**
     * Get search URL
     */
    getSearchUrl(query, type = 'web') {
        const encodedQuery = encodeURIComponent(query);

        const urls = {
            google: {
                web: `https://www.google.com/search?q=${encodedQuery}`,
                images: `https://www.google.com/search?q=${encodedQuery}&tbm=isch`,
                videos: `https://www.google.com/search?q=${encodedQuery}&tbm=vid`,
                news: `https://www.google.com/search?q=${encodedQuery}&tbm=nws`
            },
            bing: {
                web: `https://www.bing.com/search?q=${encodedQuery}`,
                images: `https://www.bing.com/images/search?q=${encodedQuery}`,
                videos: `https://www.bing.com/videos/search?q=${encodedQuery}`,
                news: `https://www.bing.com/news/search?q=${encodedQuery}`
            },
            duckduckgo: {
                web: `https://duckduckgo.com/?q=${encodedQuery}`,
                images: `https://duckduckgo.com/?q=${encodedQuery}&iax=images&ia=images`,
                videos: `https://duckduckgo.com/?q=${encodedQuery}&iax=videos&ia=videos`,
                news: `https://duckduckgo.com/?q=${encodedQuery}&iar=news&ia=news`
            }
        };

        return urls[this.searchEngine]?.[type] || urls.google[type];
    }

    /**
     * Generate mock search results
     */
    generateMockResults(query) {
        return [
            {
                title: `${query} - Overview`,
                description: `Comprehensive information about ${query} including history, details, and recent updates.`,
                url: `https://example.com/${query.toLowerCase().replace(/\s+/g, '-')}`
            },
            {
                title: `Guide to ${query}`,
                description: `Learn everything you need to know about ${query} with this detailed guide and tutorial.`,
                url: `https://guide.example.com/${query.toLowerCase().replace(/\s+/g, '-')}`
            },
            {
                title: `${query} - Latest News`,
                description: `Stay updated with the latest news and developments related to ${query}.`,
                url: `https://news.example.com/${query.toLowerCase().replace(/\s+/g, '-')}`
            }
        ];
    }

    /**
     * Set search engine
     */
    setSearchEngine(engine) {
        const validEngines = ['google', 'bing', 'duckduckgo'];
        
        if (validEngines.includes(engine)) {
            this.searchEngine = engine;
            this.log(`Search engine set to: ${engine}`);
            return true;
        }
        
        return false;
    }

    /**
     * Set results count
     */
    setResultsCount(count) {
        if (count > 0 && count <= 20) {
            this.resultsCount = count;
            this.log(`Results count set to: ${count}`);
            return true;
        }
        
        return false;
    }

    /**
     * Get available search engines
     */
    getSearchEngines() {
        return ['google', 'bing', 'duckduckgo'];
    }
}

export default WebSearchPlugin;