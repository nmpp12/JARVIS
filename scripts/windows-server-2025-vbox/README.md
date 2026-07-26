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
- ~15 GB livres em disco (ISO ~5 GB + disco dinâmico da VM)
- Ligação à internet (o download dos instaladores acontece dentro da VM)

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

## Configuração (variáveis de ambiente)

| Variável | Predefinição | Notas |
|---|---|---|
| `VM_NAME` | `JARVIS-WS2025` | Nome da VM |
| `VM_CPUS` / `VM_RAM_MB` / `VM_DISK_MB` | `4` / `8192` / `102400` | Recursos |
| `VM_USER` / `VM_PASS` | `jarvis` / `Jarvis-2025!` | **Muda a password após o 1.º login** |
| `IMAGE_INDEX` | *auto* | Por omissão o script deteta e escolhe automaticamente a edição **Standard (Desktop Experience)** — a versão com ambiente de trabalho gráfico. Define manualmente só se quiseres outra edição (lista com `VBoxManage unattended detect --iso=<iso>`) |
| `NET_MODE` | `bridged` | `bridged` = a VM apanha IP na tua rede local (necessário para expor RDP via No-IP). `nat` = RDP só via `127.0.0.1:53389` |
| `VM_BASE_DIR` | Windows: `D:\JARVIS-VMs` · Linux/macOS: predefinição do VirtualBox | Pasta onde ficam guardados os ficheiros da VM (disco virtual) **e** o ISO. No Windows tudo vai para a drive `D:\` por omissão; se não tiveres drive D:, define outra (ex.: `$Env:VM_BASE_DIR='C:\VMs'`) |
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
