/**
 * NotificationManager — Local push notifications for the Finance AI PWA.
 *
 * Strategy:
 *  - Uses the Web Notifications API + Service Worker showNotification().
 *  - Runs checks while the app is open (foreground/background within browser).
 *  - On installed PWAs (Android Chrome), Periodic Background Sync wakes the
 *    service worker every ~24h to run background checks.
 *  - No external server required: all alerts originate from local state.
 *
 * True remote push (server → device when app is fully closed) would require
 * VAPID keys + a backend that owns the push endpoints — outside the scope
 * of an unhosted personal app.
 */

const STORAGE_KEY = 'fa_notif_settings';

const DEFAULT_SETTINGS = {
    enabled: false,
    budgetAlerts: true,
    budgetThreshold: 80,        // percent of budget consumed
    marketAlerts: true,
    marketThreshold: 3,         // percent daily change
    dailyReminder: true,
    reminderTime: '20:00',
    newsAlerts: true,           // AI-analyzed news with profit chance
    profitChanceThreshold: 20,  // alert when |profitChance - 50| >= this
    backupAlerts: true,         // weekly backup pending reminder
    backupIntervalDays: 7,
    lastBudgetCheck: null,
    lastMarketCheck: null,
    lastNewsCheck: null,
    lastReminder: null,
    lastBackupNudge: null,
    seenNewsTitles: [],         // dedup recently-analyzed headlines
};

export class NotificationManager {
    constructor(store, market, ai) {
        this.store = store;
        this.market = market;
        this.ai = ai;
        this.settings = this._load();
        this._interval = null;
    }

