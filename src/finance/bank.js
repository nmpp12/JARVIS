/**
 * BankIntegration — Bank statement import + Moey! integration.
 *
 * Real-time API integration with Portuguese banks (including Moey!) requires
 * an AISP (Account Information Service Provider) licence under PSD2,
 * authorised by Banco de Portugal. This is not feasible for an unlicensed
 * client-side app, so this module instead supports:
 *
 *  1. CSV / OFX import of statements exported by the user from their bank
 *  2. A demo data generator that simulates a Moey! account sync
 *  3. Heuristic auto-categorisation based on PT merchant keywords
 */

const CATEGORY_KEYWORDS = {
    'Alimentação': [
        'supermercado', 'pingo doce', 'continente', 'lidl', 'auchan', 'mini preço', 'mini-preço',
        'mercadona', 'intermarche', 'intermarché', 'minipreco', 'restaurante', 'mcdonald', 'burger',
        'kfc', 'pizza', 'cafe', 'café', 'padaria', 'pastelaria', 'cervejaria', 'restaurant',
        'tasca', 'pizzaria', 'subway', 'starbucks',
    ],
    'Transporte': [
        'galp', 'bp ', 'cepsa', 'repsol', 'prio', 'uber', 'bolt', 'metro', 'carris', 'comboio',
        'cp ', 'estacionamento', 'parking', 'portagem', 'via verde', 'gasolina', 'gasóleo', 'gasoleo',
        'auto-estrada', 'autoestrada', 'taxi', 'táxi',
    ],
    'Saúde': [
        'farmacia', 'farmácia', 'hospital', 'clinica', 'clínica', 'medico', 'médico', 'dentista',
        'óptica', 'optica', 'laboratorio', 'laboratório', 'lusiadas', 'luz saúde', 'cuf',
    ],
    'Entretenimento': [
        'cinema', 'spotify', 'netflix', 'hbo', 'disney+', 'amazon prime', 'youtube premium',
        'twitch', 'steam', 'playstation', 'xbox', 'concerto', 'teatro', 'discoteca', 'nos cinemas',
    ],
    'Habitação': [
        'edp', 'galp gás', 'galp gas', 'iberdrola', 'goldenergy', 'endesa', 'meo', 'nos ',
        'vodafone', 'nowo', 'epal', 'sma', 'simar', 'condominio', 'condomínio', 'renda',
        'hipoteca', 'seguro casa', 'ikea',
    ],
    'Educação': [
        'universidade', 'escola', 'colégio', 'colegio', 'udemy', 'coursera', 'livraria', 'wook',
        'bertrand', 'fnac livros',
    ],
    'Compras': [
        'amazon', 'fnac', 'worten', 'mediamarkt', 'el corte ingles', 'pull&bear', 'zara', 'h&m',
        'mango', 'shopping', 'centro comercial', 'leroy merlin', 'sportzone', 'sport zone',
        'decathlon', 'aliexpress', 'shein',
    ],
    'Salário': ['salario', 'salário', 'ordenado', 'vencimento', 'remuneração', 'remuneracao'],
    'Investimentos': [
        'investimento', 'etoro', 'degiro', 'xtb', 'trade republic', 'dividendo', 'dividend',
        'juros depósito', 'juros deposito', 'ppr',
    ],
    'Transferência': ['transferência', 'transferencia', 'transf.', 'mb way', 'mbway'],
};

/** Demo Moey! data — relative to today */
function buildDemoTransactions() {
    const today = new Date();
    const days = (n) => {
        const d = new Date(today);
        d.setDate(today.getDate() - n);
        return d.toISOString().split('T')[0];
    };
    return [
        { date: days(0),  description: 'Continente Colombo - Compras', amount: -42.75 },
        { date: days(1),  description: 'Galp - Combustível',           amount: -55.20 },
        { date: days(2),  description: 'McDonald\'s Saldanha',         amount: -8.90  },
        { date: days(3),  description: 'Spotify Premium',              amount: -6.99  },
        { date: days(4),  description: 'MB Way - Recebido',            amount:  25.00 },
        { date: days(5),  description: 'Pingo Doce Areeiro',           amount: -31.40 },
        { date: days(6),  description: 'Uber - Lisboa',                amount: -7.50  },
        { date: days(8),  description: 'Salário - Empresa XPTO',       amount:  1450.00 },
        { date: days(10), description: 'Netflix Mensalidade',          amount: -9.99  },
        { date: days(12), description: 'Farmácia Central',             amount: -18.45 },
        { date: days(14), description: 'EDP - Electricidade',          amount: -47.30 },
        { date: days(15), description: 'MEO Internet+TV',              amount: -39.90 },
        { date: days(18), description: 'Worten - Acessórios',          amount: -22.50 },
        { date: days(20), description: 'Via Verde - Portagens',        amount: -14.80 },
        { date: days(22), description: 'Café Versailles',              amount: -5.40  },
    ];
}

export class BankIntegration {
    constructor() {
        this._loadState();
    }

