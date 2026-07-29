# =====================================================================
# criar-vm-techoffice.ps1
#
# Partes 1 a 3 do "Guia Prático - Infraestrutura Windows Server para a
# empresa TechOffice Lda.": cria a VM com os valores do guião e instala
# o Windows Server 2025 Desktop Experience automaticamente.
#
#   VM ............ SRV_TECHOFFICE
#   Servidor ...... SRV-DC01
#   Memória ....... 4096 MB
#   Processadores . 2
#   Disco ......... 70 GB dinâmico
#   Rede .......... NAT
#
# As Partes 4 a 8 (Active Directory, OUs, grupos, utilizadores,
# partilhas e SQL Server) fazem-se à mão dentro da VM - ver
# GUIA-TECHOFFICE.md.
#
# Correr num PowerShell como Administrador:
#   powershell -ExecutionPolicy Bypass -File .\criar-vm-techoffice.ps1
# =====================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$Env:VM_NAME     = 'SRV_TECHOFFICE'
$Env:VM_HOSTNAME = 'SRV-DC01'
$Env:VM_RAM_MB   = '4096'
$Env:VM_CPUS     = '2'
$Env:VM_DISK_MB  = '71680'      # 70 GB
$Env:NET_MODE    = 'nat'
$Env:VM_USER     = 'Administrator'
$Env:PROVISION   = '0'          # sem Thinstuff/No-IP: não fazem parte deste guião
$Env:SCREENSHOTS = '1'          # registo visual automático da instalação

Write-Host 'Guia TechOffice - Partes 1 a 3' -ForegroundColor Green
Write-Host 'VM SRV_TECHOFFICE / servidor SRV-DC01 / 4096 MB / 2 CPUs / 70 GB / NAT' -ForegroundColor Green
Write-Host ''

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ScriptDir 'create-vm.ps1')

Write-Host ''
Write-Host 'Quando a instalação terminar, cria o snapshot da Parte 3:' -ForegroundColor Yellow
Write-Host '  VBoxManage snapshot SRV_TECHOFFICE take Base_Windows' -ForegroundColor Yellow
Write-Host 'Depois segue o GUIA-TECHOFFICE.md a partir da Parte 4.' -ForegroundColor Yellow
