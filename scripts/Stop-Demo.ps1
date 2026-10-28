$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $projectRoot '.runtime/demo.json'
if (-not (Test-Path -LiteralPath $statePath)) { Write-Host 'No hay una demo registrada.'; exit 0 }
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
if ($state.root -ne $projectRoot) { throw 'La demo registrada pertenece a otro directorio.' }
foreach ($processId in @($state.relayPid, $state.tunnelPid)) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
    if (-not $process) { continue }
    $isRelay = $process.Name -eq 'node.exe' -and $process.CommandLine.Contains((Join-Path $projectRoot 'backend/server.mjs'))
    $isTunnel = $process.ExecutablePath -eq (Join-Path $projectRoot '.tools/cloudflared.exe')
    if (-not ($isRelay -or $isTunnel)) { throw "El PID $processId no corresponde a esta demo. No se detuvo." }
    Stop-Process -Id $processId
}
Remove-Item -LiteralPath $statePath
Write-Host 'Servidor y tunel de esta demo detenidos.'