    _loadState() {
        try {
            this.state = JSON.parse(localStorage.getItem('fa_bank_state') || '{}');
        } catch {
            this.state = {};
        }
        if (!this.state.connections) this.state.connections = {};
    }

    _save() {
        localStorage.setItem('fa_bank_state', JSON.stringify(this.state));
    }

    getConnections() {
        return { ...this.state.connections };
    }

    /**
     * Mock-connect to a bank (e.g., "moey").
     * In production this would launch the PSD2/AISP OAuth flow.
     */
    connectMockBank(bankId, label) {
        this.state.connections[bankId] = {
            id: bankId,
            label,
            mode: 'demo',
            connectedAt: new Date().toISOString(),
            lastSync: null,
        };
        this._save();
        return this.state.connections[bankId];
    }

    disconnect(bankId) {
        delete this.state.connections[bankId];
        this._save();
    }

    /**
     * Generate demo Moey! transactions for the connected mock account.
     */
    fetchDemoTransactions(bankId = 'moey') {
        const conn = this.state.connections[bankId];
        if (!conn) return [];
        conn.lastSync = new Date().toISOString();
        this._save();
        return buildDemoTransactions().map((t) => ({
            ...t,
            type: t.amount >= 0 ? 'income' : 'expense',
            amount: Math.abs(t.amount),
            category: this.categorize(t.description, t.amount >= 0 ? 'income' : 'expense'),
            source: bankId,
        }));
    }

    /**
     * Parse a CSV statement. Accepts common PT bank formats with:
     *   - Header row (one of the columns containing "data" / "descri" / "valor")
     *   - PT decimal comma (e.g. "12,50") or international point ("12.50")
     *   - Date as DD-MM-YYYY, DD/MM/YYYY or YYYY-MM-DD
     *   - Either a signed Valor column, or separate Debito/Credito columns
     */
    parseCSV(text) {
        const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
        if (lines.length < 2) return [];

        const sep = this._detectSeparator(lines[0]);
        const headers = this._splitCSV(lines[0], sep).map((h) => this._normalize(h));

        const idxDate   = headers.findIndex((h) => /^data/.test(h) || h.includes('data mov'));
        const idxDesc   = headers.findIndex((h) => h.includes('descri') || h.includes('detalhe') || h === 'transacao');
        const idxAmount = headers.findIndex((h) => h === 'valor' || h === 'montante' || h === 'amount');
        const idxDeb    = headers.findIndex((h) => h.includes('debit') || h === 'saida' || h === 'saída');
        const idxCred   = headers.findIndex((h) => h.includes('credit') || h === 'entrada');

        if (idxDate < 0 || idxDesc < 0) return [];

        const out = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = this._splitCSV(lines[i], sep);
            if (cols.length < headers.length / 2) continue;

            const dateRaw = cols[idxDate];
            const desc = cols[idxDesc];
            let amount = 0;

            if (idxAmount >= 0) {
                amount = this._parseAmount(cols[idxAmount]);
            } else if (idxDeb >= 0 || idxCred >= 0) {
                const deb = idxDeb >= 0 ? this._parseAmount(cols[idxDeb]) : 0;
                const cred = idxCred >= 0 ? this._parseAmount(cols[idxCred]) : 0;
                amount = cred - Math.abs(deb);
            }
            if (!amount || !desc) continue;

            const date = this._parseDate(dateRaw);
            if (!date) continue;

            const type = amount >= 0 ? 'income' : 'expense';
            out.push({
                date,
                description: desc,
                amount: Math.abs(amount),
                type,
                category: this.categorize(desc, type),
                source: 'csv-import',
            });
        }
        return out;
    }

    _detectSeparator(headerLine) {
        const counts = { ';': 0, ',': 0, '\t': 0 };
        for (const c of headerLine) if (c in counts) counts[c]++;
        const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return best[1] > 0 ? best[0] : ';';
    }

    _splitCSV(line, sep) {
        // Lightweight CSV split that respects "double-quoted" fields
        const out = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (c === sep && !inQuotes) {
                out.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        out.push(cur.trim());
        return out;
    }

    _normalize(s) {
        return s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9 ]/g, '')
            .trim();
    }

    _parseAmount(raw) {
        if (!raw) return 0;
        let s = String(raw).trim().replace(/[€$£\s]/g, '');
        // PT format "1.234,56" → "1234.56"; or "1,234.56"
        if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else if (s.includes(',') && !s.includes('.')) {
            s = s.replace(',', '.');
        } else if (s.includes(',') && s.includes('.') && s.lastIndexOf(',') > s.lastIndexOf('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        }
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    _parseDate(raw) {
        if (!raw) return null;
        const s = raw.trim();
        // YYYY-MM-DD
        let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
        // DD-MM-YYYY or DD/MM/YYYY
        m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        // DD-MM-YY
        m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
        if (m) return `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        return null;
    }

    categorize(description, type) {
        const lower = description.toLowerCase();
        for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (keywords.some((k) => lower.includes(k))) return cat;
        }
        return type === 'income' ? 'Outros' : 'Outros';
    }
}
