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

    async chat(userMessage, financialContext = '') {
        if (this.mode === 'offline') {
            return this._offlineResponse(userMessage);
        }

        const sysContent =
            this.systemPrompt +
            (financialContext ? `\n\nDados financeiros actuais do utilizador:\n${financialContext}` : '');

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

    clearHistory() {
        this.history = [];
    }
}
