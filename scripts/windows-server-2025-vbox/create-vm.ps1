# =====================================================================
# create-vm.ps1 — cria uma VM VirtualBox com Windows Server 2025 (eval),
# instalação 100% automática, e provisiona Thinstuff XP/VS + No-IP DUC.
#
# Correr num host WINDOWS com VirtualBox 7.0+ instalado:
#   powershell -ExecutionPolicy Bypass -File .\create-vm.ps1
#
# Tudo é configurável pelas variáveis abaixo (ou por variáveis de
# ambiente com o mesmo nome).
# =====================================================================

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ---------------------- Configuração ---------------------------------
$VmName     = if ($Env:VM_NAME)     { $Env:VM_NAME }     else { 'JARVIS-WS2025' }
$Cpus       = if ($Env:VM_CPUS)     { [int]$Env:VM_CPUS } else { 4 }
$RamMB      = if ($Env:VM_RAM_MB)   { [int]$Env:VM_RAM_MB } else { 8192 }
$DiskMB     = if ($Env:VM_DISK_MB)  { [int]$Env:VM_DISK_MB } else { 102400 }   # 100 GB (dinâmico)
$AdminUser  = if ($Env:VM_USER)     { $Env:VM_USER }     else { 'jarvis' }
$AdminPass  = if ($Env:VM_PASS)     { $Env:VM_PASS }     else { 'Jarvis-2025!' }  # MUDA ISTO depois do 1.º login
$ImageIndex = if ($Env:IMAGE_INDEX) { [int]$Env:IMAGE_INDEX } else { 2 }       # 2 = Standard (Desktop Experience)
$NetMode    = if ($Env:NET_MODE)    { $Env:NET_MODE }    else { 'bridged' }    # 'bridged' ou 'nat'

# ISO de avaliação do Windows Server 2025 (Microsoft Evaluation Center).
# Se o link mudar, descarrega manualmente e aponta ISO_PATH para o ficheiro.
$IsoUrl  = if ($Env:ISO_URL)  { $Env:ISO_URL }  else { 'https://go.microsoft.com/fwlink/?linkid=2293312&clcid=0x409' }
$IsoPath = if ($Env:ISO_PATH) { $Env:ISO_PATH } else { Join-Path $ScriptDir 'downloads\WindowsServer2025-eval.iso' }

# ---------------------- VBoxManage ------------------------------------
$VBoxManage = Get-Command VBoxManage -ErrorAction SilentlyContinue
if ($VBoxManage) { $VBoxManage = $VBoxManage.Source }
else {
    $candidate = Join-Path $Env:ProgramFiles 'Oracle\VirtualBox\VBoxManage.exe'
    if (Test-Path $candidate) { $VBoxManage = $candidate }
    else { throw 'VBoxManage.exe não encontrado. Instala o VirtualBox: https://www.virtualbox.org/wiki/Downloads' }
}
function VBox { & $VBoxManage @args; if ($LASTEXITCODE -ne 0) { throw "VBoxManage $($args -join ' ') falhou ($LASTEXITCODE)" } }

if ((& $VBoxManage list vms) -match "^`"$([regex]::Escape($VmName))`"") {
    throw "Já existe uma VM chamada '$VmName'. Apaga-a ou muda VM_NAME."
}

# ---------------------- ISO -------------------------------------------
if (-not (Test-Path $IsoPath)) {
    New-Item -ItemType Directory -Path (Split-Path $IsoPath) -Force | Out-Null
    Write-Host "A descarregar o ISO do Windows Server 2025 (~5 GB)..." -ForegroundColor Cyan
    & curl.exe -L --fail --retry 4 --retry-delay 5 -C - -o $IsoPath $IsoUrl
    if ($LASTEXITCODE -ne 0) {
        throw "Download do ISO falhou. Descarrega manualmente em https://www.microsoft.com/evalcenter/evaluate-windows-server-2025 e define ISO_PATH."
    }
}

# ---------------------- Criar a VM ------------------------------------
$OsType = 'Windows2025_64'
if (-not ((& $VBoxManage list ostypes) -match 'Windows2025_64')) { $OsType = 'Windows2022_64' }

Write-Host "A criar a VM '$VmName' ($OsType, $Cpus CPUs, $RamMB MB RAM, $($DiskMB/1024) GB disco)..." -ForegroundColor Cyan
VBox createvm --name $VmName --ostype $OsType --register
VBox modifyvm $VmName --memory $RamMB --cpus $Cpus --vram 128 `
    --graphicscontroller vboxsvga --clipboard-mode bidirectional --mouse usbtablet

if ($NetMode -eq 'bridged') {
    $bridgeIf = (& $VBoxManage list bridgedifs | Select-String '^Name:\s+(.+)$' | Select-Object -First 1).Matches[0].Groups[1].Value.Trim()
    if (-not $bridgeIf) { throw 'Nenhum adaptador bridged encontrado; usa NET_MODE=nat.' }
    Write-Host "Rede: bridged via '$bridgeIf' (a VM fica com IP na tua rede local)." -ForegroundColor Cyan
    VBox modifyvm $VmName --nic1 bridged --bridgeadapter1 $bridgeIf
} else {
    Write-Host 'Rede: NAT com port-forward — RDP disponível em 127.0.0.1:53389.' -ForegroundColor Cyan
    VBox modifyvm $VmName --nic1 nat --natpf1 'rdp,tcp,,53389,,3389'
}

$cfgMatch = & $VBoxManage showvminfo $VmName --machinereadable |
    Select-String -Pattern '^CfgFile="(.+)"$' | Select-Object -First 1
$VdiPath = Join-Path (Split-Path $cfgMatch.Matches[0].Groups[1].Value) "$VmName.vdi"
VBox createmedium disk --filename $VdiPath --size $DiskMB
VBox storagectl $VmName --name SATA --add sata --controller IntelAhci --portcount 2
VBox storageattach $VmName --storagectl SATA --port 0 --device 0 --type hdd --medium $VdiPath

# ---------------------- Comando pós-instalação ------------------------
# provision.ps1 é comprimido (sem comentários/linhas vazias) e codificado
# em base64 UTF-16LE para correr elevado no primeiro logon.
$provision = Get-Content (Join-Path $ScriptDir 'provision.ps1') |
    Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes(($provision -join "`r`n")))
$postCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded"

# ---------------------- Instalação automática -------------------------
Write-Host 'A configurar a instalação automática (unattended)...' -ForegroundColor Cyan
VBox unattended install $VmName `
    --iso=$IsoPath `
    --user=$AdminUser `
    --password=$AdminPass `
    --full-user-name=$AdminUser `
    --image-index=$ImageIndex `
    --hostname=jarvis-ws2025.local `
    --locale=pt_PT --country=PT `
    --install-additions `
    --post-install-command=$postCmd

VBox startvm $VmName --type gui

Write-Host ''
Write-Host '=================================================================' -ForegroundColor Green
Write-Host "VM '$VmName' criada e a instalar o Windows Server 2025."
Write-Host 'A instalação é automática (30-60 min). Não toques na VM até ao'
Write-Host 'primeiro logon automático, em que serão instalados:'
Write-Host '  - VirtualBox Guest Additions'
Write-Host '  - Thinstuff XP/VS Terminal Server'
Write-Host '  - No-IP DUC'
Write-Host "Credenciais: $AdminUser / $AdminPass  (muda a password!)"
Write-Host 'Log do provisionamento dentro da VM: C:\provision.log'
Write-Host 'Depois: abre o No-IP DUC e inicia sessão na tua conta No-IP.'
Write-Host '=================================================================' -ForegroundColor Green
