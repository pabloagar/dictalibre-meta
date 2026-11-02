param([string]$OutputDirectory = 'data/local/punctuation-pair-v1')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$destination = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $destination) { throw 'Usa un directorio nuevo; no sobrescribir evidencia.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Laura'); $speaker.Rate = 0
$cases = @()
try {
  $texts = @(
    @{id='p1'; script='Pulmones bien expandidos'; term=''},
    @{id='p2'; script='Pulmones bien expandidos punto'; term=''},
    @{id='p3'; script='Sin derrame pleural ni neumotórax'; term=''},
    @{id='p4'; script='Sin derrame pleural coma ni neumotórax punto'; term=''},
    @{id='p5'; script='Hallazgos lesión de uno coma ocho centímetros'; term=''},
    @{id='p6'; script='Hallazgos dos puntos nueva línea lesión de uno coma ocho centímetros punto'; term=''},
    @{id='p7'; script='Paciente en coma inducido punto'; term=''}
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
