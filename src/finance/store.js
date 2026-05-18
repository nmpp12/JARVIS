export const CATEGORIES = {
    income: ['Salário', 'Freelance', 'Investimentos', 'Transferência', 'Outros'],
    expense: ['Alimentação', 'Transporte', 'Saúde', 'Entretenimento', 'Habitação', 'Educação', 'Compras', 'Outros'],
};

export const CATEGORY_COLORS = {
    'Salário': '#10b981',
    'Freelance': '#06b6d4',
    'Investimentos': '#8b5cf6',
    'Transferência': '#3b82f6',
    'Alimentação': '#f59e0b',
    'Transporte': '#3b82f6',
    'Saúde': '#ec4899',
    'Entretenimento': '#f97316',
    'Habitação': '#6366f1',
    'Educação': '#14b8a6',
    'Compras': '#a855f7',
    'Outros': '#6b7280',
};

export class TransactionStore {
    constructor() {
        this._load();
    }

    _load() {
        try {
            this.transactions = JSON.parse(localStorage.getItem('fa_transactions') || '[]');
            this.budgets = JSON.parse(localStorage.getItem('fa_budgets') || '{}');
            this.settings = JSON.parse(localStorage.getItem('fa_settings') || '{"currency":"EUR","name":"Utilizador"}');
        } catch {
            this.transactions = [];
            this.budgets = {};
            this.settings = { currency: 'EUR', name: 'Utilizador' };
        }
    }

    _save() {
        localStorage.setItem('fa_transactions', JSON.stringify(this.transactions));
        localStorage.setItem('fa_budgets', JSON.stringify(this.budgets));
        localStorage.setItem('fa_settings', JSON.stringify(this.settings));
    }

    addTransaction({ type, amount, category, description, date }) {
        const tx = {
            id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type,
            amount: parseFloat(amount),
            category,
            description: description || '',
            date: date || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
        };
        this.transactions.unshift(tx);
        this._save();
        return tx;
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter((t) => t.id !== id);
        this._save();
    }

    getTransactions({ month, year, type, category } = {}) {
        return this.transactions.filter((t) => {
            if (type && t.type !== type) return false;
            if (category && t.category !== category) return false;
            if (month !== undefined && year !== undefined) {
                const d = new Date(t.date + 'T12:00:00');
                if (d.getMonth() !== month || d.getFullYear() !== year) return false;
            }
            return true;
        });
    }

    getBalance() {
        return this.transactions.reduce(
            (acc, t) => (t.type === 'income' ? acc + t.amount : acc - t.amount),
            0
        );
    }

    getMonthlyStats(month, year) {
        const txs = this.getTransactions({ month, year });
        const income = txs.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
        const expense = txs.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
        return { income, expense, balance: income - expense, count: txs.length };
    }

    getCategoryStats(month, year) {
        const txs = this.getTransactions({ month, year });
        const stats = {};
        txs
            .filter((t) => t.type === 'expense')
            .forEach((t) => {
                stats[t.category] = (stats[t.category] || 0) + t.amount;
            });
        return stats;
    }

    getLast6MonthsStats() {
        const result = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const s = this.getMonthlyStats(d.getMonth(), d.getFullYear());
            result.push({
                label: d.toLocaleDateString('pt', { month: 'short' }),
                income: s.income,
                expense: s.expense,
            });
        }
        return result;
    }

    setBudget(category, amount) {
        this.budgets[category] = parseFloat(amount);
        this._save();
    }

    removeBudget(category) {
        delete this.budgets[category];
        this._save();
    }

    getBudgets() {
        return { ...this.budgets };
    }

    getBudgetProgress(month, year) {
        const catStats = this.getCategoryStats(month, year);
        return Object.entries(this.budgets).map(([category, limit]) => {
            const spent = catStats[category] || 0;
            return { category, limit, spent, percentage: Math.min(100, (spent / limit) * 100) };
        });
    }

    updateSettings(updates) {
        this.settings = { ...this.settings, ...updates };
        this._save();
    }

    getSettings() {
        return { ...this.settings };
    }

    exportData() {
        return {
            transactions: this.transactions,
            budgets: this.budgets,
            settings: this.settings,
            exportedAt: new Date().toISOString(),
        };
    }
}
