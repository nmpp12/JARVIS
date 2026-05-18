export class FinanceAI {
    constructor() {
        this.mode = 'offline';
        this.baseUrl = null;
        this.ollamaModel = null;
        this.history = [];
        this.systemPrompt =
            'És um assistente financeiro pessoal chamado Finance AI. ' +
            'Ajudas o utilizador a gerir as suas finanças pessoais de forma prática e objectiva. ' +
            'Responde sempre em português europeu, de forma concisa e amigável. ' +
            'Quando deres conselhos, baseia-te nos dados financeiros do utilizador quando disponíveis. ' +
            'Nunca dês conselhos de investimento específicos, mas podes dar orientações gerais.';
    }

    async initialize() {
        // Try MOM server
        try {
            const r = await fetch('http://localhost:8000/health', {
                signal: AbortSignal.timeout(2000),
            });
            if (r.ok) {
                this.baseUrl = 'http://localhost:8000';
                this.mode = 'mom';
                return 'mom';
            }
        } catch { /* offline */ }

        // Try Ollama via dev proxy
        try {
            const r = await fetch('/ollama/api/tags', {
                signal: AbortSignal.timeout(2000),
            });
            if (r.ok) {
                const data = await r.json();
                if (data.models?.length > 0) {
                    this.ollamaModel = data.models[0].name;
                    this.baseUrl = '/ollama';
                    this.mode = 'ollama';
                    return 'ollama';
                }
            }
        } catch { /* offline */ }

        this.mode = 'offline';
        return 'offline';
    }

    async chat(userMessage, financialContext = '', marketContext = '') {
        if (this.mode === 'offline') {
            return this._offlineResponse(userMessage);
        }

        let sysContent = this.systemPrompt;
        if (financialContext) sysContent += `\n\nDados financeiros actuais do utilizador:\n${financialContext}`;
        if (marketContext) sysContent += `\n\nEstado dos mercados financeiros agora:\n${marketContext}`;

        const messages = [
            { role: 'system', content: sysContent },
            ...this.history,
            { role: 'user', content: userMessage },
        ];

        try {
            let reply;
            if (this.mode === 'mom') {
                reply = await this._chatMOM(messages);
            } else {
                reply = await this._chatOllama(messages);
            }

            this.history.push({ role: 'user', content: userMessage });
            this.history.push({ role: 'assistant', content: reply });
            if (this.history.length > 20) this.history = this.history.slice(-20);

            return reply;
        } catch {
            return this._offlineResponse(userMessage);
        }
    }

    async _chatMOM(messages) {
        const r = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, max_tokens: 512, temperature: 0.7, stream: false }),
            signal: AbortSignal.timeout(30000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        return data.choices[0].message.content;
    }

    async _chatOllama(messages) {
        const r = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.ollamaModel, messages, stream: false }),
            signal: AbortSignal.timeout(30000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        return data.message.content;
    }

    _offlineResponse(input) {
        const q = input.toLowerCase();

        if (q.includes('olá') || q.includes('ola') || q.includes('bom dia') || q.includes('boa tarde') || q.includes('boa noite')) {
            return 'Olá! Sou o Finance AI, o teu assistente financeiro pessoal.\n\nPosso ajudar-te com:\n• **Análise das tuas finanças**\n• **Dicas de poupança**\n• **Gestão de orçamentos**\n• **Conceitos de investimento**\n\nO que gostarias de saber?';
        }

        if (q.includes('poupan') || q.includes('economiz') || q.includes('guardar dinheiro')) {
            return '**Dicas de Poupança:**\n\n• **Regra 50/30/20**: 50% necessidades, 30% desejos, 20% poupança\n• Automatiza transferências para poupança no dia do salário\n• Revê subscrições mensais — elimina as que não usas\n• Cria um fundo de emergência (3 a 6 meses de despesas)\n• Evita compras por impulso — espera 24h antes de decidir\n\n*Liga o servidor MOM ou Ollama para análise personalizada das tuas finanças.*';
        }

        if (q.includes('invest') || q.includes('bolsa') || q.includes('acções') || q.includes('acoes')) {
            return '**Investimento — Orientações Gerais:**\n\n• Diversifica — nunca coloques tudo num só activo\n• Investe a longo prazo para reduzir volatilidade\n• **ETFs de índice** têm baixas comissões e boa diversificação\n• **PPR** (Portugal) oferece benefícios fiscais\n• Começa pelos juros compostos — quanto mais cedo, melhor\n• Só investe dinheiro que não precisas a curto prazo\n\n*Consulta sempre um consultor financeiro certificado para decisões específicas.*';
        }

        if (q.includes('dívid') || q.includes('divid') || q.includes('crédito') || q.includes('empréstim')) {
            return '**Gestão de Dívidas:**\n\n• **Método Avalanche**: paga primeiro a dívida com maior taxa de juro\n• **Método Bola de Neve**: começa pela menor dívida para ganhar motivação\n• Evita crédito rotativo no cartão — os juros são muito altos\n• Consolida dívidas se conseguires uma taxa mais baixa\n• Negocia com os credores — muitas vezes aceitam melhores condições\n\n*Liga o servidor para um plano personalizado com os teus dados.*';
        }

        if (q.includes('orçament') || q.includes('budget') || q.includes('planear')) {
            return '**Como Criar um Orçamento:**\n\n1. Lista todas as **receitas** mensais\n2. Regista todas as **despesas** (fixas e variáveis)\n3. Categoriza e analisa onde gastas mais\n4. Define **limites por categoria** no separador Orçamentos\n5. Revê mensalmente e ajusta conforme necessário\n\n💡 *Usa o separador "Orçamentos" desta app para criar e monitorizar os teus limites.*';
        }

        if (q.includes('analisa') || q.includes('resumo') || q.includes('situação')) {
            return 'Para uma análise detalhada das tuas finanças, preciso estar ligado a um servidor de IA (MOM ou Ollama).\n\n**O que podes fazer agora:**\n• Ver o teu **Dashboard** para o resumo mensal\n• Consultar o separador **Análise** para gráficos\n• Verificar os **Orçamentos** para ver onde estás\n\n*Liga o servidor nas Definições para análise personalizada.*';
        }

        return 'Posso ajudar-te com gestão financeira, poupança, orçamentos e investimentos.\n\n**Experimenta perguntar:**\n• "Como posso poupar mais?"\n• "Dicas sobre dívidas"\n• "Como criar um orçamento?"\n• "Conceitos de investimento"\n\n*Para respostas personalizadas com os teus dados, liga o servidor MOM ou Ollama nas Definições.*';
    }

    /**
     * Produce a personalised market forecast that combines the user's budget,
     * real market data and recent news headlines. Falls back to a rule-based
     * recommendation when no AI backend is available.
     */
    async forecast({ budget, budgetText, marketSummary, marketStats, newsSummary }) {
        if (this.mode === 'offline') {
            return this._offlineForecast(budget, marketStats);
        }

        const prompt = `Com base nos dados abaixo, faz uma análise financeira personalizada para o utilizador.

DADOS DO UTILIZADOR:
${budgetText}

MERCADOS HOJE:
${marketSummary}

NOTÍCIAS FINANCEIRAS RECENTES:
${newsSummary}

Responde nesta estrutura, em português europeu, conciso e prático:

**1. A tua situação**
(2-3 frases sobre o estado financeiro do utilizador)

**2. O mercado hoje**
(2-3 frases sobre o que se passa nos mercados, ligando às notícias)

**3. O que deves considerar fazer**
(3 recomendações numeradas, específicas e accionáveis baseadas na situação dele e no mercado)

**Aviso**: termina com uma linha curta a lembrar que isto não é conselho de investimento profissional.`;

        try {
            const messages = [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: prompt },
            ];
            if (this.mode === 'mom')    return await this._chatMOM(messages);
            if (this.mode === 'ollama') return await this._chatOllama(messages);
        } catch {
            return this._offlineForecast(budget, marketStats);
        }
        return this._offlineForecast(budget, marketStats);
    }

    _offlineForecast(budget, market) {
        const lines = [];
        const monthly = budget?.monthlyBalance ?? 0;

        lines.push('**1. A tua situação**');
        if (monthly > 0) {
            lines.push(`Estás a poupar ${monthly.toFixed(2)}€ este mês — é uma posição saudável.`);
        } else if (monthly < 0) {
            lines.push(`As despesas estão a ultrapassar as receitas em ${Math.abs(monthly).toFixed(2)}€. Atenção.`);
        } else {
            lines.push('Receitas e despesas estão equilibradas este mês.');
        }

        lines.push('\n**2. O mercado hoje**');
        const ups = market?.upCount ?? 0;
        const downs = market?.downCount ?? 0;
        if (ups > downs) {
            lines.push('A maioria dos índices está a subir hoje. Apetite por risco moderadamente positivo.');
        } else if (downs > ups) {
            lines.push('Os mercados estão maioritariamente em queda. Sinal de cautela e aversão ao risco.');
        } else {
            lines.push('Mercados mistos — sem direcção clara.');
        }

        lines.push('\n**3. O que deves considerar fazer**');
        if (monthly < 0) {
            lines.push('1. **Reduzir despesas variáveis** (Entretenimento, Compras) este mês.');
            lines.push('2. **Adiar novos investimentos** até estabilizares a saúde do orçamento.');
            lines.push('3. **Renegociar contratos** (telecom, energia) — poupanças de 20-30€/mês são comuns.');
        } else if (monthly < 100) {
            lines.push('1. **Constituir fundo de emergência** (3-6 meses de despesas) antes de investir.');
            lines.push('2. **Automatizar transferência** de 50-100€ no dia do salário para poupança.');
            lines.push('3. **Diversificar** — começa por um PPR ou ETF de índice mundial.');
        } else {
            lines.push('1. **DCA mensal** num ETF de índice mundial (ex.: VWCE) reduz risco de timing.');
            lines.push('2. **Maximizar PPR** — benefício fiscal até 400€/ano (até 35 anos).');
            lines.push('3. **Manter liquidez** suficiente para oportunidades — não investir tudo de uma vez.');
        }

        lines.push('\n*Isto não é conselho de investimento profissional. Consulta um consultor certificado antes de tomares decisões financeiras importantes.*');
        return lines.join('\n');
    }

    /**
     * Analyze a single news headline and estimate the probability that it
     * leads to a positive market move (profit) versus a negative one.
     * Returns: { impact: 'positive'|'negative'|'neutral', profitChance: 0-100,
     *            reasoning: string }
     */
    async analyzeNews(newsItem) {
        const title = newsItem?.title || '';
        if (!title) return { impact: 'neutral', profitChance: 50, reasoning: '' };

        if (this.mode === 'offline') return this._offlineNewsAnalysis(title);

        const prompt = `Analisa esta notícia financeira e estima o impacto provável nos mercados.

NOTÍCIA: "${title}"
${newsItem.tickers?.length ? `ACTIVOS RELACIONADOS: ${newsItem.tickers.join(', ')}` : ''}

Responde APENAS com JSON válido (uma só linha, sem markdown, sem texto antes ou depois):
{"impact":"positive","profitChance":72,"reasoning":"frase curta em português"}

Regras:
- impact: "positive" | "negative" | "neutral"
- profitChance: número 0-100. 50=neutro, >50=mais provável subida, <50=mais provável queda
- reasoning: frase de 10-20 palavras em português europeu`;

        try {
            const messages = [
                { role: 'system', content: 'És um analista financeiro. Respondes sempre em JSON válido, sem texto adicional.' },
                { role: 'user', content: prompt },
            ];
            let raw;
            if (this.mode === 'mom')         raw = await this._chatMOM(messages);
            else if (this.mode === 'ollama') raw = await this._chatOllama(messages);
            else return this._offlineNewsAnalysis(title);

            const parsed = this._extractJSON(raw);
            if (parsed && parsed.impact) {
                return {
                    impact: ['positive', 'negative', 'neutral'].includes(parsed.impact) ? parsed.impact : 'neutral',
                    profitChance: Math.max(0, Math.min(100, Math.round(Number(parsed.profitChance) || 50))),
                    reasoning: String(parsed.reasoning || '').slice(0, 180),
                };
            }
        } catch { /* fall through */ }

        return this._offlineNewsAnalysis(title);
    }

    _extractJSON(text) {
        if (!text) return null;
        // Try to find the first JSON object in the response
        const direct = text.match(/\{[\s\S]*?"impact"[\s\S]*?\}/);
        if (!direct) return null;
        try {
            return JSON.parse(direct[0]);
        } catch {
            // Try to clean up common LLM formatting issues
            const cleaned = direct[0]
                .replace(/[“”]/g, '"')
                .replace(/[‘’]/g, "'")
                .replace(/,\s*}/g, '}');
            try { return JSON.parse(cleaned); } catch { return null; }
        }
    }

    _offlineNewsAnalysis(title) {
        const t = title.toLowerCase();
        const positive = [
            'profit', 'profits', 'gain', 'gains', 'rally', 'surge', 'surges', 'beat', 'beats',
            'outperform', 'rise', 'rises', 'jump', 'jumps', 'soar', 'soars', 'record high',
            'record', 'strong', 'rebound', 'recovery', 'upgrade', 'upgraded', 'bullish',
            'lucro', 'subida', 'sobe', 'cresce', 'crescimento', 'recorde', 'forte', 'recupera',
        ];
        const negative = [
            'loss', 'losses', 'crash', 'decline', 'declines', 'fall', 'falls', 'miss',
            'misses', 'warning', 'downgrade', 'downgraded', 'plunge', 'tumble', 'drop',
            'drops', 'weak', 'cut', 'cuts', 'slide', 'slides', 'bearish', 'concern',
            'queda', 'cai', 'desce', 'perdas', 'fraco', 'corte', 'aviso',
        ];

        let pos = 0, neg = 0;
        positive.forEach((k) => { if (t.includes(k)) pos++; });
        negative.forEach((k) => { if (t.includes(k)) neg++; });

        if (pos > neg) {
            return {
                impact: 'positive',
                profitChance: Math.min(85, 55 + pos * 8),
                reasoning: 'Tom positivo detectado (análise heurística por palavras-chave).',
            };
        }
        if (neg > pos) {
            return {
                impact: 'negative',
                profitChance: Math.max(15, 45 - neg * 8),
                reasoning: 'Tom negativo detectado (análise heurística por palavras-chave).',
            };
        }
        return { impact: 'neutral', profitChance: 50, reasoning: 'Sem direcção clara na manchete.' };
    }

    clearHistory() {
        this.history = [];
    }
}
