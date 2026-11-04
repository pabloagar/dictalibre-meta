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

## Evaluación ciega y permisos por finalidad

Primera fase implementada: reutiliza el lote privado, sin GPU ni entrenamiento. Preparar tres carpetas de escucha:

```bash
python review_workflow.py prepare --source RUTA_LOTE --output RUTA_REVISION_NUEVA
python review_workflow.py import-review --source RUTA_LOTE --key RUTA_REVISION/oyente_1/CLAVE_PRIVADA.json --reviews revision-chile-blind.json --output oyente1-importado.json
python review_workflow.py report --source RUTA_LOTE --reviews oyente1-importado.json oyente2-importado.json oyente3-importado.json --output resultado-nuevo.json
```

Compartir únicamente `para_oyente/ESCUCHAR.html`, nunca CLAVE_PRIVADA.json. El HTML incluye audios y debe permanecer privado. Cada oyente tiene su identificador anónimo y orden reproducible; el motor, perfil y semilla se omiten del HTML. Si el oyente ya conoce las muestras, el cegamiento es parcial y no puede restaurarse. Tres archivos no equivalen a tres personas: reclutamiento y escucha siguen siendo humanos. No se enviaron invitaciones.

La evaluación añade lateralidad y unidades a los errores de contenido. Revisiones anteriores sin esos campos quedan incompletas, no se rellenan con cero. Importar vincula evaluación, clave, oyente y manifiesto; conservar el JSON descargado original. El informe presenta resultados descriptivos, medias por oyente, rango de desacuerdo y errores por 100 evaluaciones completas (no por 100 frases independientes). Para aprobación por panel de una muestra exige al menos tres oyentes, medias >=4 y ningún error de contenido en sus revisiones. Un informe parcial no constituye validación del perfil ni de Whisper.

`rights.json` empieza pendiente. Cada finalidad admite estados documentales `verified`, `conditional`, `unverified`, `restricted`; solo `verified` con evidencia, revisor y fecha permite exportar. Revisar toda la cadena de código, pesos, textos, referencias, identidad y condiciones de salida. No basta cambiar una etiqueta: el software comprueba campos y vinculación, no interpreta contratos ni verifica la autenticidad de la evidencia. `pilot.py export` ahora requiere `--rights RUTA/rights.json` además de sus revisiones humanas existentes. Mantiene el criterio original de perfil por un oyente; el informe de tres oyentes es una evaluación adicional, no se transforma automáticamente en ese archivo de aprobación. No hay exportación ni aprobación del lote actual.

`clinical_cases_v2.json` prepara diez guiones ficticios con negaciones, lados, números, unidades, términos y autocorrecciones; no se generaron nuevos audios. Revisión clínica de los guiones pendiente. Fuentes candidatas y límites: [auditoría documental](../../docs/CHILEAN_REFERENCE_SOURCES.md).

## Entrenamiento de Chatterbox

Objetivo confirmado: adaptar TTS de pesos abiertos → generar audio revisado → entrenar Whisper en una fase independiente. Receta, límites y reproducción en [TRAINING.md](TRAINING.md). El código experimental está preparado; no confundirlo con un modelo chileno ya entrenado. Preflight real bloqueado por permiso de adaptación pendiente, antes de GPU. Inventario SLR71 y pruebas del núcleo LoRA ejecutados localmente; datos/pesos privados fuera de GitHub.

## Piloto Qwen compartido

El responsable eligió un adaptador multivoz experimental de Qwen3-TTS Base 1.7B. Se completaron 600 pasos con cuatro hablantes; el reproductor privado compara 60 audios de Qwen original, ajustado y Chatterbox. Metodología, revisiones fijadas, resultados y limitaciones: [QWEN_SHARED_PILOT.md](../../docs/QWEN_SHARED_PILOT.md). No es la receta multivoz oficial de Qwen; se ajusta solo el codec principal con LoRA. Audios y pesos privados, evaluación auditiva pendiente.
