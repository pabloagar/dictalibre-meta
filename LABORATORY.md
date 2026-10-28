# Laboratorio local de transcripción

Primera implementación: 28-10-2026. Independiente de captura/transporte. Wi-Fi sigue siendo la conexión principal de la demo; aquí se comparan archivos completos sin medir la red celular–PC.

## Uso

Desde la raíz, `npm run lab`, o `powershell.exe -NoProfile -File scripts/Start-Lab.ps1`. Abrir http://127.0.0.1:8789 en este computador. El script reutiliza el servidor si ya responde; no recarga cambios de código.

1. Agregar uno o varios WAV PCM16 mono/estéreo (8–96 kHz, máximo 40 MB y 180 s). El conjunto principal debe contener dictados de **2–10 s**. La duración máxima no es una duración exigida.
2. Escuchar y guardar, opcionalmente, la referencia humana. Sin referencia no se calcula WER; guardar una referencia vacía declara silencio. Cada guardado conserva una versión nueva.
3. Marcar audios y configuraciones. Whisper usa large-v3, pesos FP16, OpenVINO GenAI y dispositivo GPU explícito, sin fallback automático a CPU. Muse usa `muse-voice-transcribe-1.0`, español y modo PUSH_TO_TALK.
4. Para Muse, abrir «Acceso a Meta» e introducir la clave en el formulario local. Vive en memoria del servidor; nunca se exporta ni persiste en el catálogo. También se admite `META_API_KEY` en el entorno. Solo ejecutar Muse envía los audios seleccionados a la API de Meta. Clave configurada no implica acceso verificado.
5. Ejecutar con 1–3 repeticiones. La cola alterna el orden de las configuraciones y procesa una ejecución cada vez. Cancelar detiene una ejecución; repetir crea nuevos resultados. Cerrar la página no detiene la cola. Reiniciar el servidor marca tareas incompletas como interrumpidas, sin reenviarlas.
6. Comparar originales y diferencias contra la referencia. JSON conserva todo el historial y metadatos; CSV es una tabla resumida. No incluyen archivos de audio ni claves, pero sí transcripciones y referencias.

Los audios, derivados, versiones y resultados permanecen en `data/local/lab/`, excluido de Git. No hay borrado automático ni cifrado propio en disco. Servidor ligado exclusivamente a 127.0.0.1; no publicar este laboratorio por el túnel de la demo.

## Configuraciones y módulos

- UI: `apps/lab/`; API, almacenamiento y cola: `backend/lab.mjs`.
- Validación WAV, configuración y evaluación: `backend/lab-core.mjs`.
- Preparación e inferencia OpenVINO: proceso Python persistente `backend/lab-worker.py`.
- Muse: adaptador de archivo en Node. No usa un LLM para fabricar o corregir el original.
- Entrada común: audio original inmutable identificado por SHA-256. Preparación compartida a PCM16 mono 16 kHz con media de canales y `scipy.signal.resample_poly`. Cada derivado tiene hash y relación al original; sin filtro de ruido ni VAD.
- Salida: texto original, estado, modelo/revisión, configuración, tiempos, error y capacidades ausentes como null. Cambiar motor no exige cambiar captura ni evaluación.

Primera versión configurable: Muse sin glosario o con lista de términos; Whisper búsqueda de 1 beam validada. Las variantes 3/5 quedaron bloqueadas tras reproducir fallo de remote_tensor en GPU; no hay fallback a CPU. Se conserva la configuración fallida como evidencia. Guardar genera una configuración nueva; los resultados previos conservan su snapshot. Español fijo, sin streaming, contexto textual libre, cuantización, corrector, editor clínico ni conexión directa a captura en esta entrega. Apagar un motor consiste en no seleccionarlo; preparar audio es obligatorio en este primer adaptador.

## Reproducción del entorno

