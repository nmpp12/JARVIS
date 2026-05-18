import { TransactionStore, CATEGORIES, CATEGORY_COLORS } from './store.js';
import { FinanceAI } from './ai.js';
import { FinanceCharts } from './charts.js';
import { MarketDataService, DEFAULT_SYMBOLS } from './market.js';
import { BankIntegration } from './bank.js';
import { NotificationManager } from './notifications.js';

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const CAT_ICONS = {
    'Alimentação': '🍽', 'Transporte': '🚗', 'Saúde': '❤️', 'Entretenimento': '🎬',
    'Habitação': '🏠', 'Educação': '📚', 'Compras': '🛒', 'Salário': '💼',
    'Freelance': '💻', 'Investimentos': '📈', 'Transferência': '↔️', 'Outros': '📌',
};

export class FinanceApp {
    constructor(rootEl, momStack = null) {
        this.root     = rootEl;
        this.momStack = momStack;
        this.store    = new TransactionStore();
        this.ai       = new FinanceAI(this.store, momStack);
        this.charts   = new FinanceCharts();
        this.market   = new MarketDataService();
        this.bank     = new BankIntegration();
        this.notifications = new NotificationManager(this.store, this.market, this.ai);
        this.tab  = 'dashboard';
        this.view = null;            // null | 'market' — full-screen overlay views
        this.aiMode = 'offline';
        this.marketAvailable = false;
        this.marketCache = null;     // { quotes, news, forecast, fetchedAt }
        const now = new Date();
        this.month = now.getMonth();
        this.year  = now.getFullYear();
    }

    async init() {
        if (this.momStack) {
            const { mom, memory, emotions, bus, dreams } = this.momStack;

            mom.registerChild('Finance', 'financial',
                'Finance AI — personal finance manager, market analyst, MOM\'s 3rd child');
            bus.register('Finance', ['budgeting', 'market_analysis', 'forecasting', 'news_analysis']);

            bus.setMomListener((message) => {
                memory.writeJournal(
                    `[Finance Bus] ${message.from} → ${message.to ?? 'broadcast'}: ${
                        typeof message.content === 'string' ? message.content : message.content?.type || 'message'
                    }`,
                    'observation'
                );
            });

            mom.onAlert((alert) => {
                memory.observeChild('Finance', alert.reason, 'concerning');
                emotions.feel('threat_detected', 0.5);
            });

            const stats = memory.getStats();
            memory.writeJournal(
                `Finance AI online. Awakening #${stats.awakenings}. Registered as MOM's 3rd child.`,
                'reflection'
            );

            const milestones = memory.getMilestones();
            if (!milestones.some((m) => m.title === 'Finance Child Registered')) {
                memory.recordMilestone(
                    'Finance Child Registered',
                    'Finance AI joined the MOM ecosystem for the first time.',
                    ['MOM', 'Finance']
                );
                emotions.feel('new_discovery', 0.8);
            }

            dreams.start();
            console.log(`[MOM] Awakening #${stats.awakenings} — Finance child registered`);
        }

        this.render();
        this.aiMode = await this.ai.initialize();
        this.marketAvailable = await this.market.healthCheck();
        // Refresh dashboard quietly to show market card status
        if (this.tab === 'dashboard') this._renderTab();
        // Start notification monitoring (no-op if permission not granted)
        this.notifications.startMonitoring();
        this._setupSWMessageHandler();
    }

