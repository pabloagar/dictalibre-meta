# Synthetic controls only. Requires the installed Spanish Windows voice.
$ErrorActionPreference = 'Stop'
$labRoot = Split-Path -Parent $PSScriptRoot
$labOutput = Join-Path $labRoot '.runtime'
New-Item -ItemType Directory -Path $labOutput -Force | Out-Null
Add-Type -AssemblyName System.Speech
$labSpeech = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $labSpeech.SelectVoice('Microsoft Helena Desktop')
    $labSpeech.SetOutputToWaveFile((Join-Path $labOutput 'lab-frase-sintetica.wav'))
    $labSpeech.Speak('No se observa derrame pleural. Nódulo de tres milímetros en el pulmón derecho.')
} finally { $labSpeech.Dispose() }
$labSilence = Join-Path $labOutput 'lab-silence.wav'
& (Join-Path $labRoot '.venv/Scripts/python.exe') -c "import wave,sys; w=wave.open(sys.argv[1],'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(bytes(64000)); w.close()" $labSilence
if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar silencio.' }
Write-Output "Controles creados en $labOutput. No constituyen un corpus de evaluación radiológica."
