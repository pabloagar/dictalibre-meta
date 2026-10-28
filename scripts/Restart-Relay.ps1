$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot '.runtime'
$statePath = Join-Path $runtimeDir 'demo.json'
$demoState = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
if ([IO.Path]::GetFullPath($demoState.root) -ne [IO.Path]::GetFullPath($projectRoot)) { throw 'La demo pertenece a otra carpeta.' }
$serverScript = Join-Path $projectRoot 'backend/server.mjs'
$relayInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($demoState.relayPid)"
if (-not $relayInfo -or $relayInfo.Name -ne 'node.exe' -or -not $relayInfo.CommandLine.Contains($serverScript)) { throw 'El proceso no corresponde al servidor de este proyecto.' }
$nodePath = $relayInfo.ExecutablePath
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'No se encuentra Node.js.' }
$savedOrigin = $env:PUBLIC_ORIGIN; $savedPort = $env:PORT; $savedBind = $env:HOST
try {
    Stop-Process -Id $demoState.relayPid
    Wait-Process -Id $demoState.relayPid -Timeout 10 -ErrorAction SilentlyContinue
    $env:PUBLIC_ORIGIN = $demoState.url; $env:PORT = "$($demoState.port)"; $env:HOST = '127.0.0.1'
    $relay = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverScript + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'relay.stdout.log') -RedirectStandardError (Join-Path $runtimeDir 'relay.stderr.log')
    $demoState.relayPid = $relay.Id
    $demoState | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
    $healthy = $false
    for ($i = 0; $i -lt 20; $i++) {
        try { if ((Invoke-RestMethod "http://127.0.0.1:$($demoState.port)/health").status -eq 'ok') { $healthy = $true; break } } catch {}
        Start-Sleep -Milliseconds 250
    }
    if (-not $healthy) { throw 'El servidor no respondió; revisa .runtime/relay.stderr.log.' }
    Write-Host "Servidor reiniciado: $($demoState.url)"
} finally { $env:PUBLIC_ORIGIN = $savedOrigin; $env:PORT = $savedPort; $env:HOST = $savedBind }
