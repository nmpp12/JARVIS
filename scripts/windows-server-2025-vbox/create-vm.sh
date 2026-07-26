#!/usr/bin/env bash
# =====================================================================
# create-vm.sh — cria uma VM VirtualBox com Windows Server 2025 (eval),
# instalação 100% automática, e provisiona Thinstuff XP/VS + No-IP DUC.
#
# Correr num host LINUX ou macOS com VirtualBox 7.0+ instalado:
#   ./create-vm.sh
#
# Tudo é configurável por variáveis de ambiente (ver abaixo).
# =====================================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------- Configuração ---------------------------------
VM_NAME="${VM_NAME:-JARVIS-WS2025}"
VM_CPUS="${VM_CPUS:-4}"
VM_RAM_MB="${VM_RAM_MB:-8192}"
VM_DISK_MB="${VM_DISK_MB:-102400}"          # 100 GB (dinâmico)
VM_USER="${VM_USER:-jarvis}"
VM_PASS="${VM_PASS:-Jarvis-2025!}"          # MUDA ISTO depois do 1.º login
IMAGE_INDEX="${IMAGE_INDEX:-}"              # vazio = auto-detetar a edição Desktop Experience (com GUI)
NET_MODE="${NET_MODE:-bridged}"             # 'bridged' ou 'nat'
VM_BASE_DIR="${VM_BASE_DIR:-}"              # opcional: pasta onde ficam a VM e o ISO (ex.: /mnt/dados/VMs)

# ISO de avaliação do Windows Server 2025 (Microsoft Evaluation Center).
# Se o link mudar, descarrega manualmente e define ISO_PATH.
ISO_URL="${ISO_URL:-https://go.microsoft.com/fwlink/?linkid=2293312&clcid=0x409}"
if [ -n "$VM_BASE_DIR" ]; then
  mkdir -p "$VM_BASE_DIR"
  ISO_PATH="${ISO_PATH:-$VM_BASE_DIR/downloads/WindowsServer2025-eval.iso}"
  echo ">> A VM e o ISO ficam em: $VM_BASE_DIR"
else
  ISO_PATH="${ISO_PATH:-$SCRIPT_DIR/downloads/WindowsServer2025-eval.iso}"
fi

command -v VBoxManage >/dev/null 2>&1 || {
  echo "ERRO: VBoxManage não encontrado. Instala o VirtualBox: https://www.virtualbox.org/wiki/Downloads" >&2
  exit 1
}

if VBoxManage list vms | grep -q "^\"$VM_NAME\""; then
  echo "ERRO: já existe uma VM chamada '$VM_NAME'. Apaga-a ou muda VM_NAME." >&2
  exit 1
fi

# ---------------------- ISO -------------------------------------------
if [ ! -f "$ISO_PATH" ]; then
  mkdir -p "$(dirname "$ISO_PATH")"
  echo ">> A descarregar o ISO do Windows Server 2025 (~5 GB)..."
  curl -L --fail --retry 4 --retry-delay 5 -C - -o "$ISO_PATH" "$ISO_URL" || {
    echo "ERRO: download do ISO falhou. Descarrega manualmente em" >&2
    echo "https://www.microsoft.com/evalcenter/evaluate-windows-server-2025 e define ISO_PATH." >&2
    exit 1
  }
fi

# ---------------------- Edição (Desktop Experience) -------------------
# Garante a edição com interface gráfica completa ("Desktop Experience"),
# em vez da edição Core (só linha de comandos).
if [ -z "$IMAGE_INDEX" ]; then
  DETECT="$(VBoxManage unattended detect --iso="$ISO_PATH" 2>/dev/null || true)"
  pick_image() {
    printf '%s\n' "$DETECT" | grep -iE "Image #[0-9]+ *=.*$1" | head -1 \
      | sed 's/.*Image #\([0-9][0-9]*\).*/\1/'
  }
  IMAGE_INDEX="$(pick_image 'standard.*desktop experience' || true)"
  [ -n "$IMAGE_INDEX" ] || IMAGE_INDEX="$(pick_image 'desktop experience' || true)"
  if [ -n "$IMAGE_INDEX" ]; then
    IMAGE_NAME="$(printf '%s\n' "$DETECT" | grep -E "Image #$IMAGE_INDEX *=" | sed 's/.*= *//')"
    echo ">> Edição selecionada: imagem #$IMAGE_INDEX — $IMAGE_NAME"
  else
    IMAGE_INDEX=2
    echo ">> AVISO: não consegui detetar a edição Desktop Experience no ISO;"
    echo ">> a usar o índice 2 (normalmente Standard Desktop Experience)."
  fi
