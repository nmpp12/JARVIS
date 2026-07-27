# =====================================================================
# provision.ps1 - corre DENTRO da VM (elevado), no primeiro arranque
# do Windows Server 2025, injetado pelo create-vm.* via
# "VBoxManage unattended install --post-install-command".
#
# O que faz:
#   1. Ativa o Remote Desktop + regra de firewall
#   2. Descarrega e instala o Thinstuff XP/VS Terminal Server (MSI, silencioso)
#   3. Descarrega e instala o No-IP DUC (silencioso)
#
# Log: C:\provision.log
#
# NOTA: as linhas de comentário e em branco são removidas antes de o
# script ser codificado em base64, para caber no comando pós-instalação.
# =====================================================================
$ErrorActionPreference = 'Continue'
Start-Transcript -Path 'C:\provision.log' -Append
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
function Get-Installer {
  # Usa curl.exe (incluido no Windows) em vez de Invoke-WebRequest: segue
  # redirecionamentos, retoma downloads interrompidos e nao e rejeitado
  # pelos servidores que bloqueiam o agente do PowerShell.
  # MinBytes protege contra ficheiros truncados, que depois falham a
  # instalar com "not a valid application for this OS platform".
  param([string]$Url, [string]$Dest, [int]$MinBytes)
  for ($i = 1; $i -le 10; $i++) {
    & curl.exe -L -C - --retry 5 --retry-delay 5 --retry-all-errors --fail -o $Dest $Url
    if ((Test-Path $Dest) -and ((Get-Item $Dest).Length -ge $MinBytes)) {
      Unblock-File $Dest
      Write-Output "OK: $Url ($((Get-Item $Dest).Length) bytes)"
      return $true
    }
    $got = if (Test-Path $Dest) { (Get-Item $Dest).Length } else { 0 }
    Write-Output "Tentativa $i incompleta para $Url ($got de pelo menos $MinBytes bytes)"
    Start-Sleep -Seconds 15
  }
  Write-Output "FALHOU: $Url"
  return $false
}
New-Item -ItemType Directory -Path 'C:\Setup' -Force | Out-Null
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' -Name fDenyTSConnections -Value 0
Get-NetFirewallRule -Name 'RemoteDesktop*' | Enable-NetFirewallRule
if (Get-Installer 'https://www.thinstuff.com/releases/ThinstuffXPVSServer-latest-x64.msi' 'C:\Setup\ThinstuffXPVSServer-x64.msi' 5000000) {
  Start-Process msiexec.exe -ArgumentList '/i','C:\Setup\ThinstuffXPVSServer-x64.msi','/qn','/norestart' -Wait
  Write-Output 'Thinstuff XP/VS Server instalado.'
}
if (Get-Installer 'https://www.noip.com/client/ducsetup.exe' 'C:\Setup\ducsetup.exe' 500000) {
  Start-Process 'C:\Setup\ducsetup.exe' -ArgumentList '/VERYSILENT','/NORESTART' -Wait
  Write-Output 'No-IP DUC instalado. Abra o DUC e inicie sessao na sua conta No-IP.'
}
Write-Output 'Provisionamento concluido.'
Stop-Transcript
