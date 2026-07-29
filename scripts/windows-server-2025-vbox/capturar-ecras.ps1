# =====================================================================
# capturar-ecras.ps1 - registo visual automatico de uma VM em execucao.
#
# Tira uma screenshot da consola da VM a intervalos regulares, enquanto
# ela estiver a correr, gravando ficheiros numerados por data/hora. Serve
# para documentar uma instalacao passo a passo sem estar a olhar para o
# ecra (util para relatorios de formacao).
#
# O create-vm.ps1 lanca isto automaticamente. Para correr a mao:
#   .\capturar-ecras.ps1 -VmName SRV_TECHOFFICE -OutDir D:\JARVIS-VMs\ecras
# =====================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$VmName,
    [Parameter(Mandatory)][string]$OutDir,
    [int]$IntervaloSegundos = 30,
    [int]$MaximoHoras = 6
)

$VBoxManage = Get-Command VBoxManage -ErrorAction SilentlyContinue
if ($VBoxManage) { $VBoxManage = $VBoxManage.Source }
else { $VBoxManage = Join-Path $Env:ProgramFiles 'Oracle\VirtualBox\VBoxManage.exe' }
if (-not (Test-Path $VBoxManage)) { throw 'VBoxManage.exe nao encontrado.' }

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$fim = (Get-Date).AddHours($MaximoHoras)
$n = 0
# Espera que a VM arranque (o create-vm.ps1 lanca isto em paralelo).
Start-Sleep -Seconds 5

while ((Get-Date) -lt $fim) {
    $estado = (& $VBoxManage showvminfo $VmName --machinereadable 2>$null |
        Select-String -Pattern '^VMState="(.+)"$' | Select-Object -First 1)
    if (-not $estado) { break }
    if ($estado.Matches[0].Groups[1].Value -ne 'running') { break }

    $n++
    $nome = '{0:D4}_{1}.png' -f $n, (Get-Date -Format 'HHmmss')
    & $VBoxManage controlvm $VmName screenshotpng (Join-Path $OutDir $nome) 2>$null

    Start-Sleep -Seconds $IntervaloSegundos
}

Write-Output "Captura terminada: $n imagens em $OutDir"
