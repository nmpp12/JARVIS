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
  param([string]$Url, [string]$Dest)
  for ($i = 1; $i -le 20; $i++) {
    try {
      Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing
      Write-Output "OK: $Url"
      return $true
    } catch {
      Write-Output "Tentativa $i falhou para $Url : $($_.Exception.Message)"
      Start-Sleep -Seconds 30
    }
  }
  Write-Output "FALHOU: $Url"
  return $false
}
New-Item -ItemType Directory -Path 'C:\Setup' -Force | Out-Null
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' -Name fDenyTSConnections -Value 0
Get-NetFirewallRule -Name 'RemoteDesktop*' | Enable-NetFirewallRule
if (Get-Installer 'https://www.thinstuff.com/releases/ThinstuffXPVSServer-latest-x64.msi' 'C:\Setup\ThinstuffXPVSServer-x64.msi') {
  Start-Process msiexec.exe -ArgumentList '/i','C:\Setup\ThinstuffXPVSServer-x64.msi','/qn','/norestart' -Wait
  Write-Output 'Thinstuff XP/VS Server instalado.'
}
if (Get-Installer 'https://www.noip.com/client/ducsetup.exe' 'C:\Setup\ducsetup.exe') {
  Start-Process 'C:\Setup\ducsetup.exe' -ArgumentList '/VERYSILENT','/NORESTART' -Wait
  Write-Output 'No-IP DUC instalado. Abra o DUC e inicie sessao na sua conta No-IP.'
}
Write-Output 'Provisionamento concluido.'
Stop-Transcript
