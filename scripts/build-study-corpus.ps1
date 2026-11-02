param([string]$OutputDirectory = 'data/local/study-corpus-v1')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$destination = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $destination) { throw 'Elige un directorio nuevo: no se sobrescribe evidencia.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $speaker.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'es-*' } | Select-Object -First 1
if (-not $voice) { throw 'Se requiere una voz local española de System.Speech.' }
$speaker.SelectVoice($voice.VoiceInfo.Name)
$speaker.Rate = 0
$manifest = @{ schema='dicta-corpus-v1'; source='local-synthetic-tts'; voice=$voice.VoiceInfo.Name; culture=$voice.VoiceInfo.Culture.Name; referenceValidated=$false; createdAt=[DateTime]::UtcNow.ToString('o'); cases=@() }
$bases = @('No se observa neumotórax.','Se observa neumotórax.','Nódulo pulmonar derecho.','Nódulo pulmonar izquierdo.','Lesión de tres milímetros.','Lesión de tres centímetros.')
try {
  for ($i=0; $i -lt $bases.Length; $i++) {
    foreach ($variant in @('clean','filler','pause500','pause2000','slow')) {
      $caseId = 'case-{0:D2}-{1}' -f ($i+1),$variant
      $text = $bases[$i]
      if ($variant -eq 'filler') { $text = 'Eh, ' + $text }
      $speaker.Rate = $(if ($variant -eq 'slow') { -2 } else { 0 })
      $file = Join-Path $destination ($caseId+'.wav')
      $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
      $speaker.SetOutputToWaveFile($file,$format)
      $prompt = New-Object System.Speech.Synthesis.PromptBuilder
      if ($variant -like 'pause*') {
        $split = $text.IndexOf(' ')
        $prompt.AppendText($text.Substring(0,$split))
        $pauseMs = $(if ($variant -eq 'pause500') {500} else {2000})
        $prompt.AppendBreak([TimeSpan]::FromMilliseconds($pauseMs))
        $prompt.AppendText($text.Substring($split+1))
      } else { $prompt.AppendText($text) }
      $speaker.Speak($prompt)
      $speaker.SetOutputToNull()
      $manifest.cases += @{ id=$caseId; baseId=('base-{0:D2}' -f ($i+1)); variant=$variant; file=($caseId+'.wav'); script=$text; referenceValidated=$false; rate=$speaker.Rate; sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLower(); pauseRequestedMs=$(if ($variant -eq 'pause500') {500} elseif ($variant -eq 'pause2000') {2000} else {$null}); measuredAcousticPauseMs=$null }
    }
  }
} finally { $speaker.Dispose() }
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $destination 'manifest.json') -Encoding UTF8
Write-Output "Corpus sintético guardado: $destination (30 variantes, 6 frases base; no 30 muestras independientes)."
