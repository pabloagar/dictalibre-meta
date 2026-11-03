# Piloto chileno separado

Chatterbox es el motor prioritario. Qwen genera referencias artificiales candidatas. Metodología, licencias, presupuesto y factibilidad de adaptación: [documento del piloto](../../docs/CHILEAN_VOICE_PILOT.md).

Copiar esta carpeta a `laboratorio_voces/piloto_chileno`. No instalar dependencias GPU en el entorno de Dicta Libre. En Colab usar entornos separados: Qwen requiere transformers 4.57.3; Chatterbox V3, 5.2.0. `requirements.txt` fija Qwen/código; `requirements-chatterbox.txt` fija dependencias de Chatterbox, incluido Perth. Instalar el código Chatterbox con `--no-deps` desde su revisión en config.json, después de las dependencias.

La interfaz de ambos adaptadores es `generar_audio(texto: str, voz: dict, ruta_salida: Path) -> dict`. `config.json` conserva perfiles, descripciones, semillas, acento objetivo y estado null de validación. No se cambia el registro global del laboratorio: son perfiles experimentales aislados.

```bash
python pilot.py generate --stage references --output /content/referencias --budget /content/budget.json
# Cambiar al Python del entorno Chatterbox:
python pilot.py generate --stage chatterbox --source /content/referencias --output /content/chatterbox --budget /content/budget.json
python pilot.py listen --source /content/chatterbox
# Después de escuchar referencias y las diez muestras de cada perfil:
python pilot.py export --source /content/chatterbox --review revision-chile-chatterbox.json --reference-review revision-chile-references.json --output corpus_aprobado
python pilot.py generate --stage stability --source /content/chatterbox --review revision-chile-chatterbox.json --output estabilidad --budget /content/budget.json
python -m unittest discover -s . -p test_pilot.py -v
```

`budget.json` registra `usd_per_unit`, `units_per_hour`, `max_runtime_s`, `watchdog_armed`, `rate_source`, `observed_utc`; no inventar estos valores ni tratar el archivo como activación del watchdog. Este debe estar efectivamente activo en el notebook. Alternativa `--free-runtime-confirmed` solo si el proveedor confirma ejecución gratuita. No habilita compras.

Las ejecuciones requieren carpetas nuevas y no sobrescriben muestras anteriores. Manifiesto JSON/CSV, protocolo, entorno, freeze y reproductor quedan junto a los WAV privados. La revisión se descarga desde `ESCUCHAR.html`; no basta marcar reproducido. No exportar referencias candidatas como entrenamiento. No subir salidas, audios ni notebooks con resultados al repo público.

Compatibilidad original: `--stage design` permite el piloto Qwen de 20 muestras; ya no es el recorrido predeterminado. La fase estabilidad usa el motor del perfil aprobado. No se entrenan pesos en ninguna de estas fases.
