$ErrorActionPreference = 'Stop'
$labRoot = Split-Path -Parent $PSScriptRoot
$labUrl = 'http://127.0.0.1:8789'
try {
    $labState = Invoke-RestMethod "$labUrl/api/state" -TimeoutSec 2
    if ($null -ne $labState.sourceHash) { Write-Output "Laboratorio disponible: $labUrl"; exit 0 }
} catch {}
$labNode = (Get-Command node -ErrorAction Stop).Source
$labRuntime = Join-Path $labRoot '.runtime'
New-Item -ItemType Directory -Path $labRuntime -Force | Out-Null
$labProcess = Start-Process -FilePath $labNode -ArgumentList 'backend/lab.mjs' -WorkingDirectory $labRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $labRuntime 'lab.stdout.log') -RedirectStandardError (Join-Path $labRuntime 'lab.stderr.log')
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    if ($labProcess.HasExited) { throw 'El laboratorio no pudo iniciar. Revisa .runtime/lab.stderr.log.' }
    try {
        $labState = Invoke-RestMethod "$labUrl/api/state" -TimeoutSec 2
        if ($null -ne $labState.sourceHash) {
            @{ pid = $labProcess.Id; url = $labUrl; startedAt = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content (Join-Path $labRuntime 'lab.json')
            Write-Output "Laboratorio iniciado: $labUrl"
            exit 0
        }
    } catch {}
}
throw 'El laboratorio no respondió a tiempo.'
