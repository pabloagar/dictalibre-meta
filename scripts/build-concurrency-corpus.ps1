param([string]$OutputDirectory = 'data/local/concurrency-tts-v1')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$destination = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $destination) { throw 'Elige un directorio nuevo; no se sobrescribe evidencia.' }
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $speaker.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'es-*' } | Select-Object -First 1
if (-not $voice) { $speaker.Dispose(); throw 'No hay voz local española disponible.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$manifest = @{schema='dicta-concurrency-tts-v1'; createdAt=[DateTime]::UtcNow.ToString('o'); voice=$voice.VoiceInfo.Name; culture=$voice.VoiceInfo.Culture.Name; rate=0; cases=@(); source='Windows System.Speech local TTS; no human or clinical audio'}
try {
    $speaker.SelectVoice($voice.VoiceInfo.Name)
    $speaker.Rate=0
    $words=@('manzana','banana','cereza','durazno','frutilla','limón','naranja','pera','sandía','uva')
    foreach ($word in $words) {
        $filename='session-'+($manifest.cases.Count+1)+'.wav'
        $file=Join-Path $destination $filename
        $text="Prueba de conexión. La palabra de esta sesión es $word. Repito $word. Fin de la prueba."
        $format=New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
        $speaker.SetOutputToWaveFile($file,$format)
        $speaker.Speak($text)
        $speaker.SetOutputToNull()
        $manifest.cases+=@{file=$filename; word=$word; script=$text; source=$manifest.source; sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLower()}
    }
} finally { $speaker.Dispose() }
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $destination 'manifest.json') -Encoding UTF8
Write-Output "Diez audios TTS creados en $destination. No representan diez hablantes reales."
