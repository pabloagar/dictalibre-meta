# Laboratorio local de transcripción

**Estado actual al 1 de noviembre:** disponibles Muse-Normal, Muse-streaming y Whisper local (OpenVINO, GPU, beams=1), Revisor Meta experimental y editor. Muse se ha probado con éxito tras reemplazar la credencial. Los párrafos de primeras pruebas conservan fallos históricos, no un bloqueo actual. El laboratorio guarda datos privados localmente y no debe publicarse por el túnel. El Revisor envía texto a Meta cuando está habilitado, incluso si la transcripción proviene de Whisper; desactivarlo para una comparación de ASR exclusivamente local. Biblioteca privada no incluida en GitHub.

**Credencial persistente (actualización):** «Guardar clave en este PC» escribe `.env.local` en la raíz, oculto en Windows y excluido de Git. Se carga automáticamente al iniciar; sustituye el comportamiento anterior de memoria solamente. El archivo contiene `META_API_KEY=...`; se puede editar localmente y reiniciar, o usar el formulario para aplicar sin reinicio. Es texto local sin cifrado propio y hereda permisos de la carpeta en Windows. No se sirve por HTTP ni se incluye en catálogos/exportaciones. Una clave vacía borra el valor guardado.

«Comprobar conexión con Meta» ejecuta GET /v1/models con la credencial del servidor y devuelve únicamente estado, tipo/código de error y nombres de modelos. No devuelve la clave ni el cuerpo arbitrario del error remoto. Éxito en listado verifica autenticación general, no una transcripción exitosa. La prueba con la credencial anterior respondió 401/invalid_api_key; la nueva persistencia no convierte una clave rechazada en válida.

Dictado actualizado: `/live` permite elegir **Muse · Meta API** o **Whisper · GPU local** antes de cada toma. La elección se fija cuando llega el inicio de captura y no cambia para trabajos en curso. Si hay clave configurada, la vista propone Muse al abrir; el aviso identifica envío a Meta. Se utiliza la configuración base sin glosario de Muse o base GPU beams=1 de Whisper. Cada tarjeta y ejecución identifica el motor efectivo. No se reinicia el servidor al cambiar de motor o reemplazar la clave.

Validación Muse en vivo del 28-10-2026: el recorrido sintético llegó a la API, que respondió HTTP 401. Se registró fallo de autenticación, no transcripción ni comparación exitosa. Clave configurada no equivale a acceso validado; reemplazarla desde el formulario local y repetir prueba. La clave no se leyó ni exportó durante la verificación.

