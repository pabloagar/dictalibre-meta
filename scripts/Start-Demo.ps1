param([int]$Port = 8788, [string]$TunnelName, [string]$PublicHostname)
if ([bool]$TunnelName -ne [bool]$PublicHostname) { throw 'Para un enlace fijo indica -TunnelName y -PublicHostname juntos. Revisa RUNNING.md.' }
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot '.runtime'
$toolsDir = Join-Path $projectRoot '.tools'
New-Item -ItemType Directory -Path $runtimeDir,$toolsDir -Force | Out-Null
$statePath = Join-Path $runtimeDir 'demo.json'
if (Test-Path -LiteralPath $statePath) {
    throw 'Ya existe una sesión de demo. Ejecuta scripts/Stop-Demo.ps1 antes de iniciar otra.'
}
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) { $nodePath = $nodeCmd.Source } else {
    $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Instala Node.js 22 o superior y ejecuta pnpm install --frozen-lockfile.' }
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules/ws'))) { throw 'Faltan dependencias. Ejecuta pnpm install --frozen-lockfile.' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw "El puerto $Port ya esta ocupado." }
$binary = Join-Path $toolsDir 'cloudflared.exe'
$expectedHash = 'db4e4c413612a0916f3e1679d3caaf376f94911952d163028fb726fb2e0516a9'
if (-not (Test-Path -LiteralPath $binary)) {
    Write-Host 'Descargando cloudflared 2026.10.5 desde el repositorio oficial...'
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/download/2026.10.5/cloudflared-windows-amd64.exe' -OutFile $binary
}
if ((Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'La verificacion SHA-256 de cloudflared fallo. No se ejecutara el archivo.' }
$tunnelLog = Join-Path $runtimeDir 'tunnel.stderr.log'
$tunnel = $null; $relayProcess = $null
try {
    $tunnelArgs = if ($TunnelName) { @('tunnel','--no-autoupdate','--protocol','http2','run','--url',"http://127.0.0.1:$Port",$TunnelName) } else { @('tunnel','--no-autoupdate','--url',"http://127.0.0.1:$Port",'--protocol','http2') }
    $tunnel = Start-Process -FilePath $binary -ArgumentList $tunnelArgs -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardError $tunnelLog -RedirectStandardOutput (Join-Path $runtimeDir 'tunnel.stdout.log')
    $publicUrl = if ($PublicHostname) { "https://$PublicHostname" } else { $null }
    for ($i = 0; (-not $publicUrl) -and $i -lt 100; $i++) {
        if ($tunnel.HasExited) { throw "No se pudo iniciar el tunel. Revisa $tunnelLog" }
        $log = Get-Content -LiteralPath $tunnelLog -Raw -ErrorAction SilentlyContinue
        if ($log -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $publicUrl = $Matches[0]; break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $publicUrl) { throw "No se obtuvo una URL HTTPS. Revisa $tunnelLog" }
    $savedOrigin = $env:PUBLIC_ORIGIN; $savedPort = $env:PORT; $savedHost = $env:HOST
    try {
        $env:PUBLIC_ORIGIN = $publicUrl; $env:PORT = "$Port"; $env:HOST = '127.0.0.1'
        $serverScript = Join-Path $projectRoot 'backend/server.mjs'
        $relayProcess = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverScript + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'relay.stdout.log') -RedirectStandardError (Join-Path $runtimeDir 'relay.stderr.log')
    } finally { $env:PUBLIC_ORIGIN = $savedOrigin; $env:PORT = $savedPort; $env:HOST = $savedHost }
    $healthy = $false
    for ($i = 0; $i -lt 20; $i++) {
        try { $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health"; if ($health.status -eq 'ok') { $healthy = $true; break } } catch {}
        Start-Sleep -Milliseconds 250
    }
    if (-not $healthy) { throw 'El servidor de enlace no inicio correctamente.' }
    @{ url=$publicUrl; port=$Port; relayPid=$relayProcess.Id; tunnelPid=$tunnel.Id; root=$projectRoot; startedUtc=[DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
    Write-Host "Dicta Libre listo: $publicUrl"
    Write-Host 'Abre esa misma URL en el PC; crea una sesion y escanea el QR con el telefono.'
    Write-Host $(if ($TunnelName) { 'Enlace fijo activo. Manten este computador encendido. Solo datos sinteticos.' } else { 'El tunel es temporal. Manten este computador encendido. Solo datos sinteticos.' })
    Write-Host 'Para detener: powershell -File scripts/Stop-Demo.ps1'
} catch {
    if ($relayProcess -and -not $relayProcess.HasExited) { Stop-Process -Id $relayProcess.Id }
    if ($tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id }
    throw
}