    _load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return { ...DEFAULT_SETTINGS, ...saved };
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    }

    getSettings() {
        return { ...this.settings };
    }

    updateSettings(updates) {
        this.settings = { ...this.settings, ...updates };
        this._save();
    }

    /**
     * Returns the current notification permission state.
     * 'unsupported' | 'default' | 'granted' | 'denied'
     */
    getPermission() {
        if (typeof Notification === 'undefined') return 'unsupported';
        return Notification.permission;
    }

    /**
     * Must be called from a user gesture (button click) on iOS Safari.
     */
    async requestPermission() {
        if (typeof Notification === 'undefined') return 'unsupported';
        const result = await Notification.requestPermission();
        if (result === 'granted') {
            this.settings.enabled = true;
            this._save();
            await this._registerPeriodicSync();
        }
        return result;
    }

    /**
     * Periodic Background Sync — Chrome Android only, requires installed PWA
     * with sufficient site engagement. Best-effort: silently no-ops elsewhere.
     */
    async _registerPeriodicSync() {
        if (!('serviceWorker' in navigator)) return;
        try {
            const reg = await navigator.serviceWorker.ready;
            if (!('periodicSync' in reg)) return;
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
            if (status.state !== 'granted') return;
            await reg.periodicSync.register('finance-check', {
                minInterval: 12 * 60 * 60 * 1000, // 12h
            });
        } catch { /* silent — feature not available */ }
    }

    /**
     * Show a single notification through the service worker.
     * Falls back to the constructor-style Notification API when no SW.
     */
    async show(title, body, options = {}) {
        if (this.getPermission() !== 'granted' || !this.settings.enabled) return false;

        const fullOpts = {
            body,
            icon: '/icons/icon.svg',
            badge: '/icons/icon.svg',
            tag: options.tag || 'finance-ai',
            renotify: options.renotify ?? false,
            data: options.data || {},
            ...options,
        };

        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification(title, fullOpts);
                return true;
            }
        } catch { /* fall through */ }

        try {
            new Notification(title, fullOpts);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Run all enabled checks now. Throttled internally — safe to call often.
     */
    async runChecks() {
        if (!this.settings.enabled || this.getPermission() !== 'granted') return;
        if (this.settings.budgetAlerts) await this._checkBudgets();
        if (this.settings.dailyReminder) await this._checkDailyReminder();
        if (this.settings.marketAlerts) await this._checkMarket();
        if (this.settings.newsAlerts && this.ai) await this._checkNewsAnalysis();
        if (this.settings.backupAlerts) await this._checkBackup();
    }

    async _checkBackup() {
        if (!this.store?.daysSinceLastBackup) return;
        const days = this.store.daysSinceLastBackup();
        const interval = this.settings.backupIntervalDays ?? 7;
        if (!Number.isFinite(days) || days < interval) return;

        const last = this.settings.lastBackupNudge ? new Date(this.settings.lastBackupNudge).getTime() : 0;
        if (Date.now() - last < 3 * 86_400_000) return; // max once every 3 days

        await this.show(
            '🔒 Backup pendente',
            days === Infinity
                ? 'Nunca exportaste um backup cifrado. Abre as Definições para criar um.'
                : `Há ${days} dias sem backup. Exporta um backup cifrado nas Definições.`,
            { tag: 'backup-pending', data: { tab: 'dashboard' } }
        );
        this.settings.lastBackupNudge = new Date().toISOString();
        this._save();
    }

    startMonitoring() {
        this.runChecks();
        if (this._interval) clearInterval(this._interval);
        // Re-check every 30 min while the app is open
        this._interval = setInterval(() => this.runChecks(), 30 * 60_000);
    }

    stopMonitoring() {
        if (this._interval) clearInterval(this._interval);
        this._interval = null;
    }

    // ─── Specific checks ─────────────────────────────────────────────────────

    async _checkBudgets() {
        const now = Date.now();
        const last = this.settings.lastBudgetCheck ? new Date(this.settings.lastBudgetCheck).getTime() : 0;
        if (now - last < 12 * 60 * 60_000) return; // max once per 12h

        const today = new Date();
        const budgets = this.store.getBudgetProgress(today.getMonth(), today.getFullYear());
        const threshold = this.settings.budgetThreshold;
        let fired = false;

        for (const b of budgets) {
            if (b.percentage >= threshold) {
                const emoji = b.percentage >= 100 ? '🚨' : '⚠️';
                const title = `${emoji} Orçamento: ${b.category}`;
                const body = b.percentage >= 100
                    ? `Excedeste o orçamento de ${b.category} em ${(b.spent - b.limit).toFixed(2)}€`
                    : `Já usaste ${b.percentage.toFixed(0)}% do orçamento de ${b.category}`;
                await this.show(title, body, {
                    tag: `budget-${b.category}`,
                    data: { tab: 'budget' },
                    renotify: false,
                });
                fired = true;
            }
        }

        if (fired) {
            this.settings.lastBudgetCheck = new Date().toISOString();
            this._save();
        }
    }

    async _checkDailyReminder() {
        const now = new Date();
        const [h, m] = (this.settings.reminderTime || '20:00').split(':').map(Number);
        const slot = new Date(now);
        slot.setHours(h, m, 0, 0);
        if (now < slot) return;

        const last = this.settings.lastReminder ? new Date(this.settings.lastReminder) : null;
        if (last && last.toDateString() === now.toDateString()) return;

        const today = now.toISOString().split('T')[0];
        const txsToday = this.store.transactions.filter((t) => t.date === today);

        if (txsToday.length === 0) {
            await this.show(
                '📝 Lembrete diário',
                'Não te esqueças de registar as despesas de hoje!',
                { tag: 'daily-reminder', data: { tab: 'transactions' } }
            );
        }

        this.settings.lastReminder = now.toISOString();
        this._save();
    }

    async _checkMarket() {
        if (!this.market) return;
        const now = Date.now();
        const last = this.settings.lastMarketCheck ? new Date(this.settings.lastMarketCheck).getTime() : 0;
        if (now - last < 6 * 60 * 60_000) return; // max once per 6h

        try {
            const quotes = await this.market.fetchQuotes();
            const threshold = this.settings.marketThreshold;
            const big = quotes.filter((q) => Math.abs(q.changePct) >= threshold);
            if (big.length > 0) {
                const top = big.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 3);
                const body = top.map((q) => `${q.changePct >= 0 ? '↗' : '↘'} ${q.name}: ${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`).join('\n');
                await this.show('📈 Movimentos no mercado', body, {
                    tag: 'market-alert',
                    data: { view: 'market' },
                });
            }
            this.settings.lastMarketCheck = new Date().toISOString();
            this._save();
        } catch { /* market offline */ }
    }

    /**
     * Fetches recent financial news, asks the AI to estimate profit/loss
     * probability for each headline, and fires a notification when the AI's
     * estimate deviates from neutral by more than `profitChanceThreshold`.
     */
    async _checkNewsAnalysis() {
        if (!this.market || !this.ai) return;
        const now = Date.now();
        const last = this.settings.lastNewsCheck ? new Date(this.settings.lastNewsCheck).getTime() : 0;
        if (now - last < 4 * 60 * 60_000) return; // max once per 4h

        let news;
        try {
            news = await this.market.fetchNews('stocks markets economy earnings', 8);
        } catch { return; }
        if (!news?.length) return;

        const seen = new Set(this.settings.seenNewsTitles || []);
        const fresh = news.filter((n) => n.title && !seen.has(n.title));
        if (!fresh.length) { this._touchNewsCheck(); return; }

        // Limit to the 3 most recent items to avoid hammering the AI
        const toAnalyse = fresh.slice(0, 3);
        const analyses = await Promise.all(
            toAnalyse.map(async (n) => ({ news: n, analysis: await this.ai.analyzeNews(n) }))
        );

        const threshold = this.settings.profitChanceThreshold ?? 20;
        const significant = analyses.filter(({ analysis }) =>
            Math.abs(analysis.profitChance - 50) >= threshold
        );

        for (const { news: n, analysis: a } of significant) {
            const isUp = a.profitChance >= 50;
            const emoji = isUp ? '📈' : '📉';
            const direction = isUp ? 'subida' : 'queda';
            const title = `${emoji} ${a.profitChance}% probabilidade de ${direction}`;
            const body = `${n.title}\n\n${a.reasoning}`;
            await this.show(title, body, {
                tag: `news-analysis-${this._hash(n.title)}`,
                data: { view: 'market', newsLink: n.link },
                renotify: false,
            });
        }

        // Remember the titles we just processed (cap history at 50)
        const updatedSeen = [...this.settings.seenNewsTitles || [], ...toAnalyse.map((n) => n.title)];
        this.settings.seenNewsTitles = updatedSeen.slice(-50);
        this._touchNewsCheck();
    }

    _touchNewsCheck() {
        this.settings.lastNewsCheck = new Date().toISOString();
        this._save();
    }

    _hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
        return Math.abs(h).toString(36);
    }

    /** Used by the Settings UI to confirm setup. */
    async showTest() {
        const ok = await this.show(
            '✅ Notificações activas',
            'Vais receber alertas de orçamento, mercado e lembretes diários.',
            { tag: 'test', renotify: true }
        );
        return ok;
    }
}
