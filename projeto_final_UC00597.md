# PROJETO FINAL INTEGRADOR

**FORMANDO:** _______________________________________________
**UC:** UC00597
**AÇÃO:** _______________________________________________
**FORMADORA:** Rute Leandro Gonçalves

---

## TEMA DO PROJETO

**Cenário 3 – Aplicação não inicia após instalação**

> Um utilizador tenta abrir uma aplicação recém-instalada, mas esta não inicia ou fecha imediatamente sem apresentar uma mensagem de erro clara.

---

## 1 – PESQUISA DE INFORMAÇÃO

| Fonte | Tipo | Informação encontrada | Fiabilidade |
|---|---|---|---|
| **Microsoft Learn** (learn.microsoft.com) | Documentação oficial | Explica como diagnosticar falhas no arranque de aplicações através do Visualizador de Eventos do Windows (`eventvwr.msc`), como verificar e instalar dependências em falta (Visual C++ Redistributable, .NET Framework) e como reparar instalações corrompidas via Painel de Controlo. | **Alta** – fonte oficial, mantida pela própria Microsoft, com informação técnica validada e atualizada regularmente. |
| **Stack Overflow** (stackoverflow.com) | Fórum técnico | Diversas respostas de programadores e técnicos sobre erros comuns ao iniciar aplicações: ficheiros DLL em falta, conflitos entre versões de bibliotecas, permissões insuficientes e incompatibilidade com o sistema operativo. As respostas mais votadas incluem exemplos práticos e soluções testadas. | **Média** – a qualidade das respostas varia; as mais votadas e comentadas tendem a ser fiáveis, mas requerem validação cruzada com outras fontes. |
| **How-To Geek** (howtogeek.com) | Blog técnico | Artigo detalhado sobre resolução de problemas de instalação: verificar a compatibilidade com o sistema operativo, reinstalar com privilégios de administrador, limpar ficheiros residuais de instalações anteriores e confirmar os requisitos mínimos de hardware. | **Média-Alta** – blog técnico reconhecido internacionalmente, com conteúdo revisto editorialmente, embora não seja fonte oficial de nenhum fabricante. |

---

## 2 – SÍNTESE TÉCNICA

**Descrição do problema:**
Após instalar uma aplicação num computador com Windows, o utilizador tenta abrir o programa, mas este não inicia ou fecha imediatamente sem apresentar uma mensagem de erro clara. O problema ocorre mesmo depois de o processo de instalação ter aparentemente terminado com sucesso.

**Causas prováveis:**

1. **Dependências em falta** – A aplicação necessita de componentes de software externos (como .NET Framework, Visual C++ Redistributable ou outros runtimes) que não estão instalados ou estão desatualizados no sistema.

2. **Instalação incompleta ou corrompida** – O processo de instalação pode ter sido interrompido ou ter falhado silenciosamente (por falta de espaço em disco, queda de energia ou instabilidade na ligação à internet), resultando em ficheiros em falta ou corrompidos.

3. **Incompatibilidade com o sistema operativo** – A versão da aplicação pode não ser compatível com a versão do Windows instalada no computador, ou os requisitos mínimos de hardware (memória RAM, processador, espaço em disco) não são cumpridos.

4. **Permissões insuficientes** – A aplicação pode exigir privilégios de administrador para ser executada corretamente, especialmente na primeira execução após a instalação.

**Soluções propostas:**

1. Verificar e instalar as dependências indicadas na documentação oficial da aplicação (por exemplo, .NET Framework ou Visual C++ Redistributable).
2. Executar a aplicação como administrador: clique direito no ícone → "Executar como administrador".
3. Consultar o Visualizador de Eventos do Windows (`eventvwr.msc`) para identificar mensagens de erro que orientem o diagnóstico.
4. Desinstalar completamente a aplicação, eliminar ficheiros residuais e reinstalar a partir de uma fonte oficial.
5. Confirmar que o sistema operativo e o hardware cumprem os requisitos mínimos exigidos pela aplicação.

---

## 3 – ADAPTAÇÃO A DIFERENTES PÚBLICOS

### a) Público técnico

**Assunto:** Diagnóstico e resolução – falha no arranque de aplicação após instalação

Caro colega,