Python 3.12, Node >=22 y controlador Intel GPU compatible ya instalado. No se modificó el controlador. Entorno aislado `.venv`; versiones exactas en `requirements-lab.lock.txt`.

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements-lab.lock.txt
.venv/Scripts/python.exe scripts/download-lab-model.py
npm ci
npm run lab
```

El comando `python` debe apuntar a Python real, no al acceso directo de Microsoft Store. Este equipo usó el Python 3.12 incluido en el runtime local de Codex. No se instaló Python global.

Modelo público: [OpenVINO/whisper-large-v3-fp16-ov](https://huggingface.co/OpenVINO/whisper-large-v3-fp16-ov), revisión `220761e60602a5ca694c409d5f424563b75d6820`. El descargador fija la revisión y escribe un manifiesto; no ejecuta código remoto del repositorio. La preparación requiere varios GB de disco y descarga. La comprobación de presencia valida manifiesto y archivos requeridos; no verifica cada peso en cada petición.

## Métricas y límites

| Campo | Intervalo / significado |
| --- | --- |
| queueMs | Encolado hasta inicio de ejecución; reloj monotónico del servidor |
| prepareMs | Solicitud al worker hasta WAV preparado; incluye arranque/importación de Python cuando corresponde |
| requestMs | Llamada al motor hasta respuesta; en Muse incluye red y servicio, sin separar ambos |
| loadMs | Construcción de pipeline local; cero cuando ya está cargado, null en Muse |
| generateMs | Llamada local a generate; no incluye carga; null en Muse |
| totalMs | Inicio de ejecución hasta estado terminal; excluye espera en cola y carga del archivo desde navegador |
| requestRtf | requestMs dividido por duración del audio; incluye carga en frío si ocurrió |
| firstTextMs | null: esta versión entrega el resultado completo, sin streaming |
| cold | Si se construyó el pipeline en esa ejecución; no asegura cachés de SO/controlador vacías |
| memoryBytes / coste real | null: no medidos; coste Muse es estimación identificada, no factura |

Tiempos incluyen el coste de orquestación e instrumentación dentro de sus intervalos; ese sobrecoste no está aislado. No son latencia micrófono→texto. Configuración, revisión, hash del backend, commit base y entorno observado permiten distinguir ejecuciones; si había cambios sin commit, el hash de fuentes es la evidencia y no el commit por sí solo. Red y otras condiciones no observadas permanecen desconocidas.

WER = (sustituciones + omisiones + inserciones) / palabras de referencia. Normalizador `es-literal-v1`: minúsculas, Unicode NFC, puntuación general excluida; conserva tildes, negaciones, números, decimales y porcentaje. **«tres» y «3» cuentan distinto**; no interpreta equivalencia clínica. Referencia vacía: WER indefinido, con conteo de palabras insertadas. La evaluación visible se recalcula contra la última referencia; cada ejecución conserva además la referencia vigente al ejecutarla. Textos de más de 1000 palabras no se evalúan interactivamente.

El resumen P50/P95 incluye todas las ejecuciones completadas seleccionadas, incluso cargas frías; para comparar rendimiento estable filtrar `result.cold === false` en JSON. Un lote pequeño o repeticiones del mismo audio no permiten inferir precisión general. El conjunto piloto, revisión clínica, precisión terminológica y evaluación reservada siguen pendientes.

## Validación de esta entrega

Pruebas automatizadas: WAV inválido, WER, configuraciones/versiones, origen HTTP, deduplicación, cola, fallos/cancelación, persistencia y exportación sin clave. Las pruebas de servicio usan un adaptador fixture explícito; no acreditan acceso real a Muse.

Se ejecutó Whisper real en Intel Arc integrada, tanto con una frase sintética de Microsoft Helena Desktop como con silencio. Se verificaron carga, referencia y resultados en navegador. Ver EXPERIMENTS.md para evidencia y límites. Muse está implementado según [contrato oficial](https://dev.meta.ai/docs/speech-to-text), **pendiente de validación con credencial real**.
