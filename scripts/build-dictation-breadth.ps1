param([string]$OutputDirectory = 'data/local/dictation-breadth-v1')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$destination = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $destination) { throw 'Elige un directorio nuevo; no se sobrescribe evidencia.' }
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$requested = @('Microsoft Helena Desktop', 'Microsoft Laura')
$available = @($speaker.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'es-*' })
$voices = @($available | Where-Object { $requested -contains $_.VoiceInfo.Name })
if (-not $voices.Count) { $speaker.Dispose(); throw 'No hay voces españolas locales compatibles.' }
$cases = @(Get-Content -LiteralPath 'tests/fixtures/dictation-breadth.json' -Raw | ConvertFrom-Json)
if ($voices.Count -ne 2 -or $cases.Count -ne 24) { $speaker.Dispose(); throw 'Se requieren las dos voces y los 24 casos prefijados.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$watch = [Diagnostics.Stopwatch]::StartNew()
$manifest = @{schema='dicta-breadth-synthetic-v1'; source='System.Speech local synthetic TTS'; createdAt=[DateTime]::UtcNow.ToString('o'); headObserved=(& git rev-parse HEAD); dirtyAtStart=([bool](& git status --porcelain)); scriptSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLower(); os=[Environment]::OSVersion.VersionString; powershell=$PSVersionTable.PSVersion.ToString(); repetitions=1; network=$null; browser=$null; captureDevice=$null; referenceValidated=$false; cases=@(); failures=@(); installedSpanishVoices=@($available | ForEach-Object {$_.VoiceInfo.Name}); hypothesis='La prueba posterior conserva comandos, negación, lateralidad y medidas en voces sintéticas locales.'; acceptance='Generación: WAV PCM mono 16 kHz/16 bits, hash verificable y contenido no vacío. ASR: por evaluar; no es validación clínica.'; instrumentationOverheadMs=$null; clockResolutionMs=$null}
try {
  foreach ($voice in $voices) {
    $speaker.SelectVoice($voice.VoiceInfo.Name); $speaker.Rate=0
    foreach ($case in $cases) {
      $id=($voice.VoiceInfo.Name -replace '[^a-zA-Z0-9]','-').ToLower()+'-'+$case.id
      $file=Join-Path $destination ($id+'.wav')
      try {
        $format=New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
        $speaker.SetOutputToWaveFile($file,$format); $speaker.Speak($case.script); $speaker.SetOutputToNull()
        $manifest.cases += @{id=$id; baseId=$case.id; category=$case.category; terms=$case.terms; file=($id+'.wav'); voice=$voice.VoiceInfo.Name; culture=$voice.VoiceInfo.Culture.Name; rate=0; script=$case.script; expectedFormatted=$case.expected; referenceValidated=$false; sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLower(); bytes=(Get-Item -LiteralPath $file).Length}
      } catch { $speaker.SetOutputToNull(); $manifest.failures += @{id=$id; error=$_.Exception.Message} }
    }
  }
} finally { $speaker.Dispose() }
$watch.Stop(); $manifest.generationElapsedMs=$watch.Elapsed.TotalMilliseconds
$manifest.interval='Inicio tras crear directorio hasta disponer sintetizador; excluye escritura de manifiesto.'
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destination 'manifest.json') -Encoding UTF8
Write-Output "Corpus: $destination; archivos: $($manifest.cases.Count); fallos: $($manifest.failures.Count). Referencias pendientes de escucha humana."
if ($manifest.failures.Count) { exit 1 }
