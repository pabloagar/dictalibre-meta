param([string]$OutputDirectory = 'data/local/english-mvp-tts-v1')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$destination = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $destination) { throw 'Evidence directory already exists' }
New-Item -ItemType Directory -Path $destination | Out-Null
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
 $voice=$speaker.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'en-*' } | Select-Object -First 1
 if (-not $voice) { throw 'No English TTS voice installed' }
 $speaker.SelectVoice($voice.VoiceInfo.Name)
 $script='Connection test. The word for this session is pineapple. I repeat pineapple. End of test.'
 $file=Join-Path $destination 'synthetic.wav'
 $format=New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
 $speaker.SetOutputToWaveFile($file,$format);$speaker.Speak($script);$speaker.SetOutputToNull()
 @{source='Windows System.Speech local TTS; no human or clinical audio';voice=$voice.VoiceInfo.Name;culture=$voice.VoiceInfo.Culture.Name;script=$script;file='synthetic.wav';marker='pineapple';createdAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $destination 'manifest.json')
 Write-Output 'Synthetic English TTS created.'
} finally {$speaker.Dispose()}
