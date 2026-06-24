from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

# --- Estilos gerais ---
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)

def heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    return p

def bold_para(doc, text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = True
    return p

def normal_para(doc, text):
    return doc.add_paragraph(text)

def add_horizontal_rule(doc):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), 'AAAAAA')
    pBdr.append(bottom)
    pPr.append(pBdr)

# ============================================================
# CABEÇALHO
# ============================================================
title = doc.add_heading('PROJETO FINAL INTEGRADOR', 0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run('UC00597 – Comunicar em Língua Portuguesa no Setor da Informática\n').bold = True
p.add_run('Formadora: Rute Leandro Gonçalves')

doc.add_paragraph()

# Campos de preenchimento
for label in ['FORMANDO: _______________________________________________',
              'UC: UC00597          AÇÃO: _______________________________________________']:
    p = doc.add_paragraph(label)
    p.runs[0].bold = True

add_horizontal_rule(doc)

# ============================================================
# TEMA
# ============================================================
heading(doc, 'TEMA DO PROJETO', 1)

p = doc.add_paragraph()
p.add_run('Cenário 3 – Aplicação não inicia após instalação').bold = True

normal_para(doc,
    'Um utilizador tenta abrir uma aplicação recém-instalada, mas esta não inicia ou fecha '
    'imediatamente sem apresentar uma mensagem de erro clara.')

add_horizontal_rule(doc)

# ============================================================
# 1 – PESQUISA DE INFORMAÇÃO
# ============================================================
heading(doc, '1 – Pesquisa de Informação', 1)

table = doc.add_table(rows=1, cols=4)
table.style = 'Table Grid'

headers = ['Fonte', 'Tipo', 'Informação encontrada', 'Fiabilidade']
hdr_cells = table.rows[0].cells
for i, h in enumerate(headers):
    hdr_cells[i].text = h
    hdr_cells[i].paragraphs[0].runs[0].bold = True
    hdr_cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

rows_data = [
    (
        'Microsoft Learn\n(learn.microsoft.com)',
        'Documentação oficial',
        'Explica como diagnosticar falhas no arranque de aplicações através do Visualizador de Eventos do Windows (eventvwr.msc), como verificar e instalar dependências em falta (Visual C++ Redistributable, .NET Framework) e como reparar instalações corrompidas via Painel de Controlo.',
        'Alta – fonte oficial, mantida pela própria Microsoft, com informação técnica validada e atualizada regularmente.'
    ),
    (
        'Stack Overflow\n(stackoverflow.com)',
        'Fórum técnico',
        'Diversas respostas de programadores e técnicos sobre erros comuns ao iniciar aplicações: ficheiros DLL em falta, conflitos entre versões de bibliotecas, permissões insuficientes e incompatibilidade com o sistema operativo.',
        'Média – a qualidade das respostas varia; as mais votadas tendem a ser fiáveis, mas requerem validação cruzada.'
    ),
    (
        'How-To Geek\n(howtogeek.com)',
        'Blog técnico',
        'Artigo sobre resolução de problemas de instalação: verificar compatibilidade com o sistema operativo, reinstalar com privilégios de administrador, limpar ficheiros residuais e confirmar os requisitos mínimos de hardware.',
        'Média-Alta – blog técnico reconhecido internacionalmente, com conteúdo revisto editorialmente, embora não seja fonte oficial.'
    ),
]

for row_data in rows_data:
    row_cells = table.add_row().cells
    for i, text in enumerate(row_data):
        row_cells[i].text = text

# Larguras das colunas
widths = [Inches(1.3), Inches(1.1), Inches(2.8), Inches(1.8)]
for row in table.rows:
    for i, cell in enumerate(row.cells):
        cell.width = widths[i]

doc.add_paragraph()
add_horizontal_rule(doc)

# ============================================================
# 2 – SÍNTESE TÉCNICA
# ============================================================
heading(doc, '2 – Síntese Técnica', 1)

bold_para(doc, 'Descrição do problema:')
normal_para(doc,
    'Após instalar uma aplicação num computador com Windows, o utilizador tenta abrir o programa, '
    'mas este não inicia ou fecha imediatamente sem apresentar uma mensagem de erro clara. '
    'O problema ocorre mesmo depois de o processo de instalação ter aparentemente terminado com sucesso.')

bold_para(doc, 'Causas prováveis:')

causas = [
    ('Dependências em falta – ', 'A aplicação necessita de componentes de software externos (como .NET Framework, Visual C++ Redistributable ou outros runtimes) que não estão instalados ou estão desatualizados no sistema.'),
    ('Instalação incompleta ou corrompida – ', 'O processo de instalação pode ter sido interrompido ou falhado silenciosamente (por falta de espaço em disco, queda de energia ou instabilidade na ligação à internet), resultando em ficheiros em falta ou corrompidos.'),
    ('Incompatibilidade com o sistema operativo – ', 'A versão da aplicação pode não ser compatível com a versão do Windows instalada, ou os requisitos mínimos de hardware não são cumpridos.'),
    ('Permissões insuficientes – ', 'A aplicação pode exigir privilégios de administrador para ser executada corretamente, especialmente na primeira execução após a instalação.'),
]
for i, (label, text) in enumerate(causas, 1):
    p = doc.add_paragraph(style='List Number')
    p.add_run(label).bold = True
    p.add_run(text)

bold_para(doc, 'Soluções propostas:')

solucoes = [
    'Verificar e instalar as dependências indicadas na documentação oficial da aplicação (por exemplo, .NET Framework ou Visual C++ Redistributable).',
    'Executar a aplicação como administrador: clique direito no ícone → "Executar como administrador".',
    'Consultar o Visualizador de Eventos do Windows (eventvwr.msc) para identificar mensagens de erro que orientem o diagnóstico.',
    'Desinstalar completamente a aplicação, eliminar ficheiros residuais e reinstalar a partir de uma fonte oficial.',
    'Confirmar que o sistema operativo e o hardware cumprem os requisitos mínimos exigidos pela aplicação.',
]
for s in solucoes:
    doc.add_paragraph(s, style='List Number')

add_horizontal_rule(doc)

# ============================================================
# 3 – ADAPTAÇÃO A DIFERENTES PÚBLICOS
# ============================================================
heading(doc, '3 – Adaptação a Diferentes Públicos', 1)

heading(doc, 'a) Público técnico', 2)

p = doc.add_paragraph()
p.add_run('Assunto: ').bold = True
p.add_run('Diagnóstico e resolução – falha no arranque de aplicação após instalação')

normal_para(doc, 'Caro colega,')
normal_para(doc,
    'Foram identificadas três causas prováveis para o problema reportado: ausência de dependências de runtime '
    '(Visual C++ Redistributable / .NET Framework), instalação incompleta por corrupção de ficheiros durante '
    'o processo de setup, ou incompatibilidade de versão com o sistema operativo atual.')

bold_para(doc, 'Procedimento de diagnóstico recomendado:')

tecnicos = [
    'Consultar o Event Viewer (eventvwr.msc → Registos do Windows → Aplicação) para identificar o código de erro exato associado ao processo em falha.',
    'Confirmar a presença e versão correta das dependências necessárias; instalar ou atualizar se necessário.',
    'Tentar executar o executável principal com privilégios elevados (Run as Administrator).',
    'Em caso de instalação corrompida, proceder à desinstalação completa (incluindo limpeza de entradas residuais no registo e nas pastas %AppData% / %ProgramData%) e reinstalar a partir do pacote oficial.',
]
for t in tecnicos:
    doc.add_paragraph(t, style='List Number')

normal_para(doc, 'Fico disponível para qualquer esclarecimento adicional.')

doc.add_paragraph()
heading(doc, 'b) Público não técnico', 2)

p = doc.add_paragraph()
p.add_run('Assunto: ').bold = True
p.add_run('O seu programa não abre – como resolver')

normal_para(doc, 'Olá,')
normal_para(doc,
    'Percebemos que o programa que instalou não está a funcionar como esperado. '
    'Não se preocupe — este tipo de situação é bastante comum e, na maioria dos casos, tem uma solução simples.')

bold_para(doc, 'Sugerimos que tente os seguintes passos:')

passos = [
    'Clique com o botão direito no ícone do programa e escolha a opção "Executar como administrador".',
    'Reinicie o computador e tente abrir o programa novamente.',
    'Se não resultar, desinstale o programa (em Definições → Aplicações) e volte a instalá-lo a partir do site oficial.',
]
for pp in passos:
    doc.add_paragraph(pp, style='List Number')

normal_para(doc,
    'Caso o problema se mantenha após estes passos, entre em contacto connosco com uma descrição '
    'do que acontece e tratamos do assunto com a maior brevidade possível.')
normal_para(doc, 'Com os melhores cumprimentos.')

add_horizontal_rule(doc)

# ============================================================
# 4 – APRESENTAÇÃO (GUIÃO ORAL)
# ============================================================
heading(doc, '4 – Apresentação (Guião Oral)', 1)

p = doc.add_paragraph()
p.add_run('Duração prevista: 4 minutos').italic = True

secoes = [
    ('Introdução (~30 segundos)',
     '"Bom dia / Boa tarde. O meu projeto aborda um problema técnico muito comum no dia a dia do suporte '
     'informático: uma aplicação que não inicia após a instalação. Vou apresentar as fontes que consultei, '
     'as causas mais prováveis e as soluções encontradas."'),
    ('Descrição do problema (~1 minuto)',
     '"Imaginem este cenário: um utilizador instala um programa novo no computador. A instalação parece '
     'correr bem, mas quando tenta abrir o programa, este simplesmente não arranca — ou abre e fecha '
     'imediatamente, sem mostrar qualquer mensagem de erro. Este problema pode acontecer por várias razões '
     'que não são óbvias à primeira vista, e é exatamente isso que torna o diagnóstico desafiante."'),
    ('Fontes utilizadas (~1 minuto)',
     '"Para estudar este problema consultei três fontes diferentes:\n'
     '— A documentação oficial da Microsoft, que considero de fiabilidade alta, onde encontrei informação '
     'sobre ferramentas de diagnóstico e sobre as dependências mais comuns que podem estar em falta.\n'
     '— O Stack Overflow, um fórum técnico de fiabilidade média, mas muito útil para ver soluções práticas '
     'testadas por outros técnicos.\n'
     '— O blog How-To Geek, de fiabilidade média-alta, com artigos claros sobre resolução de problemas '
     'de instalação."'),
    ('Síntese e solução (~1 minuto)',
     '"Com base na pesquisa realizada, identifiquei três causas principais: a falta de componentes de '
     'software necessários para o programa funcionar, uma instalação incompleta ou corrompida, ou uma '
     'incompatibilidade entre a aplicação e o sistema operativo. As soluções passam por instalar os '
     'componentes em falta, executar o programa como administrador, ou reinstalar a aplicação corretamente '
     'a partir de uma fonte oficial."'),
    ('Conclusão (~30 segundos)',
     '"Este projeto permitiu-me perceber a importância de saber pesquisar em fontes diversas, avaliar a '
     'sua fiabilidade e comunicar a informação de forma diferente consoante o público — seja um técnico '
     'de informática ou um utilizador comum. Obrigado pela atenção. Estou disponível para responder a questões."'),
]

for titulo, texto in secoes:
    p = doc.add_paragraph()
    p.add_run(titulo).bold = True
    doc.add_paragraph(texto)
    doc.add_paragraph()

# ============================================================
# RODAPÉ
# ============================================================
add_horizontal_rule(doc)
p = doc.add_paragraph('UC00597 – Comunicar em Língua Portuguesa no Setor da Informática')
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.runs[0].italic = True
p.runs[0].font.size = Pt(9)

doc.save('/home/user/JARVIS/projeto_final_UC00597.docx')
print("Ficheiro gerado com sucesso!")
