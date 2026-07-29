# VM Windows Server 2025 no VirtualBox (automática)

Cria uma VM VirtualBox com **Windows Server 2025 Evaluation**, com instalação
100% automática (unattended), e faz com que **o próprio servidor instale**,
no primeiro arranque:

- **Thinstuff XP/VS Terminal Server** — sessões RDP múltiplas em simultâneo
- **No-IP DUC** (Dynamic Update Client) — DNS dinâmico
- VirtualBox Guest Additions
- Remote Desktop ativado + regra de firewall

## Requisitos

- [VirtualBox 7.0+](https://www.virtualbox.org/wiki/Downloads) instalado no host
- **Um SSD** para os ficheiros da VM (ver `VM_BASE_DIR`). Num disco mecânico ou
  externo USB a instalação provoca timeouts de disco (`AHCI Port 0 reset`) e
  pode nunca terminar.
- **Virtualização por hardware disponível para o VirtualBox** — ou seja, sem
  Hyper-V / VBS ativos no host (ver secção abaixo).
- ~30 GB livres no SSD (a VM cresce até ~25 GB) + ~5 GB para o ISO
- Ligação à internet (o download dos instaladores acontece dentro da VM)

O script verifica estas duas condições no arranque e avisa antes de começar.

### Hyper-V / VBS têm de estar desativados

Se o Windows tiver Hyper-V, WSL2, Sandbox ou *Integridade da Memória* ativos,
eles reservam o VT-x e o VirtualBox cai para o backend NEM — a VM fica dezenas
de vezes mais lenta (o log mostra `HMR3Init: Attempting fall back to NEM`).
Num PowerShell como Administrador:

```powershell
Disable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -NoRestart
Disable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -NoRestart
Disable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
bcdedit /set hypervisorlaunchtype off
```

Depois desativa a *Integridade da Memória* em Segurança do Windows → Segurança
do dispositivo → Isolamento do núcleo, e reinicia o PC.

⚠️ Isto desativa o **WSL2**, o **Docker Desktop** (backend WSL) e a **Sandbox
do Windows**, e reduz uma proteção de segurança do host. É o compromisso
necessário para correr VirtualBox à velocidade normal na mesma máquina.

## Como usar

**Host Windows** (PowerShell):

```powershell
cd scripts\windows-server-2025-vbox
powershell -ExecutionPolicy Bypass -File .\create-vm.ps1
```

**Host Linux/macOS**:

```bash
cd scripts/windows-server-2025-vbox
chmod +x create-vm.sh
./create-vm.sh
```

O script descarrega o ISO de avaliação da Microsoft (se ainda não existir em
`downloads/`), cria a VM, lança a instalação automática e arranca a VM.
**Não toques na VM durante 30–60 min** — ela instala o Windows, faz logon
automático e corre o `provision.ps1` (elevado) que instala o Thinstuff e o DUC.
O log fica em `C:\provision.log` dentro da VM.

## Guião TechOffice (AD + SQL Server)

Para o exercício da infraestrutura da *TechOffice Lda.* — VM `SRV_TECHOFFICE`,
servidor `SRV-DC01`, Active Directory `techoffice.local` e SQL Server Express —
usa o wrapper com os valores do guião:

```powershell
powershell -ExecutionPolicy Bypass -File .\criar-vm-techoffice.ps1
```

O acompanhamento passo a passo (incluindo onde clicar em cada parte, do
Active Directory ao SQL Server) está em [GUIA-TECHOFFICE.md](GUIA-TECHOFFICE.md).

## Registo visual da instalação

Durante a instalação o `capturar-ecras.ps1` grava automaticamente uma
screenshot da consola da VM a cada 30 segundos, em
`<VM_BASE_DIR>\ecras\<VM_NAME>\`, para documentar o processo. É lançado pelo
`create-vm.ps1`; desliga-se com `$Env:SCREENSHOTS='0'`.

Para capturar um ecrã pontualmente, a qualquer momento:

```powershell
VBoxManage controlvm <VM> screenshotpng D:\ecra.png
```

## Configuração (variáveis de ambiente)

| Variável | Predefinição | Notas |
|---|---|---|
| `VM_NAME` | `WSFormacao-2025` | Nome da VM no VirtualBox |
| `VM_HOSTNAME` | igual a `VM_NAME` | Nome do servidor na rede (máx. 15 caracteres) |
| `PROVISION` | `1` | `0` salta a instalação do Thinstuff e do No-IP DUC |
| `SCREENSHOTS` | `1` | `0` desliga o registo visual automático |
| `VM_CPUS` / `VM_RAM_MB` / `VM_DISK_MB` | `4` / `8192` / `102400` | Recursos |
| `VM_USER` / `VM_PASS` | `Nuno` / `Jarvis-2025!` | Conta de administrador criada na instalação. **Muda a password após o 1.º login** |
| `IMAGE_INDEX` | *auto* | Por omissão o script deteta e escolhe automaticamente a edição **Standard (Desktop Experience)** — a versão com ambiente de trabalho gráfico. Define manualmente só se quiseres outra edição (lista com `VBoxManage unattended detect --iso=<iso>`) |
| `NET_MODE` | `nat` | `nat` = usa a ligação do host; RDP via `mstsc /v:127.0.0.1:53389`. Recomendado, sobretudo em **Wi-Fi**, onde o modo bridged é lento e instável. `bridged` = a VM apanha IP próprio na rede local (necessário para expor o RDP através do router/No-IP) |
| `VM_BASE_DIR` | Windows: `D:\JARVIS-VMs` · Linux/macOS: predefinição do VirtualBox | Pasta onde ficam guardados os ficheiros da VM (disco virtual) **e** o ISO. **Tem de ser num SSD.** Se a tua `D:` for um disco mecânico/externo, aponta para o SSD (ex.: `$Env:VM_BASE_DIR='C:\JARVIS-VMs'`) e usa `ISO_PATH` para manter o ISO noutra drive |
| `ISO_URL` / `ISO_PATH` | Evaluation Center | Se o link falhar, descarrega de [microsoft.com/evalcenter](https://www.microsoft.com/evalcenter/evaluate-windows-server-2025) e define `ISO_PATH` |

Exemplo: `VM_RAM_MB=16384 NET_MODE=nat ./create-vm.sh`

## Depois da instalação

1. **No-IP DUC**: abre o DUC na VM e inicia sessão na tua conta
   [No-IP](https://www.noip.com/) para associar o hostname dinâmico.
2. **Thinstuff XP/VS**: instala em modo demo/trial. Para uso permanente,
   introduz a licença em *XP/VS Server Administrator* →
   [thinstuff.com](https://www.thinstuff.com/products/xpvs-server/).
3. **Acesso remoto pela internet**: com `NET_MODE=bridged`, faz port-forward
   no teu router (ex.: TCP 3389 → IP da VM) e liga-te via o hostname No-IP.
   ⚠️ Expor RDP diretamente à internet é arriscado — considera mudar a porta,
   limitar por IP, ou usar VPN/Tailscale.
4. **Licença Windows**: a edição Evaluation é válida por 180 dias
   (renovável com `slmgr /rearm`).

### Configuração manual do acesso remoto

Estes passos fazem-se pela interface do Windows, dentro da VM:

| Passo | Onde |
|---|---|
| Autorizar utilizadores no RDP | Botão direito em *Este PC* → **Propriedades** → *Ambiente de trabalho remoto* → **Selecionar utilizadores** → *Adicionar* |
| Uma sessão por utilizador | *XP/VS Server Administrator* → **Restrict Terminal Service users to a single remote session** |
| Abrir a porta 3389 | *Windows Defender Firewall com Segurança Avançada* → **Regras de Entrada** → *Nova Regra* → Porta → TCP 3389 → Permitir → desmarcar **Público**. Repetir para UDP |
| Fixar o IP | *Definições* → *Rede e Internet* → **Editar** atribuição de IP → Manual → IPv4 (IP, máscara 255.255.255.0, gateway, DNS 8.8.8.8 / 8.8.4.4) |
| Encaminhar a porta no router | *Segurança → Acesso → Encaminhamento de portas*: regra RDP, TCP 3389, para o IP fixo do servidor |

Confirmar o IP e o gateway atuais: `ipconfig` numa linha de comandos.

### O que fica obrigatoriamente manual

Estes passos precisam de credenciais ou de decisões que dependem da tua rede:

- **Edição/licença do Thinstuff**: abre o *XP/VS Server Administrator* e
  escolhe a edição (o trial de 14 dias permite até 10 sessões simultâneas em
  modo demo). A janela a lembrar o período de experiência aparece em cada
  arranque enquanto não houver licença.
- **Conta No-IP**: regista-te, cria o *DDNS hostname* e inicia sessão no DUC.
  Vale a pena ativar no DUC a opção *require password to modify host*.
- **Encaminhamento de porta no router**: TCP (e opcionalmente UDP) 3389 para o
  IP fixo do servidor. Cada router configura isto de forma diferente — procura
  em *Segurança → Acesso → Encaminhamento de portas*.
  ⚠️ Expor o RDP à internet é um risco real: existem varreduras automáticas à
  procura da porta 3389 para tentar entrar. Preferível usar uma **VPN** para
  chegar à rede local, ou pelo menos remover a regra do router quando já não
  for precisa.

## Resolução de problemas

- **Download do Thinstuff/DUC falhou dentro da VM**: vê `C:\provision.log`.
  Links diretos: [ThinstuffXPVSServer-latest-x64.msi](https://www.thinstuff.com/releases/ThinstuffXPVSServer-latest-x64.msi)
  e [ducsetup.exe](https://www.noip.com/client/ducsetup.exe).
- **`Windows2025_64` não existe**: o script usa `Windows2022_64`
  automaticamente (VirtualBox < 7.1); funciona na mesma.
- **A instalação pede input**: confirma o `IMAGE_INDEX` com
  `VBoxManage unattended detect --iso=downloads/WindowsServer2025-eval.iso`.
- **"There is an error selecting this partition for install"**: a VM foi
  criada com BIOS clássico — o Windows Server 2025 exige UEFI. Os scripts
  já configuram `--firmware efi64` + TPM 2.0; apaga a VM antiga
  (VirtualBox → botão direito → *Remove* → *Delete all files*) e volta a
  correr o script.
- **Aparece "Press any key to boot from CD or DVD..."** no arranque em
  EFI: carrega numa tecla rapidamente para arrancar do ISO.