Actualización: también disponible [dictado desde celular](http://127.0.0.1:8789/live). El receptor local crea una sesión del relay público mediante puente WebSocket; el QR abre el emisor HTTPS en el S25 Ultra. Solo las tomas completas verificadas se importan y encolan automáticamente en Whisper base. Audio y resultados se guardan localmente en este laboratorio, sin envío a Muse. Requiere demo/túnel y laboratorio activos en el mismo PC. La página pública anterior sigue siendo receptor de transporte; para transcribir usar `/live` en este PC.

Cada tarjeta pertenece a una toma, sin sobrescribir resultados con la siguiente. Se muestran últimas cinco tarjetas terminadas; una activa puede mantenerse hasta acabar. Nueva sesión cancela trabajos iniciados desde esa página; cerrar la pestaña no garantiza cancelación de trabajos ya encolados, visibles en el laboratorio. Mediciones del navegador se guardan en `run.live` y en la exportación de transporte (sin texto); si se cierra antes de recibir el resultado, pueden faltar.

Primera implementación: 28-10-2026. Independiente de captura/transporte. Wi-Fi sigue siendo la conexión principal de la demo; aquí se comparan archivos completos sin medir la red celular–PC.

## Uso

Desde la raíz, `npm run lab`, o `powershell.exe -NoProfile -File scripts/Start-Lab.ps1`. Abrir http://127.0.0.1:8789 en este computador. El script reutiliza el servidor si ya responde; no recarga cambios de código.

1. Agregar uno o varios WAV PCM16 mono/estéreo (8–96 kHz, máximo 40 MB y 180 s). El conjunto principal debe contener dictados de **2–10 s**. La duración máxima no es una duración exigida.
2. Escuchar y guardar, opcionalmente, la referencia humana. Sin referencia no se calcula WER; guardar una referencia vacía declara silencio. Cada guardado conserva una versión nueva.
3. Marcar audios y configuraciones. Whisper usa large-v3, pesos FP16, OpenVINO GenAI y dispositivo GPU explícito, sin fallback automático a CPU. Muse usa `muse-voice-transcribe-1.0`, español y modo PUSH_TO_TALK.
4. Para Muse, abrir «Acceso a Meta», introducir la clave y pulsar «Guardar clave en este PC». Se conserva en `.env.local` y se carga al reiniciar; nunca se exporta ni persiste en el catálogo. Si el archivo no define la clave, se admite `META_API_KEY` en el entorno. «Comprobar conexión con Meta» verifica la autenticación sin enviar audio. Solo ejecutar Muse envía los audios seleccionados a la API de Meta. Clave configurada no implica acceso verificado.
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

Primera versión configurable: Muse sin glosario o con lista de términos; Whisper búsqueda de 1 beam validada. Las variantes 3/5 quedaron bloqueadas tras reproducir fallo de remote_tensor en GPU; no hay fallback a CPU. Se conserva la configuración fallida como evidencia. Guardar genera una configuración nueva; los resultados previos conservan su snapshot. Aquella primera versión tenía español fijo y no incluía streaming ni editor; ambos se incorporaron después. Cuantización y contexto textual libre no se presuponen implementados. Apagar un motor consiste en no seleccionarlo; preparar audio es obligatorio en este primer adaptador.

## Reproducción del entorno

Python 3.12, Node >=22 y controlador Intel GPU compatible ya instalado. No se modificó el controlador. Entorno aislado `.venv`; versiones exactas en `requirements-lab.lock.txt`.

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements-lab.lock.txt
.venv/Scripts/python.exe scripts/download-lab-model.py
pnpm install --frozen-lockfile
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

## Dictado con comandos
Desde /live se aplican comandos básicos al terminar la toma y se conserva el original. El enlace de cada toma abre el mismo audio con Muse/Whisper base seleccionados para ejecutar la comparación después. Formato y auditoría se guardan por ejecución, sin modificar resultados históricos. Instrucciones y referencias: DICTATION_COMMANDS.md.

## Números y comparación con glosario
El laboratorio permite activar «Escribir cantidades en cifras» independientemente de los comandos. Muestra el original y el resultado numérico intermedio, con dudas y duración; conserva la configuración por ejecución. Detalles y límites en DICTATION_COMMANDS.md. Está disponible la configuración Muse · glosario radiológico piloto (20 keywords); los resultados de las cinco tomas y sus dos repeticiones se conservan en el catálogo. Ver EXPERIMENTS.md: mejora léxica exploratoria, sin validación clínica ni referencias humanas confirmadas.

## Muse streaming experimental · 28-10-2026
Disponible en /live junto a Muse por toma y Whisper local. El glosario se elige independientemente para las dos modalidades de Muse; por defecto no se aplica. La clave sigue solo en el backend local.

Flujo: PCM del teléfono → receptor → WebSocket local /asr-stream → remuestreo continuo → WebSocket Meta → borradores acumulativos reemplazables → final verificado → números → comandos → informe. Se utiliza PUSH_TO_TALK, una conexión por toma, PCM16 mono a 24 kHz. Se envía endStream únicamente después de validar el hash PCM y vaciar la cola de envío. Los parciales no se añaden al informe ni pasan por reglas de formato.

El audio original, el derivado enviado, las hipótesis, configuración, hashes y métricas se guardan en el laboratorio. La vista distingue file de streaming aunque compartan configuración base; el resumen de tiempos por archivo excluye streaming. Un final perdido o una interrupción quedan como fallo, sin promover el último parcial. No hay reintento ni cambio de motor automático.

Límites del prototipo: una toma streaming simultánea, 180 s máximo, cola de audio máxima 10 s, conexión 10 s y espera de final 30 s después de endStream. Esperar el resultado antes de la siguiente toma. No se implementó detección automática de turnos ni recuperación de sesiones. La entrada del micrófono real del S25 sigue pendiente de validación por el responsable.

Remuestreo independiente sinc-Hann de 64 intervalos, versión sinc-hann-64-mono-24k-v1. Se verifican continuidad entre bloques, duración y señal de control; falta caracterizar su respuesta espectral y comparar su efecto sobre reconocimiento. El modo por archivo usa otra preparación (scipy a 16 kHz): no atribuir todas las diferencias de texto al transporte streaming.

Fuente del contrato consultada: https://dev.meta.ai/docs/speech-to-text (28-10-2026).

## Prueba de segmentación desde el teléfono
En http://127.0.0.1:8789/live elegir Muse-streaming y Segmentación automática · prueba; crear sesión y escanear QR. Mantener pantalla móvil visible; usar iniciar/parar para una toma con varias pausas. Las pausas consolidan segmentos sin detener el micrófono. Solo al detener se aplican números/comandos al conjunto y se añade al informe. Guardado de audio/resultados/segmentos en laboratorio; máximo 180 s. Cierre manual sigue disponible y es el predeterminado al recargar. Prueba física pendiente del usuario.


## Estudios ampliados · 2026-11-02
Panel 04 implementado: comparación filtrada/pareada, anotación clínica por etapa, edición humana, evaluación del revisor y usabilidad independiente, con registros persistentes y exportables. Guía completa, generación/importación de corpus sintético y límites en [LAB_STUDIES.md](LAB_STUDIES.md). Las capacidades están implementadas; ensayos clínicos/humanos y comparación real de robustez pendientes de ejecución.