fi

# ---------------------- Criar a VM ------------------------------------
OS_TYPE=Windows2025_64
VBoxManage list ostypes | grep -q Windows2025_64 || OS_TYPE=Windows2022_64

echo ">> A criar a VM '$VM_NAME' ($OS_TYPE, $VM_CPUS CPUs, $VM_RAM_MB MB RAM, $((VM_DISK_MB / 1024)) GB disco)..."
if [ -n "$VM_BASE_DIR" ]; then
  VBoxManage createvm --name "$VM_NAME" --ostype "$OS_TYPE" --basefolder "$VM_BASE_DIR" --register
else
  VBoxManage createvm --name "$VM_NAME" --ostype "$OS_TYPE" --register
fi
VBoxManage modifyvm "$VM_NAME" --memory "$VM_RAM_MB" --cpus "$VM_CPUS" --vram 128 \
  --graphicscontroller vboxsvga --clipboard-mode bidirectional --mouse usbtablet

if [ "$NET_MODE" = "bridged" ]; then
  BRIDGE_IF="$(VBoxManage list bridgedifs | awk -F': +' '/^Name:/{print $2; exit}')"
  [ -n "$BRIDGE_IF" ] || { echo "ERRO: nenhum adaptador bridged; usa NET_MODE=nat." >&2; exit 1; }
  echo ">> Rede: bridged via '$BRIDGE_IF' (a VM fica com IP na tua rede local)."
  VBoxManage modifyvm "$VM_NAME" --nic1 bridged --bridgeadapter1 "$BRIDGE_IF"
else
  echo ">> Rede: NAT com port-forward — RDP disponível em 127.0.0.1:53389."
  VBoxManage modifyvm "$VM_NAME" --nic1 nat --natpf1 "rdp,tcp,,53389,,3389"
fi

VM_DIR="$(dirname "$(VBoxManage showvminfo "$VM_NAME" --machinereadable | sed -n 's/^CfgFile="\(.*\)"$/\1/p')")"
VDI_PATH="$VM_DIR/$VM_NAME.vdi"
VBoxManage createmedium disk --filename "$VDI_PATH" --size "$VM_DISK_MB"
VBoxManage storagectl "$VM_NAME" --name SATA --add sata --controller IntelAhci --portcount 2
VBoxManage storageattach "$VM_NAME" --storagectl SATA --port 0 --device 0 --type hdd --medium "$VDI_PATH"

# ---------------------- Comando pós-instalação ------------------------
# provision.ps1 é comprimido (sem comentários/linhas vazias) e codificado
# em base64 UTF-16LE para correr elevado no primeiro logon do Windows.
ENCODED="$(sed '1s/^\xEF\xBB\xBF//' "$SCRIPT_DIR/provision.ps1" \
  | grep -vE '^[[:space:]]*(#|$)' \
  | sed 's/$/\r/' | iconv -f UTF-8 -t UTF-16LE | base64 | tr -d '\n')"
POST_CMD="powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand $ENCODED"

# ---------------------- Instalação automática -------------------------
echo ">> A configurar a instalação automática (unattended)..."
VBoxManage unattended install "$VM_NAME" \
  --iso="$ISO_PATH" \
  --user="$VM_USER" \
  --password="$VM_PASS" \
  --full-user-name="$VM_USER" \
  --image-index="$IMAGE_INDEX" \
  --hostname=jarvis-ws2025.local \
  --locale=pt_PT --country=PT \
  --install-additions \
  --post-install-command="$POST_CMD"

VBoxManage startvm "$VM_NAME" --type gui

cat <<EOF

=================================================================
VM '$VM_NAME' criada e a instalar o Windows Server 2025.
A instalação é automática (30-60 min). Não toques na VM até ao
primeiro logon automático, em que serão instalados:
  - VirtualBox Guest Additions
  - Thinstuff XP/VS Terminal Server
  - No-IP DUC
Credenciais: $VM_USER / $VM_PASS  (muda a password!)
Log do provisionamento dentro da VM: C:\\provision.log
Depois: abre o No-IP DUC e inicia sessão na tua conta No-IP.
=================================================================
EOF
