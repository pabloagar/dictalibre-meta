param([string]$OutputDirectory = 'data/local/term-pair-v1')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$destination = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $destination) { throw 'Usa un directorio nuevo; no sobrescribir evidencia.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Laura'); $speaker.Rate = 0
$cases = @()
try {
  $old = Get-Content -LiteralPath 'data/local/mvp-synthetic-v1/manifest.json' -Raw | ConvertFrom-Json
  foreach ($id in @('microsoft-laura-negation','microsoft-laura-positive')) {
    $c = $old.cases | Where-Object id -eq $id
    Copy-Item -LiteralPath (Join-Path 'data/local/mvp-synthetic-v1' $c.file) -Destination (Join-Path $destination $c.file)
    $cases += @{ id=$id; file=$c.file; script=$c.script; term='neumotórax'; voice=$c.voice; origin='frozen prior synthetic audio'; sha256=$c.sha256; referenceValidated=$false }
  }
  $texts = @(
    @{id='hemo-negative'; script='No se observa hemotórax punto'; term='hemotórax'},
    @{id='hemo-positive'; script='Se observa hemotórax punto'; term='hemotórax'},
    @{id='hemi-right'; script='Hemotórax en el hemitórax derecho punto'; term='hemotórax hemitórax'},
    @{id='hemi-left'; script='Dolor en el hemitórax izquierdo punto'; term='hemitórax'},
    @{id='neutral'; script='Tráquea centrada punto'; term=''}
  )
  foreach ($c in $texts) {
    $file = Join-Path $destination ($c.id+'.wav')
    $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
    $speaker.SetOutputToWaveFile($file,$format); $speaker.Speak($c.script); $speaker.SetOutputToNull()
    $cases += @{id=$c.id;file=($c.id+'.wav');script=$c.script;term=$c.term;voice='Microsoft Laura';origin='new synthetic control';sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLower();referenceValidated=$false}
  }
} finally { $speaker.Dispose() }
@{schema='term-pair-corpus-v1';createdAt=[DateTime]::UtcNow.ToString('o');source='System.Speech local synthetic TTS';referenceValidated=$false;cases=$cases} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destination 'manifest.json') -Encoding UTF8
Write-Output 'Siete audios sintéticos preparados; referencia por escucha pendiente. El evaluador añade un control de silencio digital.'