    /** Handle messages from the service worker (notification clicks, periodic sync). */
    _setupSWMessageHandler() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.addEventListener('message', (event) => {
            const msg = event.data || {};
            if (msg.type === 'navigate') {
                if (msg.view === 'market') {
                    this.view = 'market';
                    this.render();
                } else if (msg.tab) {
                    this.view = null;
                    this.tab = msg.tab;
                    this.render();
                }
            } else if (msg.type === 'periodic-check') {
                this.notifications.runChecks();
            }
        });
    }

    // ─── Top-level render ────────────────────────────────────────────────────

    render() {
        const s = this.store.getSettings();
        this.root.innerHTML = `
<div class="fa-app">
  <header class="fa-header">
    <div class="fa-header-left">
      <div class="fa-logo"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>
      <div>
        <div class="fa-greeting">Olá, ${this._esc(s.name)}${this.momStack ? ` <span class="fa-mom-badge" title="MOM: ${this.momStack.emotions.getMood()}">${this._getMoodEmoji()}</span>` : ''}</div>
        <div class="fa-date">${this._fmtDate(new Date())}</div>
      </div>
    </div>
    <button class="fa-icon-btn" id="faSettingsBtn" aria-label="Definições">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
    </button>
  </header>

  <main class="fa-main${this.tab === 'assistant' ? ' chat-mode' : ''}" id="faMain"></main>

  <nav class="fa-nav">
    <button class="fa-nav-btn${this.tab === 'dashboard' ? ' active' : ''}" data-tab="dashboard" aria-label="Início">
      <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
      <span>Início</span>
    </button>
    <button class="fa-nav-btn${this.tab === 'transactions' ? ' active' : ''}" data-tab="transactions" aria-label="Transações">
      <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>
      <span>Contas</span>
    </button>
    <button class="fa-nav-add" id="faAddBtn" aria-label="Adicionar transação">
      <svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
    </button>
    <button class="fa-nav-btn${this.tab === 'budget' ? ' active' : ''}" data-tab="budget" aria-label="Orçamentos">
      <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z"/></svg>
      <span>Análise</span>
    </button>
    <button class="fa-nav-btn${this.tab === 'assistant' ? ' active' : ''}" data-tab="assistant" aria-label="Assistente IA">
      <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <span>IA</span>
    </button>
  </nav>
</div>`;

        this._renderTab();

        document.getElementById('faSettingsBtn').addEventListener('click', () => this._showSettings());
        document.getElementById('faAddBtn').addEventListener('click', () => this._showAddModal());
        document.querySelectorAll('.fa-nav-btn[data-tab]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                this.tab = e.currentTarget.dataset.tab;
                this.render();
            });
        });
    }

    // ─── Tab renderers ───────────────────────────────────────────────────────

    _renderTab() {
        const main = document.getElementById('faMain');
        if (!main) return;
        if (this.view === 'market') { this._renderMarketView(main); return; }
        if (this.view === 'audit')  { this._renderAuditView(main); return; }
        switch (this.tab) {
            case 'dashboard':    this._renderDashboard(main); break;
            case 'transactions': this._renderTransactions(main); break;
            case 'budget':       this._renderBudget(main); break;
            case 'assistant':    this._renderAssistant(main); break;
        }
    }

    _renderDashboard(el) {
        const s = this.store.getSettings();
        const cur = s.currency;
        const balance = this.store.getBalance();
        const stats = this.store.getMonthlyStats(this.month, this.year);
        const recent = this.store.getTransactions({}).slice(0, 5);
        const savingRate = stats.income > 0 ? ((stats.income - stats.expense) / stats.income) * 100 : 0;

        let insightHtml = '';
        if (stats.income === 0 && stats.expense === 0) {
            insightHtml = `<div class="fa-insight">Adiciona as tuas transações para ver análises e dicas personalizadas.</div>`;
        } else if (savingRate < 0) {
            insightHtml = `<div class="fa-insight bad">⚠ Este mês gastaste ${this._fmt(Math.abs(stats.income - stats.expense), cur)} a mais do que ganhaste.</div>`;
        } else if (savingRate >= 20) {
            insightHtml = `<div class="fa-insight good">✓ Excelente! Poupaste ${savingRate.toFixed(0)}% este mês. Continua assim!</div>`;
        } else {
            insightHtml = `<div class="fa-insight">Poupaste ${savingRate.toFixed(0)}% este mês. A meta recomendada é 20%.</div>`;
        }

        el.innerHTML = `
<div class="fa-section">
  <div class="fa-balance-card">
    <div class="fa-balance-label">Saldo Total</div>
    <div class="fa-balance-amount${balance < 0 ? ' neg' : ''}">${this._fmt(balance, cur)}</div>
    <div class="fa-balance-sub">${MONTH_NAMES[this.month]} ${this.year}</div>
    <div class="fa-balance-row">
      <div class="fa-stat income">
        <div class="fa-stat-arrow">↑</div>
        <div><div class="fa-stat-lbl">Receitas</div><div class="fa-stat-val">${this._fmt(stats.income, cur)}</div></div>
      </div>
      <div class="fa-stat expense">
        <div class="fa-stat-arrow">↓</div>
        <div><div class="fa-stat-lbl">Despesas</div><div class="fa-stat-val">${this._fmt(stats.expense, cur)}</div></div>
      </div>
    </div>
  </div>

  ${insightHtml}

  <button class="fa-feature-card market" id="openMarket">
    <div class="fa-fc-left">
      <div class="fa-fc-ico">📈</div>
      <div>
        <div class="fa-fc-title">Mercado &amp; Notícias</div>
        <div class="fa-fc-sub">${this.marketAvailable ? 'Análise IA com dados reais do Yahoo Finance' : 'Inicia o servidor de proxy para activar'}</div>
      </div>
    </div>
    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
  </button>

  <button class="fa-feature-card bank" id="openBank">
    <div class="fa-fc-left">
      <div class="fa-fc-ico">🏦</div>
      <div>
        <div class="fa-fc-title">Conectar Banco / Moey!</div>
        <div class="fa-fc-sub">${this._bankCardStatus()}</div>
      </div>
    </div>
    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
  </button>

  <div class="fa-row-header">
    <h2>Transações Recentes</h2>
    <button class="fa-link" data-tab="transactions">Ver todas</button>
  </div>
  <div class="fa-tx-list" id="txListDash">
    ${recent.length === 0
        ? '<div class="fa-empty">Nenhuma transação ainda. Usa o + para adicionar!</div>'
        : recent.map((t) => this._txCard(t, cur)).join('')}
  </div>
</div>`;

        el.querySelector('[data-tab="transactions"]')?.addEventListener('click', () => {
            this.tab = 'transactions'; this.render();
        });
        el.querySelector('#openMarket')?.addEventListener('click', () => {
            this.view = 'market'; this.render();
        });
        el.querySelector('#openBank')?.addEventListener('click', () => this._showBankModal());
        this._attachDeleteListeners(el);
    }

    _bankCardStatus() {
        const conns = this.bank.getConnections();
        const moey = conns.moey;
        if (moey?.lastSync) {
            const d = new Date(moey.lastSync);
            return `Moey! (demo) — última sincronização ${d.toLocaleDateString('pt')}`;
        }
        if (moey) return 'Moey! ligado (modo demo) — toca para sincronizar';
        return 'Importa extracto CSV ou activa modo demo';
    }

    _renderTransactions(el) {
        const s = this.store.getSettings();
        const cur = s.currency;
        const allTxs = this.store.getTransactions({ month: this.month, year: this.year });

        el.innerHTML = `
<div class="fa-section">
  <div class="fa-month-nav">
    <button id="prevMonth" class="fa-icon-btn sm">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
    </button>
    <span>${MONTH_NAMES[this.month]} ${this.year}</span>
    <button id="nextMonth" class="fa-icon-btn sm">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
    </button>
  </div>
  <div class="fa-filter-row">
    <button class="fa-filter active" data-filter="all">Todos</button>
    <button class="fa-filter" data-filter="income">Receitas</button>
    <button class="fa-filter" data-filter="expense">Despesas</button>
  </div>
  <div class="fa-tx-list" id="txList">
    ${allTxs.length === 0
        ? '<div class="fa-empty">Nenhuma transação este mês.</div>'
        : allTxs.map((t) => this._txCard(t, cur)).join('')}
  </div>
</div>`;

        document.getElementById('prevMonth').addEventListener('click', () => {
            if (this.month === 0) { this.month = 11; this.year--; } else this.month--;
            this._renderTab();
        });
        document.getElementById('nextMonth').addEventListener('click', () => {
            if (this.month === 11) { this.month = 0; this.year++; } else this.month++;
            this._renderTab();
        });

        el.querySelectorAll('.fa-filter').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                el.querySelectorAll('.fa-filter').forEach((b) => b.classList.remove('active'));
                e.target.classList.add('active');
                const filter = e.target.dataset.filter;
                const filtered = filter === 'all'
                    ? this.store.getTransactions({ month: this.month, year: this.year })
                    : this.store.getTransactions({ month: this.month, year: this.year, type: filter });
                const list = document.getElementById('txList');
                list.innerHTML = filtered.length === 0
                    ? '<div class="fa-empty">Sem transações.</div>'
                    : filtered.map((t) => this._txCard(t, cur)).join('');
                this._attachDeleteListeners(el);
            });
        });

        this._attachDeleteListeners(el);
    }

    _renderBudget(el) {
        const s = this.store.getSettings();
        const cur = s.currency;
        const budgets = this.store.getBudgetProgress(this.month, this.year);
        const catStats = this.store.getCategoryStats(this.month, this.year);
        const monthly = this.store.getLast6MonthsStats();
        const catEntries = Object.entries(catStats).sort((a, b) => b[1] - a[1]);
        const colors = catEntries.map(([cat]) => CATEGORY_COLORS[cat] || '#6b7280');

        el.innerHTML = `
<div class="fa-section">
  <h2 class="fa-sec-title">Orçamentos — ${MONTH_NAMES[this.month]}</h2>

  ${budgets.length === 0
    ? '<div class="fa-empty">Nenhum orçamento definido. Adiciona abaixo.</div>'
    : budgets.map((b) => `
      <div class="fa-budget-card">
        <button class="fa-del-btn" data-cat="${this._esc(b.category)}" aria-label="Remover">×</button>
        <div class="fa-budget-top">
          <span class="fa-budget-cat">${this._esc(b.category)}</span>
          <span class="fa-budget-vals"><strong>${this._fmt(b.spent, cur)}</strong> / ${this._fmt(b.limit, cur)}</span>
        </div>
        <div class="fa-progress-bar">
          <div class="fa-progress-fill${b.percentage >= 90 ? ' danger' : b.percentage >= 70 ? ' warn' : ''}" style="width:${b.percentage}%"></div>
        </div>
        <div class="fa-budget-foot">
          <span>${b.percentage.toFixed(0)}% utilizado</span>
          ${b.percentage >= 100
            ? '<span class="fa-badge danger">Excedido!</span>'
            : `<span class="fa-budget-rest">Resta ${this._fmt(b.limit - b.spent, cur)}</span>`}
        </div>
      </div>`).join('')}

  <div class="fa-card fa-add-budget">
    <h3>Novo Orçamento</h3>
    <select id="budgetCat" class="fa-select">
      <option value="">Categoria...</option>
      ${CATEGORIES.expense.map((c) => `<option value="${c}">${c}</option>`).join('')}
    </select>
    <input type="number" id="budgetAmt" class="fa-input" placeholder="Limite mensal (€)" min="0" step="0.01">
    <button id="saveBudget" class="fa-btn primary full">Guardar Orçamento</button>
  </div>

  <h2 class="fa-sec-title" style="margin-top:24px">Despesas por Categoria</h2>
  <div class="fa-card">
    <div class="fa-pie-wrap">
      <canvas id="pieChart" style="width:160px;height:160px;flex-shrink:0"></canvas>
      <div class="fa-legend">
        ${catEntries.map(([cat, val], i) => `
          <div class="fa-leg-item">
            <span class="fa-leg-dot" style="background:${colors[i]}"></span>
            <span class="fa-leg-cat">${this._esc(cat)}</span>
            <span class="fa-leg-val">${this._fmt(val, cur)}</span>
          </div>`).join('')}
        ${catEntries.length === 0 ? '<div class="fa-empty-sm">Sem despesas este mês.</div>' : ''}
      </div>
    </div>
  </div>

  <h2 class="fa-sec-title" style="margin-top:4px">Últimos 6 Meses</h2>
  <div class="fa-card">
    <div class="fa-bar-legend">
      <span><span class="fa-dot green"></span>Receitas</span>
      <span><span class="fa-dot red"></span>Despesas</span>
    </div>
    <canvas id="barChart" style="width:100%;height:160px;display:block"></canvas>
  </div>
</div>`;

        document.getElementById('saveBudget').addEventListener('click', () => {
            const cat = document.getElementById('budgetCat').value;
            const amt = document.getElementById('budgetAmt').value;
            if (!cat || !amt || parseFloat(amt) <= 0) { alert('Preenche a categoria e o valor.'); return; }
            this.store.setBudget(cat, amt);
            this._renderTab();
        });

        el.querySelectorAll('.fa-del-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const cat = e.currentTarget.dataset.cat;
                if (confirm(`Remover orçamento para "${cat}"?`)) {
                    this.store.removeBudget(cat);
                    this._renderTab();
                }
            });
        });

        requestAnimationFrame(() => {
            const pie = document.getElementById('pieChart');
            if (pie) this.charts.drawPieChart(pie, catEntries.map(([, v]) => v), catEntries.map(([k]) => k), colors);

            const bar = document.getElementById('barChart');
            if (bar) this.charts.drawBarChart(
                bar,
                monthly.map((m) => m.income),
                monthly.map((m) => m.expense),
                monthly.map((m) => m.label)
            );
        });
    }

    _renderAssistant(el) {
        const statusLabel = { mom: 'MOM', ollama: 'Ollama', offline: 'Offline' }[this.aiMode] || 'Offline';
        const isOnline = this.aiMode !== 'offline';

        el.innerHTML = `
<div class="fa-chat-wrap">
  <div class="fa-chat-status${isOnline ? ' online' : ''}">
    <span class="fa-dot-pulse"></span> IA: ${statusLabel}
  </div>
  <div class="fa-chat-msgs" id="chatMsgs">
    <div class="fa-msg assistant">
      <div class="fa-bubble">Olá! Sou o Finance AI. Como posso ajudar-te hoje com as tuas finanças?</div>
    </div>
  </div>
  <div class="fa-chat-foot">
    <div class="fa-sugs">
      <button class="fa-sug-strong" id="openMarketFromChat">📈 Ver mercado &amp; análise IA</button>
      <button class="fa-sug" data-msg="Como posso poupar mais dinheiro?">💰 Poupar</button>
      <button class="fa-sug" data-msg="Analisa a minha situação financeira este mês">📊 Análise</button>
      <button class="fa-sug" data-msg="Como devo investir as minhas poupanças?">📈 Investir</button>
      <button class="fa-sug" data-msg="Como criar um orçamento eficaz?">📋 Orçamento</button>
    </div>
    <div class="fa-chat-row">
      <input type="text" id="chatInput" class="fa-chat-inp" placeholder="Escreve uma pergunta..." autocomplete="off">
      <button id="chatSend" class="fa-chat-send">
        <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  </div>
</div>`;

        const sendMsg = async () => {
            const inp = document.getElementById('chatInput');
            const msg = inp?.value.trim();
            if (!msg) return;
            inp.value = '';
            this._appendMsg('user', msg);
            this._appendMsg('typing', '');

            const stats = this.store.getMonthlyStats(this.month, this.year);
            const cur = this.store.getSettings().currency;
            const balance = this.store.getBalance();
            const ctx = `Saldo total: ${this._fmt(balance, cur)}\nReceitas este mês: ${this._fmt(stats.income, cur)}\nDespesas este mês: ${this._fmt(stats.expense, cur)}\nSaldo mensal: ${this._fmt(stats.income - stats.expense, cur)}`;

            const marketCtx = this.marketCache
                ? this.market.summarize(this.marketCache.quotes) + '\n\nNotícias:\n' + this.market.summarizeNews(this.marketCache.news, 4)
                : '';

            const reply = await this.ai.chat(msg, ctx, marketCtx);
            document.querySelector('.fa-msg.typing')?.remove();
            this._appendMsg('assistant', reply);
        };

        document.getElementById('chatSend').addEventListener('click', sendMsg);
        document.getElementById('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });
        document.getElementById('openMarketFromChat')?.addEventListener('click', () => {
            this.view = 'market';
            this.tab = 'dashboard';
            this.render();
        });
        el.querySelectorAll('.fa-sug').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                document.getElementById('chatInput').value = e.target.dataset.msg;
                sendMsg();
            });
        });
    }

    // ─── Audit view (Histórico IA) ───────────────────────────────────────────

    _renderAuditView(el) {
        const audits = this.store.getAudits().slice().reverse();
        const hr = this.store.getHitRate();

        const hrSummary = hr
            ? `<div class="fa-audit-summary">
                 <div><span class="fa-au-big">${hr.rate.toFixed(0)}%</span> hit-rate</div>
                 <div class="fa-au-sub">${hr.correct} certas / ${hr.judged} avaliadas · ${hr.total} totais</div>
               </div>`
            : `<div class="fa-audit-summary"><div class="fa-au-sub">Marca abaixo as previsões para começares a ver o hit-rate.</div></div>`;

        el.innerHTML = `
<div class="fa-section">
  <div class="fa-view-hdr">
    <button class="fa-icon-btn" id="closeAudit" aria-label="Voltar">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
    </button>
    <h2 class="fa-view-title">Histórico IA</h2>
    <button class="fa-icon-btn" id="clearAudit" aria-label="Limpar">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
    </button>
  </div>

  ${hrSummary}

  <div class="fa-audit-list">
    ${audits.length === 0
        ? '<div class="fa-empty">Sem decisões registadas ainda. Abre Mercado para a IA analisar notícias.</div>'
        : audits.map((a) => this._auditCard(a)).join('')}
  </div>
</div>`;

        document.getElementById('closeAudit').addEventListener('click', () => {
            this.view = null;
            this.tab = 'dashboard';
            this.render();
        });

        document.getElementById('clearAudit').addEventListener('click', () => {
            if (confirm('Apagar todo o Histórico IA? Esta acção não pode ser desfeita.')) {
                localStorage.removeItem('fa_audit_log');
                this._renderTab();
            }
        });

        el.querySelectorAll('.fa-au-outcome').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const outcome = e.currentTarget.dataset.outcome;
                const current = this.store.getAudits().find((a) => a.id === id);
                // Toggle off if already set to the same value
                this.store.setAuditOutcome(id, current?.outcome === outcome ? null : outcome);
                this._renderTab();
            });
        });

        el.querySelectorAll('.fa-au-del').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                this.store.deleteAudit(e.currentTarget.dataset.id);
                this._renderTab();
            });
        });
    }

    _auditCard(a) {
        const date = new Date(a.timestamp);
        const time = date.toLocaleString('pt', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        let title = '';
        let body = '';
        let icon = '🤖';

        if (a.type === 'news-analysis') {
            icon = a.output?.profitChance >= 50 ? '📈' : '📉';
            title = `Notícia · ${a.output?.profitChance}% chance de ${a.output?.profitChance >= 50 ? 'subida' : 'queda'}`;
            body = `<div class="fa-au-headline">${this._esc(a.inputs?.title || '')}</div>
                    <div class="fa-au-reason">${this._esc(a.output?.reasoning || '')}</div>`;
        } else if (a.type === 'forecast') {
            icon = '📊';
            title = `Análise de mercado (algo v${a.algoVersion})`;
            const preview = (a.output || '').slice(0, 220).replace(/\*\*/g, '').replace(/\n/g, ' ');
            body = `<div class="fa-au-reason">${this._esc(preview)}…</div>`;
        }

        const oc = a.outcome;
        return `
<div class="fa-au-card${oc ? ' ' + oc : ''}">
  <div class="fa-au-hdr">
    <span class="fa-au-icon">${icon}</span>
    <div class="fa-au-meta">
      <div class="fa-au-title">${this._esc(title)}</div>
      <div class="fa-au-time">${time} · ${a.mode}</div>
    </div>
    <button class="fa-au-del fa-icon-btn sm" data-id="${a.id}" aria-label="Apagar">
      <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>
  </div>
  ${body}
  <div class="fa-au-actions">
    <button class="fa-au-outcome correct${oc === 'correct' ? ' active' : ''}" data-id="${a.id}" data-outcome="correct">✓ Acertou</button>
    <button class="fa-au-outcome wrong${oc === 'wrong' ? ' active' : ''}" data-id="${a.id}" data-outcome="wrong">✗ Falhou</button>
  </div>
</div>`;
    }

    // ─── Market view (full screen) ───────────────────────────────────────────

    _renderMarketView(el) {
        const cached = this.marketCache;
        const stale = !cached || Date.now() - cached.fetchedAt > 5 * 60_000;

        el.innerHTML = `
<div class="fa-section">
  <div class="fa-view-hdr">
    <button class="fa-icon-btn" id="closeMarketView" aria-label="Voltar">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
    </button>
    <h2 class="fa-view-title">Mercado &amp; Notícias</h2>
    <button class="fa-icon-btn" id="refreshMarket" aria-label="Atualizar">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
    </button>
  </div>

  <div id="marketContent">
    ${!this.marketAvailable
        ? `<div class="fa-empty">⚠ Servidor de proxy indisponível.<br><br><span style="font-size:12px">Inicia o servidor com <code>npm run dev</code> para activar os dados de mercado em directo do Yahoo Finance.</span></div>`
        : (!cached || stale)
            ? `<div class="fa-loading">A obter dados do mercado…</div>`
            : this._buildMarketHTML(cached)
    }
  </div>
</div>`;

        document.getElementById('closeMarketView').addEventListener('click', () => {
            this.view = null;
            this.tab = 'dashboard';
            this.render();
        });
        document.getElementById('refreshMarket').addEventListener('click', () => this._loadMarketData(true));

        if (this.marketAvailable && (!cached || stale)) this._loadMarketData(false);
    }

    async _loadMarketData(force) {
        const content = document.getElementById('marketContent');
        if (!content) return;
        if (force || !this.marketCache) {
            content.innerHTML = `<div class="fa-loading">A obter dados do mercado…</div>`;
        }

        try {
            const [quotes, news] = await Promise.all([
                this.market.fetchQuotes(DEFAULT_SYMBOLS),
                this.market.fetchNews('stocks economy markets', 8),
            ]);

            // News items start without analysis; will be populated in background
            const newsWithAnalysis = news.map((n) => ({ ...n, analysis: null }));

            this.marketCache = { quotes, news: newsWithAnalysis, forecast: null, fetchedAt: Date.now() };
            if (content) content.innerHTML = this._buildMarketHTML(this.marketCache);
            this._attachMarketListeners();

            // Auto-generate forecast + analyze news in background
            this._generateForecast();
            this._analyzeNewsItems();
        } catch (e) {
            if (content) content.innerHTML = `<div class="fa-empty">Erro ao obter dados: ${this._esc(e.message)}</div>`;
        }
    }

    /**
     * Run AI analysis on each news headline in the cache and progressively
     * update the rendered list as each result arrives.
     */
    async _analyzeNewsItems() {
        if (!this.marketCache?.news?.length) return;
        const items = this.marketCache.news;

        // Limit to first 5 for cost/time
        for (let i = 0; i < Math.min(items.length, 5); i++) {
            try {
                const analysis = await this.ai.analyzeNews(items[i]);
                items[i].analysis = analysis;
                // Re-render only if we're still on the market view
                if (this.view === 'market') {
                    const node = document.querySelector(`[data-news-idx="${i}"] .fa-news-ai`);
                    if (node) {
                        node.outerHTML = this._buildNewsAnalysisHTML(analysis);
                    }
                }
            } catch { /* keep going */ }
        }
    }

    _buildMarketHTML(cache) {
        const { quotes, news, forecast } = cache;
        const groups = {
            'Índices':      quotes.filter((q) => q.group === 'index'),
            'Cripto':       quotes.filter((q) => q.group === 'crypto'),
            'Câmbio':       quotes.filter((q) => q.group === 'fx'),
            'Commodities':  quotes.filter((q) => q.group === 'commodity'),
        };

        let html = '';

        for (const [label, list] of Object.entries(groups)) {
            if (!list.length) continue;
            html += `<h3 class="fa-mk-sec">${label}</h3>`;
            html += '<div class="fa-mk-grid">';
            for (const q of list) {
                const up = q.changePct >= 0;
                html += `
<div class="fa-mk-card">
  <div class="fa-mk-top">
    <div class="fa-mk-name">${this._esc(q.name)}</div>
    <div class="fa-mk-sym">${this._esc(q.symbol)}</div>
  </div>
  <div class="fa-mk-price">${q.price.toFixed(q.price < 10 ? 4 : 2)} <span class="fa-mk-cur">${this._esc(q.currency)}</span></div>
  <div class="fa-mk-change ${up ? 'up' : 'down'}">
    ${up ? '▲' : '▼'} ${up ? '+' : ''}${q.change.toFixed(2)} (${up ? '+' : ''}${q.changePct.toFixed(2)}%)
  </div>
</div>`;
            }
            html += '</div>';
        }

        html += '<h3 class="fa-mk-sec">Análise IA &amp; Recomendações</h3>';
        if (forecast) {
            html += `<div class="fa-forecast">${this._mdToHtml(forecast)}</div>
                     <button class="fa-btn ghost full" id="regenForecast" style="margin-top:10px">Pedir nova análise</button>`;
        } else {
            html += `<div class="fa-card"><div class="fa-loading-small">A gerar análise personalizada…</div></div>`;
        }

        html += '<h3 class="fa-mk-sec">Notícias + Análise IA (chance de profit)</h3>';
        if (!news.length) {
            html += '<div class="fa-empty-sm">Sem notícias disponíveis.</div>';
        } else {
            html += '<div class="fa-news-list">';
            news.forEach((n, idx) => {
                const time = n.publishedAt ? n.publishedAt.toLocaleDateString('pt', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
                html += `
<a class="fa-news-item" href="${this._esc(n.link)}" target="_blank" rel="noopener noreferrer" data-news-idx="${idx}">
  <div class="fa-news-title">${this._esc(n.title)}</div>
  ${this._buildNewsAnalysisHTML(n.analysis)}
  <div class="fa-news-meta">
    <span class="fa-news-pub">${this._esc(n.publisher || '')}</span>
    ${time ? `<span class="fa-news-time">${time}</span>` : ''}
  </div>
</a>`;
            });
            html += '</div>';
        }

        const hr = this.store.getHitRate();
        const hrText = hr ? `Hit-rate IA: <strong>${hr.rate.toFixed(0)}%</strong> (${hr.correct}/${hr.judged} avaliações)` : 'Hit-rate IA: sem avaliações ainda — abre o Histórico IA';
        html += `<div class="fa-disclaimer">⚠ Dados Yahoo Finance (~15min delay). ${hrText}</div>`;
        return html;
    }

    _buildNewsAnalysisHTML(analysis) {
        if (!analysis) {
            return `<div class="fa-news-ai pending"><span class="fa-news-pulse"></span> A analisar…</div>`;
        }
        const isUp = analysis.profitChance >= 50;
        const cls = analysis.impact === 'positive' ? 'up' : analysis.impact === 'negative' ? 'down' : 'neutral';
        const arrow = isUp ? '▲' : '▼';
        const dir = isUp ? 'subida' : 'queda';
        const barColor = isUp ? 'var(--income)' : 'var(--expense)';
        const barWidth = Math.abs(analysis.profitChance - 50) * 2;
        return `
<div class="fa-news-ai ${cls}">
  <div class="fa-news-prob">
    <span class="fa-news-pct">${arrow} ${analysis.profitChance}%</span>
    <span class="fa-news-dir">chance de ${dir}</span>
  </div>
  <div class="fa-news-bar"><div class="fa-news-bar-fill" style="width:${barWidth}%;background:${barColor}"></div></div>
  ${analysis.reasoning ? `<div class="fa-news-reason">${this._esc(analysis.reasoning)}</div>` : ''}
</div>`;
    }

    _attachMarketListeners() {
        document.getElementById('regenForecast')?.addEventListener('click', () => {
            if (this.marketCache) {
                this.marketCache.forecast = null;
                const c = document.getElementById('marketContent');
                if (c) c.innerHTML = this._buildMarketHTML(this.marketCache);
                this._attachMarketListeners();
                this._generateForecast();
            }
        });
    }

    async _generateForecast() {
        if (!this.marketCache) return;
        const cur = this.store.getSettings().currency;
        const stats = this.store.getMonthlyStats(this.month, this.year);
        const balance = this.store.getBalance();
        const catStats = this.store.getCategoryStats(this.month, this.year);
        const topCats = Object.entries(catStats).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const monthlyBalance = stats.income - stats.expense;
        const sym = { EUR: '€', USD: '$', GBP: '£', BRL: 'R$' }[cur] || cur;

        const budgetText = [
            `Saldo total: ${this._fmt(balance, cur)}`,
            `Receitas este mês: ${this._fmt(stats.income, cur)}`,
            `Despesas este mês: ${this._fmt(stats.expense, cur)}`,
            `Saldo mensal: ${monthlyBalance >= 0 ? '+' : '-'}${sym}${Math.abs(monthlyBalance).toFixed(2)}`,
            topCats.length ? `Categorias com mais despesa: ${topCats.map(([c, v]) => `${c} (${this._fmt(v, cur)})`).join(', ')}` : '',
        ].filter(Boolean).join('\n');

        const upCount   = this.marketCache.quotes.filter((q) => q.changePct >= 0).length;
        const downCount = this.marketCache.quotes.filter((q) => q.changePct <  0).length;

        const forecast = await this.ai.forecast({
            budget: { monthlyBalance, balance, income: stats.income, expense: stats.expense },
            budgetText,
            marketSummary: this.market.summarize(this.marketCache.quotes),
            marketStats: { upCount, downCount },
            newsSummary: this.market.summarizeNews(this.marketCache.news),
        });

        this.marketCache.forecast = forecast;

        // Re-render only if user is still in market view
        if (this.view === 'market') {
            const c = document.getElementById('marketContent');
            if (c) c.innerHTML = this._buildMarketHTML(this.marketCache);
            this._attachMarketListeners();
        }
    }

    // ─── Bank / Moey! modal ──────────────────────────────────────────────────

    _showBankModal() {
        const conns = this.bank.getConnections();
        const moey = conns.moey;

        const modal = this._modal(`
<div class="fa-modal-hdr">
  <h2>Conectar Banco</h2>
  <button class="fa-icon-btn" id="closeBank">
    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
  </button>
</div>

<div class="fa-bank-info">
  <strong>Sobre integração bancária em Portugal:</strong><br>
  A ligação directa a um banco como Moey! (sincronização em tempo real) requer uma licença AISP/PSD2 emitida pelo Banco de Portugal — só fornecedores licenciados podem aceder à Open Banking API. Esta app oferece duas alternativas legais:
</div>

<div class="fa-bank-opt">
  <div class="fa-bank-opt-hdr">
    <div>
      <div class="fa-bank-opt-title">📱 Moey! — Modo Demo</div>
      <div class="fa-bank-opt-sub">Importa transações de exemplo para experimentares a funcionalidade</div>
    </div>
    ${moey ? '<span class="fa-badge success">Ligado</span>' : ''}
  </div>
  <div class="fa-bank-actions">
    ${moey
      ? `<button class="fa-btn primary" id="syncMoey">Sincronizar agora</button>
         <button class="fa-btn ghost" id="disconnectMoey">Desligar</button>`
      : `<button class="fa-btn primary full" id="connectMoey">Ligar (modo demo)</button>`}
  </div>
</div>

<div class="fa-bank-opt">
  <div class="fa-bank-opt-hdr">
    <div>
      <div class="fa-bank-opt-title">📄 Importar extracto CSV</div>
      <div class="fa-bank-opt-sub">Exporta o extracto do teu banco (Moey!, ActivoBank, CGD...) em CSV e importa aqui</div>
    </div>
  </div>
  <input type="file" id="csvFile" accept=".csv,text/csv" style="display:none">
  <button class="fa-btn secondary full" id="pickCsv">Escolher ficheiro CSV</button>
  <div class="fa-bank-hint">Formatos suportados: data, descrição, valor (ou débito/crédito separados). Decimal pode ser <code>,</code> ou <code>.</code></div>
</div>
`);

        document.getElementById('closeBank').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('connectMoey')?.addEventListener('click', () => {
            this.bank.connectMockBank('moey', 'Moey!');
            modal.remove();
            this._showBankModal();
        });

        document.getElementById('disconnectMoey')?.addEventListener('click', () => {
            if (confirm('Desligar Moey! demo?')) {
                this.bank.disconnect('moey');
                modal.remove();
                this._renderTab();
            }
        });

        document.getElementById('syncMoey')?.addEventListener('click', () => {
            const txs = this.bank.fetchDemoTransactions('moey');
            this._showImportPreview(txs, 'Moey! (demo)');
            modal.remove();
        });

        const fileInput = document.getElementById('csvFile');
        document.getElementById('pickCsv').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const parsed = this.bank.parseCSV(text);
            if (!parsed.length) {
                alert('Não foi possível extrair transações deste ficheiro.\nVerifica se tem cabeçalhos como "Data", "Descrição", "Valor".');
                return;
            }
            modal.remove();
            this._showImportPreview(parsed, file.name);
        });
    }

    _showImportPreview(transactions, sourceLabel) {
        const cur = this.store.getSettings().currency;
        const totalInc = transactions.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
        const totalExp = transactions.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

        const modal = this._modal(`
<div class="fa-modal-hdr">
  <h2>Pré-visualizar Import</h2>
  <button class="fa-icon-btn" id="closeImport">
    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
  </button>
</div>
<div class="fa-import-summary">
  <div><strong>${transactions.length}</strong> transações de <em>${this._esc(sourceLabel)}</em></div>
  <div class="fa-import-totals">
    <span class="up">+${this._fmt(totalInc, cur)}</span>
    <span class="down">-${this._fmt(totalExp, cur)}</span>
  </div>
</div>
<div class="fa-import-list">
${transactions.slice(0, 50).map((t) => `
  <div class="fa-import-row">
    <div class="fa-import-info">
      <div class="fa-import-cat">${this._esc(t.category)}</div>
      <div class="fa-import-desc">${this._esc(t.description)}</div>
      <div class="fa-import-date">${this._esc(t.date)}</div>
    </div>
    <div class="fa-import-amt ${t.type === 'income' ? 'inc' : 'exp'}">${t.type === 'income' ? '+' : '-'}${this._fmt(t.amount, cur)}</div>
  </div>
`).join('')}
${transactions.length > 50 ? `<div class="fa-empty-sm">+${transactions.length - 50} mais…</div>` : ''}
</div>
<button class="fa-btn primary full" id="confirmImport">Importar ${transactions.length} transações</button>
<button class="fa-btn ghost full" id="cancelImport" style="margin-top:8px">Cancelar</button>
`);

        document.getElementById('closeImport').addEventListener('click', () => modal.remove());
        document.getElementById('cancelImport').addEventListener('click', () => modal.remove());

        document.getElementById('confirmImport').addEventListener('click', () => {
            for (const t of transactions) this.store.addTransaction(t);
            modal.remove();
            this.render();
            alert(`${transactions.length} transações importadas com sucesso.`);
        });
    }

    // ─── Modals ──────────────────────────────────────────────────────────────

    _showAddModal() {
        const cur = this.store.getSettings().currency;
        const modal = this._modal(`
<div class="fa-modal-hdr">
  <h2>Nova Transação</h2>
  <button class="fa-icon-btn" id="closeModal">
    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
  </button>
</div>
<div class="fa-type-tog">
  <button class="fa-type-btn active" data-type="expense">Despesa</button>
  <button class="fa-type-btn" data-type="income">Receita</button>
</div>
<div class="fa-form">
  <div class="fa-fg">
    <label>Valor (${cur})</label>
    <input type="number" id="txAmt" class="fa-input xl" placeholder="0.00" min="0" step="0.01" inputmode="decimal">
  </div>
  <div class="fa-fg">
    <label>Categoria</label>
    <select id="txCat" class="fa-select">
      ${CATEGORIES.expense.map((c) => `<option value="${c}">${c}</option>`).join('')}
    </select>
  </div>
  <div class="fa-fg">
    <label>Descrição (opcional)</label>
    <input type="text" id="txDesc" class="fa-input" placeholder="Ex: Almoço, Gasolina...">
  </div>
  <div class="fa-fg">
    <label>Data</label>
    <input type="date" id="txDate" class="fa-input" value="${new Date().toISOString().split('T')[0]}">
  </div>
  <button id="saveTx" class="fa-btn primary full">Guardar</button>
</div>`);

        let txType = 'expense';

        modal.querySelectorAll('.fa-type-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.fa-type-btn').forEach((b) => b.classList.remove('active'));
                e.target.classList.add('active');
                txType = e.target.dataset.type;
                const sel = document.getElementById('txCat');
                sel.innerHTML = CATEGORIES[txType].map((c) => `<option value="${c}">${c}</option>`).join('');
            });
        });

        document.getElementById('closeModal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('saveTx').addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('txAmt').value);
            if (!amount || amount <= 0) { alert('Insere um valor válido.'); return; }
            this.store.addTransaction({
                type: txType,
                amount,
                category: document.getElementById('txCat').value,
                description: document.getElementById('txDesc').value,
                date: document.getElementById('txDate').value,
            });
            this._checkFinancialMilestones();
            modal.remove();
            this._renderTab();
        });

        setTimeout(() => document.getElementById('txAmt')?.focus(), 100);
    }

    _showSettings() {
        const s = this.store.getSettings();
        const modal = this._modal(`
<div class="fa-modal-hdr">
  <h2>Definições</h2>
  <button class="fa-icon-btn" id="closeSettings">
    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
  </button>
</div>
<div class="fa-form">
  <div class="fa-fg">
    <label>O teu nome</label>
    <input type="text" id="setName" class="fa-input" value="${this._esc(s.name)}">
  </div>
  <div class="fa-fg">
    <label>Moeda</label>
    <select id="setCur" class="fa-select">
      ${[['EUR','€ Euro'],['USD','$ Dólar'],['GBP','£ Libra'],['BRL','R$ Real']].map(
          ([v, l]) => `<option value="${v}"${s.currency === v ? ' selected' : ''}>${l}</option>`
      ).join('')}
    </select>
  </div>
  <button id="saveSettings" class="fa-btn primary full">Guardar</button>
  <button id="auditBtn" class="fa-btn secondary full">📊 Histórico IA${(() => { const hr = this.store.getHitRate(); return hr ? ` — ${hr.rate.toFixed(0)}% hit-rate` : ''; })()}</button>
  <button id="exportEncBtn" class="fa-btn secondary full">🔒 Exportar Cifrado (recomendado)</button>
  <button id="importEncBtn" class="fa-btn secondary full">📥 Importar Backup Cifrado</button>
  <button id="exportBtn" class="fa-btn ghost full">Exportar JSON (não cifrado)</button>
  <input type="file" id="importEncFile" accept=".fafenc,application/octet-stream" style="display:none">
  ${(() => { const d = this.store.daysSinceLastBackup(); return Number.isFinite(d) ? `<div class="fa-backup-status">Último backup: há ${d} dia${d === 1 ? '' : 's'}</div>` : ''; })()}
</div>
<div class="fa-settings-ai">
  <div class="fa-ai-row">
    <span>Estado da IA</span>
    <span class="fa-badge${this.aiMode !== 'offline' ? ' success' : ''}" id="aiStatusBadge">${
        this.aiMode !== 'offline' ? this.aiMode.toUpperCase() : 'Offline'}</span>
  </div>
  <button id="reconnectBtn" class="fa-btn ghost full" style="margin-top:8px">Reconectar IA</button>
</div>

${this._renderNotificationsSection()}
`);

        document.getElementById('closeSettings').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.store.updateSettings({
                name: document.getElementById('setName').value.trim() || 'Utilizador',
                currency: document.getElementById('setCur').value,
            });
            modal.remove();
            this.render();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            const data = this.store.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finance-ai-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('auditBtn').addEventListener('click', () => {
            modal.remove();
            this.view = 'audit';
            this.render();
        });

        document.getElementById('exportEncBtn').addEventListener('click', async () => {
            const pwd = prompt('Define uma password para cifrar o backup (mínimo 6 caracteres):');
            if (!pwd) return;
            try {
                const bytes = await this.store.exportEncrypted(pwd);
                const blob = new Blob([bytes], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `finance-ai-${new Date().toISOString().split('T')[0]}.fafenc`;
                a.click();
                URL.revokeObjectURL(url);
                this.store.markBackupNow();
                alert('Backup cifrado guardado.\nGuarda o ficheiro num local seguro (Drive, Dropbox, etc).');
            } catch (e) {
                alert(`Erro: ${e.message}`);
            }
        });

        const importFileInput = document.getElementById('importEncFile');
        document.getElementById('importEncBtn').addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const pwd = prompt('Password do backup:');
            if (!pwd) return;
            try {
                const buffer = await file.arrayBuffer();
                await this.store.importEncrypted(buffer, pwd);
                alert('Backup restaurado com sucesso.');
                modal.remove();
                this.render();
            } catch (err) {
                alert(`Erro a importar: ${err.message}`);
            }
        });

        document.getElementById('reconnectBtn').addEventListener('click', async () => {
            this.aiMode = await this.ai.initialize();
            const badge = document.getElementById('aiStatusBadge');
            badge.className = `fa-badge${this.aiMode !== 'offline' ? ' success' : ''}`;
            badge.textContent = this.aiMode !== 'offline' ? this.aiMode.toUpperCase() : 'Offline';
        });

        this._attachNotificationListeners(modal);
    }

    // ─── Notifications UI ────────────────────────────────────────────────────

    _renderNotificationsSection() {
        const perm = this.notifications.getPermission();
        const s = this.notifications.getSettings();

        let permLabel = 'Não suportado';
        let permClass = '';
        if (perm === 'default')  { permLabel = 'Não activadas'; permClass = ''; }
        if (perm === 'granted')  { permLabel = 'Activas';       permClass = ' success'; }
        if (perm === 'denied')   { permLabel = 'Bloqueadas';    permClass = ' danger'; }

        let body = '';
        if (perm === 'unsupported') {
            body = `<div class="fa-notif-hint">O teu browser não suporta notificações.</div>`;
        } else if (perm === 'denied') {
            body = `<div class="fa-notif-hint">A permissão foi negada. Vai a <em>Definições do Site</em> no browser para reactivar.</div>`;
        } else if (perm === 'default') {
            body = `<div class="fa-notif-hint">Activa para receberes alertas de orçamento, mercado e lembretes diários — sem precisares de servidor.</div>
                    <button class="fa-btn primary full" id="enableNotifs" style="margin-top:10px">Activar Notificações</button>`;
        } else {
            body = `
<div class="fa-notif-opts">
  <label class="fa-notif-row-opt">
    <span><strong>Alertas de orçamento</strong><br><small>Quando atinges ${s.budgetThreshold}% do orçamento de uma categoria</small></span>
    <input type="checkbox" id="notifBudget" class="fa-switch"${s.budgetAlerts ? ' checked' : ''}>
  </label>
  <label class="fa-notif-row-opt">
    <span><strong>Movimentos do mercado</strong><br><small>Variações ≥ ${s.marketThreshold}% nos teus activos seguidos</small></span>
    <input type="checkbox" id="notifMarket" class="fa-switch"${s.marketAlerts ? ' checked' : ''}>
  </label>
  <label class="fa-notif-row-opt">
    <span><strong>Notícias com análise IA</strong><br><small>Probabilidade de profit/perda calculada pela IA para cada notícia</small></span>
    <input type="checkbox" id="notifNews" class="fa-switch"${s.newsAlerts ? ' checked' : ''}>
  </label>
  <label class="fa-notif-row-opt">
    <span><strong>Lembrete diário</strong><br><small>Às ${s.reminderTime} se ainda não registaste despesas</small></span>
    <input type="checkbox" id="notifDaily" class="fa-switch"${s.dailyReminder ? ' checked' : ''}>
  </label>
  <label class="fa-notif-row-opt">
    <span><strong>Backup pendente</strong><br><small>Alerta se passarem ${s.backupIntervalDays || 7} dias sem exportar backup cifrado</small></span>
    <input type="checkbox" id="notifBackup" class="fa-switch"${s.backupAlerts ? ' checked' : ''}>
  </label>
  <div class="fa-notif-row-opt">
    <span><strong>Hora do lembrete</strong></span>
    <input type="time" id="notifTime" value="${s.reminderTime}" class="fa-input" style="width:100px;padding:6px 10px;font-size:13px">
  </div>
</div>
<button class="fa-btn ghost full" id="testNotif" style="margin-top:10px">Testar notificação</button>`;
        }

        return `
<div class="fa-settings-ai">
  <div class="fa-ai-row">
    <span>Notificações</span>
    <span class="fa-badge${permClass}" id="notifBadge">${permLabel}</span>
  </div>
  <div id="notifBody" style="margin-top:8px">${body}</div>
</div>`;
    }

    _attachNotificationListeners(modal) {
        const enableBtn = modal.querySelector('#enableNotifs');
        if (enableBtn) {
            enableBtn.addEventListener('click', async () => {
                enableBtn.disabled = true;
                enableBtn.textContent = 'A pedir permissão…';
                const result = await this.notifications.requestPermission();
                if (result === 'granted') {
                    await this.notifications.showTest();
                    this.notifications.startMonitoring();
                }
                // Re-render the notifications section
                const body = modal.querySelector('#notifBody');
                const badge = modal.querySelector('#notifBadge');
                if (body && badge) {
                    const html = this._renderNotificationsSection();
                    const wrap = document.createElement('div');
                    wrap.innerHTML = html;
                    body.parentElement.replaceWith(wrap.firstElementChild);
                    this._attachNotificationListeners(modal);
                }
            });
        }

        const onToggle = (id, key) => {
            const cb = modal.querySelector(`#${id}`);
            if (cb) cb.addEventListener('change', () => {
                this.notifications.updateSettings({ [key]: cb.checked });
            });
        };
        onToggle('notifBudget', 'budgetAlerts');
        onToggle('notifMarket', 'marketAlerts');
        onToggle('notifNews',   'newsAlerts');
        onToggle('notifDaily',  'dailyReminder');
        onToggle('notifBackup', 'backupAlerts');

        const timeInput = modal.querySelector('#notifTime');
        if (timeInput) timeInput.addEventListener('change', () => {
            this.notifications.updateSettings({ reminderTime: timeInput.value });
        });

        const testBtn = modal.querySelector('#testNotif');
        if (testBtn) testBtn.addEventListener('click', async () => {
            const ok = await this.notifications.showTest();
            if (!ok) alert('Não foi possível mostrar a notificação. Verifica as permissões do browser.');
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    _modal(innerHtml) {
        const overlay = document.createElement('div');
        overlay.className = 'fa-overlay';
        overlay.innerHTML = `<div class="fa-modal">${innerHtml}</div>`;
        document.body.appendChild(overlay);
        return overlay;
    }

    _txCard(tx, cur) {
        const isIncome = tx.type === 'income';
        const color = CATEGORY_COLORS[tx.category] || '#6b7280';
        return `
<div class="fa-tx-card">
  <div class="fa-tx-ico" style="background:${color}18;color:${color}">${CAT_ICONS[tx.category] || '📌'}</div>
  <div class="fa-tx-info">
    <div class="fa-tx-cat">${this._esc(tx.category)}</div>
    <div class="fa-tx-desc">${this._esc(tx.description || tx.category)}</div>
    <div class="fa-tx-date">${this._fmtDate(new Date(tx.date + 'T12:00:00'))}</div>
  </div>
  <div class="fa-tx-right">
    <div class="fa-tx-amt${isIncome ? ' inc' : ' exp'}">${isIncome ? '+' : '-'}${this._fmt(tx.amount, cur)}</div>
    <button class="fa-del-tx" data-id="${tx.id}" aria-label="Eliminar">×</button>
  </div>
</div>`;
    }

    _attachDeleteListeners(container) {
        container.querySelectorAll('.fa-del-tx').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                if (confirm('Eliminar esta transação?')) {
                    this.store.deleteTransaction(e.currentTarget.dataset.id);
                    this._renderTab();
                }
            });
        });
    }

    _appendMsg(type, text) {
        const msgs = document.getElementById('chatMsgs');
        if (!msgs) return;
        const div = document.createElement('div');
        div.className = `fa-msg ${type}`;
        if (type === 'typing') {
            div.innerHTML = `<div class="fa-bubble"><span class="fa-dots"><span></span><span></span><span></span></span></div>`;
        } else {
            div.innerHTML = `<div class="fa-bubble">${this._mdToHtml(text)}</div>`;
        }
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    _fmt(value, currency) {
        const sym = { EUR: '€', USD: '$', GBP: '£', BRL: 'R$' }[currency] || currency;
        return `${sym}${Math.abs(value).toFixed(2)}`;
    }

    _fmtDate(d) {
        return d.toLocaleDateString('pt', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    _mdToHtml(text) {
        return this._esc(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    // ─── MOM integration helpers ─────────────────────────────────────────────

    _getMoodEmoji() {
        if (!this.momStack) return '';
        const mood = this.momStack.emotions.getMood();
        const map = {
            calm:      '😌',
            nurturing: '🤗',
            vigilant:  '👁',
            proud:     '✨',
            concerned: '😟',
            inspired:  '💡',
        };
        return map[mood] || '😌';
    }

    _checkFinancialMilestones() {
        if (!this.momStack) return;
        const { memory, emotions } = this.momStack;
        const balance = this.store.getBalance();
        const milestones = memory.getMilestones();

        const thresholds = [100, 500, 1000, 5000, 10000];
        for (const threshold of thresholds) {
            const label = `Saldo: €${threshold}`;
            if (balance >= threshold && !milestones.some((m) => m.title === label)) {
                memory.recordMilestone(
                    label,
                    `Saldo total atingiu €${threshold}. Marco financeiro alcançado.`,
                    ['Finance', 'Utilizador']
                );
                emotions.feel('milestone_reached', 0.9);
                memory.learnLesson(
                    `Utilizador atingiu saldo de €${threshold}`,
                    'financial_milestone',
                    'important'
                );
                break; // one milestone per transaction
            }
        }
    }
}