Foram identificadas três causas prováveis para o problema reportado: ausência de dependências de runtime (Visual C++ Redistributable / .NET Framework), instalação incompleta por corrupção de ficheiros durante o processo de *setup*, ou incompatibilidade de versão com o sistema operativo atual.

Procedimento de diagnóstico recomendado:

1. Consultar o **Event Viewer** (`eventvwr.msc → Registos do Windows → Aplicação`) para identificar o código de erro exato associado ao processo em falha.
2. Confirmar a presença e versão correta das dependências necessárias; instalar ou atualizar se necessário.
3. Tentar executar o executável principal com privilégios elevados (*Run as Administrator*).
4. Em caso de instalação corrompida, proceder à desinstalação completa (incluindo limpeza de entradas residuais no registo e nas pastas `%AppData%` / `%ProgramData%`) e reinstalar a partir do pacote oficial.

Fico disponível para qualquer esclarecimento adicional.

---

### b) Público não técnico

**Assunto:** O seu programa não abre – como resolver

Olá,

Percebemos que o programa que instalou não está a funcionar como esperado. Não se preocupe — este tipo de situação é bastante comum e, na maioria dos casos, tem uma solução simples.

Sugerimos que tente os seguintes passos:

1. **Clique com o botão direito** no ícone do programa e escolha a opção **"Executar como administrador"**.
2. **Reinicie o computador** e tente abrir o programa novamente.
3. Se não resultar, **desinstale o programa** (em *Definições → Aplicações*) e volte a instalá-lo a partir do site oficial.

Caso o problema se mantenha após estes passos, entre em contacto connosco com uma descrição do que acontece e tratamos do assunto com a maior brevidade possível.

Com os melhores cumprimentos.

---

## 4 – APRESENTAÇÃO (GUIÃO ORAL)

> **Duração prevista: 4 minutos**

---

**Introdução** *(~30 segundos)*

"Bom dia / Boa tarde. O meu projeto aborda um problema técnico muito comum no dia a dia do suporte informático: uma aplicação que não inicia após a instalação. Vou apresentar as fontes que consultei, as causas mais prováveis e as soluções encontradas."

---

**Descrição do problema** *(~1 minuto)*

"Imaginem este cenário: um utilizador instala um programa novo no computador. A instalação parece correr bem, mas quando tenta abrir o programa, este simplesmente não arranca — ou abre e fecha imediatamente, sem mostrar qualquer mensagem de erro.

Este problema pode acontecer por várias razões que não são óbvias à primeira vista, e é exatamente isso que torna o diagnóstico desafiante."

---

**Fontes utilizadas** *(~1 minuto)*

"Para estudar este problema consultei três fontes diferentes:

Primeiro, a documentação oficial da **Microsoft**, que considero de fiabilidade alta, onde encontrei informação sobre ferramentas de diagnóstico do Windows e sobre as dependências mais comuns que podem estar em falta.

Segundo, o **Stack Overflow**, um fórum técnico de fiabilidade média. Embora a qualidade das respostas varie, as mais votadas pela comunidade são geralmente fiáveis e trazem soluções práticas testadas por outros técnicos.

Terceiro, o blog **How-To Geek**, de fiabilidade média-alta, que apresenta artigos claros e bem estruturados sobre resolução de problemas de instalação, acessíveis mesmo a utilizadores menos experientes."

---

**Síntese e solução** *(~1 minuto)*

"Com base na pesquisa realizada, identifiquei três causas principais:

A mais comum é a **falta de componentes de software** — programas de suporte que a aplicação precisa para funcionar, mas que não estão instalados no computador.

A segunda causa é uma **instalação incompleta ou corrompida**, que pode acontecer se o processo foi interrompido a meio.

A terceira é uma **incompatibilidade** entre a versão da aplicação e o sistema operativo ou hardware disponível.

As soluções passam por instalar os componentes em falta, executar o programa como administrador, ou reinstalar a aplicação corretamente a partir de uma fonte oficial."

---

**Conclusão** *(~30 segundos)*

"Este projeto permitiu-me perceber a importância de saber pesquisar em fontes diversas, avaliar a sua fiabilidade e comunicar a informação de forma diferente consoante o público — seja um técnico de informática ou um utilizador comum.

Obrigado pela atenção. Estou disponível para responder a questões."

---

*UC00597 – Comunicar em Língua Portuguesa no Setor da Informática*
