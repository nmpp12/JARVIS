# Guia TechOffice Lda. — onde fazer cada passo

Acompanhamento do *Guia Prático – Implementação de uma Infraestrutura Windows
Server para a Empresa TechOffice Lda.* Os passos automatizados estão marcados;
os restantes fazem-se à mão dentro da VM, com o caminho indicado.

## Partes 1–3 — VirtualBox, VM e Windows Server ✅ automatizado

```powershell
powershell -ExecutionPolicy Bypass -File .\criar-vm-techoffice.ps1
```

Cria `SRV_TECHOFFICE` (servidor `SRV-DC01`), 4096 MB, 2 CPUs, disco dinâmico de
70 GB, rede NAT, e instala o Windows Server 2025 **Desktop Experience** sem
intervenção — inclui aceitar a licença, particionar o disco, definir a
palavra-passe do Administrator e instalar as **Guest Additions**.

Durante a instalação são gravadas screenshots automáticas em
`D:\JARVIS-VMs\ecras\SRV_TECHOFFICE\` (uma a cada 30 s), para documentares o
processo. Desliga com `$Env:SCREENSHOTS='0'`.

**Passo 10 (manual)** — o snapshot, com a VM desligada:
```powershell
VBoxManage snapshot SRV_TECHOFFICE take Base_Windows --description "Windows Server instalado + Guest Additions"
```

## Parte 4 — Active Directory

| Passo | Onde |
|---|---|
| Instalar a função AD DS | *Server Manager* → **Manage** → *Add Roles and Features* → Role-based → **Active Directory Domain Services** → Install |
| Promover a Domain Controller | Bandeira ⚑ de notificações no Server Manager → **Promote this server to a domain controller** |
| Nova floresta | *Add a new forest* → nome do domínio raiz: **techoffice.local** |
| Palavra-passe DSRM | No passo *Domain Controller Options* (guarda-a: é a senha de recuperação) |
| Concluir | *Install* → o servidor reinicia sozinho |

Depois de reiniciar, o login passa a ser `TECHOFFICE\Administrator`.

## Parte 5 — OUs, grupos e utilizadores

Tudo em *Server Manager* → **Tools** → **Active Directory Users and Computers**.

| Passo | Onde |
|---|---|
| Criar OUs | Botão direito em `techoffice.local` → *New* → **Organizational Unit**: Direção, Comercial, Financeiro, RH, Informática, Servidores |
| Criar grupos | Botão direito na OU → *New* → **Group**: GRP_Direcao, GRP_Comercial, GRP_Financeiro, GRP_RH, GRP_TI |
| Criar 10 utilizadores | Botão direito na OU → *New* → **User** |
| Associar aos grupos | Duplo clique no utilizador → separador **Member Of** → *Add* |

## Parte 6 — Recursos partilhados

| Passo | Onde |
|---|---|
| Criar `D:\Partilhas` e as subpastas | Explorador de Ficheiros: Comercial, Financeiro, RH, Publico |
| Partilhar | Botão direito na pasta → *Propriedades* → **Partilha** → *Partilha Avançada* → marcar **Partilhar esta pasta** → *Permissões* |
| Permissões NTFS | Mesmo diálogo → separador **Segurança** → *Editar* → adicionar os grupos GRP_* |

Regra prática: nas permissões de partilha dá `Full Control` ao grupo e controla
o acesso real pelas permissões **NTFS** — é onde se define quem lê e quem
escreve. A pasta `Publico` leva leitura/escrita para todos os grupos.

> A VM tem um único disco. Para ter uma drive `D:` no servidor, acrescenta-lhe
> um segundo disco virtual (*Definições → Armazenamento → Adicionar disco
> rígido*) e formata-o na *Gestão de Discos*. Em alternativa, usa `C:\Partilhas`
> e ajusta o guião.

## Parte 7 — SQL Server Express

| Passo | Onde |
|---|---|
| Instalar o SQL Server Express | [Download](https://www.microsoft.com/sql-server/sql-server-downloads) → *Custom* → New standalone installation |
| Nome da instância | No passo *Instance Configuration*: **SQLEXPRESSLAB** |
| Modo de autenticação | *Database Engine Configuration* → **Mixed Mode** → definir a palavra-passe do `sa` |
| Instalar o SSMS | [Download do SQL Server Management Studio](https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms) |
| Ativar TCP/IP | *SQL Server Configuration Manager* → **SQL Server Network Configuration** → Protocols for SQLEXPRESSLAB → **TCP/IP** → Enabled |
| Porta 1435 | No TCP/IP → separador **IP Addresses** → em *IPAll*, limpar *TCP Dynamic Ports* e pôr **1435** em *TCP Port* |
| Reiniciar o serviço | *SQL Server Services* → botão direito na instância → **Restart** |
| Regra de firewall | *Firewall com Segurança Avançada* → Regras de Entrada → Nova Regra → Porta → TCP **1435** |
| Testar | No SSMS liga a `SRV-DC01\SQLEXPRESSLAB,1435` |

## Parte 8 — Exercício final

| Passo | Onde |
|---|---|
| Criar as bases RH, Comercial, Inventario | SSMS → botão direito em *Databases* → **New Database** |
| Criar o login `ERPUser` | SSMS → *Security* → *Logins* → **New Login** → SQL Server authentication |
| Permissões só nessas bases | No login → **User Mapping** → marcar as três bases → papel `db_datareader`/`db_datawriter` |
| Confirmar a porta em escuta | Numa linha de comandos: `netstat -an \| findstr 1435` |
| Snapshot final | Com a VM desligada: `VBoxManage snapshot SRV_TECHOFFICE take Empresa_Config_Final` |

## Respostas às questões finais

1. **Função do Active Directory** — serviço de diretório que centraliza a
   autenticação e a autorização: um único registo de utilizadores,
   computadores e recursos do domínio, em vez de contas locais espalhadas por
   cada máquina.
2. **Para que servem as OUs** — organizam objetos em contentores que refletem a
   estrutura da empresa e permitem delegar administração e aplicar *Group
   Policies* a um departamento sem afetar os outros.
3. **Vantagem dos grupos** — atribuem-se permissões ao grupo e não a cada
   pessoa; admitir ou mudar alguém de departamento passa a ser mexer numa
   filiação, sem rever permissões pasta a pasta.
4. **Porquê Mixed Mode** — permite autenticação do Windows *e* logins próprios
   do SQL Server, necessários para aplicações (como o `ERPUser`) que se ligam
   com utilizador e palavra-passe em vez de conta de domínio.
5. **Para que serve o TCP/IP no SQL Server** — sem ele a instância só aceita
   ligações locais; é o que permite que outros computadores da rede se liguem
   à base de dados, e o que torna a porta configurável.
6. **Porquê um snapshot antes de grandes alterações** — guarda o estado exato
   da VM, permitindo reverter em segundos se a alteração falhar, em vez de
   reinstalar tudo.

## Checklist

- [ ] VirtualBox instalado
- [ ] Máquina virtual criada (`SRV_TECHOFFICE`)
- [ ] Windows Server instalado (`SRV-DC01`)
- [ ] Snapshot `Base_Windows`
- [ ] Domínio `techoffice.local` criado
- [ ] OUs criadas
- [ ] Grupos criados
- [ ] Utilizadores criados (10+)
- [ ] Partilhas configuradas
- [ ] SQL Server instalado (instância `SQLEXPRESSLAB`)
- [ ] TCP/IP ativo na porta 1435
- [ ] Firewall configurada
- [ ] Bases de dados criadas
- [ ] Snapshot `Empresa_Config_Final`
