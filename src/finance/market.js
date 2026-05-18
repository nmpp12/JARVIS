/**
 * MarketDataService — Fetches real-time market quotes and financial news.
 *
 * Uses Yahoo Finance's public chart and search endpoints via the local
 * dev proxy (vite → server/proxy.js → query1.finance.yahoo.com) to avoid
 * CORS and to inject a browser User-Agent header.
 */

export const DEFAULT_SYMBOLS = [
    { symbol: '^GSPC',     name: 'S&P 500',       group: 'index' },
    { symbol: '^IXIC',     name: 'NASDAQ',        group: 'index' },
    { symbol: '^STOXX50E', name: 'Euro Stoxx 50', group: 'index' },
    { symbol: 'PSI20.LS',  name: 'PSI 20',        group: 'index' },
    { symbol: 'BTC-EUR',   name: 'Bitcoin',       group: 'crypto' },
    { symbol: 'ETH-EUR',   name: 'Ethereum',      group: 'crypto' },
    { symbol: 'EURUSD=X',  name: 'EUR / USD',     group: 'fx' },
    { symbol: 'GC=F',      name: 'Ouro',          group: 'commodity' },
];

const CACHE_TTL = 60_000; // 60s — avoid hammering Yahoo

export class MarketDataService {
    constructor() {
        this.base = '/yahoo';
        this._cache = new Map();
        this.lastError = null;
    }

    /**
     * Returns true if the market proxy is reachable.
     * Used to show a graceful "offline" state in the UI.
     */
    async healthCheck() {
        try {
            const r = await fetch(`${this.base}/v8/finance/chart/^GSPC?interval=1d&range=1d`, {
                signal: AbortSignal.timeout(3000),
            });
            return r.ok;
        } catch {
            return false;
        }
    }

    async fetchQuotes(symbols = DEFAULT_SYMBOLS) {
        const results = await Promise.all(
            symbols.map((s) => this._fetchOneQuote(s).catch(() => null))
        );
        return results.filter(Boolean);
    }

    async _fetchOneQuote(meta) {
        const cached = this._cache.get(meta.symbol);
        if (cached && Date.now() - cached.t < CACHE_TTL) return cached.v;

        const url = `${this.base}/v8/finance/chart/${encodeURIComponent(meta.symbol)}?interval=1d&range=5d`;
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();

        const result = data?.chart?.result?.[0];
        if (!result) throw new Error('No data');
        const m = result.meta;

        const closes = result.indicators?.quote?.[0]?.close?.filter((v) => v != null) || [];
        const prevClose = m.previousClose ?? m.chartPreviousClose ?? closes[closes.length - 2] ?? m.regularMarketPrice;
        const price = m.regularMarketPrice ?? closes[closes.length - 1];
        const change = price - prevClose;
        const changePct = prevClose ? (change / prevClose) * 100 : 0;

        const quote = {
            symbol: meta.symbol,
            name: meta.name || m.shortName || meta.symbol,
            group: meta.group || 'other',
            price,
            previousClose: prevClose,
            change,
            changePct,
            currency: m.currency || 'USD',
            sparkline: closes.slice(-20),
            updatedAt: new Date(m.regularMarketTime * 1000),
        };

        this._cache.set(meta.symbol, { t: Date.now(), v: quote });
        return quote;
    }

    async fetchNews(query = 'stocks economy', count = 8) {
        try {
            const url = `${this.base}/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=${count}&quotesCount=0`;
            const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = await r.json();
            const items = data?.news || [];
            return items.map((n) => ({
                title: n.title,
                publisher: n.publisher,
                link: n.link,
                publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000) : null,
                tickers: n.relatedTickers || [],
                thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
            }));
        } catch (e) {
            this.lastError = e.message;
            return [];
        }
    }

    /**
     * Build a compact summary of market state for AI prompt injection.
     */
    summarize(quotes) {
        if (!quotes.length) return 'Dados de mercado indisponíveis.';
        return quotes
            .map((q) => {
                const dir = q.changePct >= 0 ? '+' : '';
                return `${q.name} (${q.symbol}): ${q.price.toFixed(2)} ${q.currency} ${dir}${q.changePct.toFixed(2)}%`;
            })
            .join('\n');
    }

    summarizeNews(news, limit = 6) {
        if (!news.length) return 'Sem notícias disponíveis.';
        return news
            .slice(0, limit)
            .map((n, i) => `${i + 1}. ${n.title} [${n.publisher}]`)
            .join('\n');
    }
}
