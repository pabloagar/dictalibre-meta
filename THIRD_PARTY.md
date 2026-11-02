# Modelos, dependencias y licencias

Estado de modelos al 1 de noviembre: Muse Voice Transcribe (por toma y streaming), Muse Spark 1.3 y Whisper large-v3/OpenVINO han sido ejecutados. Los inventarios de versiones efectivas aparecen en las actualizaciones del laboratorio y Revisor al final de este documento. Actualización de licencia del 02-11-2026: código propio bajo PolyForm Noncommercial 1.0.0; véanse LICENSE y LICENSING.md. Esta elección no cambia los permisos de terceros. Las secciones preliminares siguientes conservan decisiones históricas del 28 de octubre y no describen el estado actual.

## Componentes usados en fases 1 y 2

| Componente | Versión efectiva | Uso / licencia / fuente |
| --- | --- | --- |
| Node.js | 24.19.0 en el entorno de prueba | Runtime; distribución oficial y sus avisos. Proyecto compatible objetivo >=22 |
| pnpm | 11.25.0 | Instalación y lockfile; MIT, [repositorio](https://github.com/pnpm/pnpm) |
| ws | 8.22.0 | Relay WebSocket; MIT, [repositorio](https://github.com/websockets/ws) |
| qrcode-generator | 2.0.4 | QR generado localmente, sin servicio externo; MIT, [repositorio](https://github.com/kazuhikoarase/qrcode-generator) |
| cloudflared | 2026.10.5, Windows amd64 | Binario de demo en carpeta ignorada; Apache-2.0 y avisos de su distribución, [release oficial](https://github.com/cloudflare/cloudflared/releases/tag/2026.10.5) |
| Cloudflare Quick Tunnel | Servicio temporal | HTTPS/WSS de desarrollo; [documentación](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/). Sin garantía de servicio permanente; el audio pasa por su infraestructura |

Los paquetes npm conservan sus avisos originales en `node_modules`; sus integridades están fijadas en `pnpm-lock.yaml`. QR se sirve desde el paquete instalado y mantiene el encabezado de licencia. No se vendieron ni atribuyeron como propios. Hash SHA-256 del ejecutable cloudflared verificado antes de ejecutar: `db4e4c413612a0916f3e1679d3caaf376f94911952d163028fb726fb2e0516a9`. No se distribuye ese ejecutable en Git.

En la implementación inicial de captura/transporte no había frameworks de interfaz, SDK de modelos, bases de datos ni pesos instalados. El contenedor Docker está preparado pero no validado. La selección de Node reemplaza la propuesta inicial de FastAPI para el relay; Python sigue siendo una posibilidad futura para ASR.

## Evaluación preliminar de Meta

| Candidato | Evidencia de disponibilidad / licencia | Encaje y decisión provisional |
| --- | --- | --- |
| Muse Spark 1.3, API | [Ficha oficial](https://dev.meta.ai/models/muse-spark); acceso de cuenta, cuotas y condiciones del servicio pendientes | Primera prueba de sugerencias estructuradas; evitar administrar GPU. No se presupone precisión radiológica ni latencia adecuada |
| Llama 3.1 8B Instruct | [Ficha de Meta](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct): texto, español soportado, Llama 3.1 Community License | Alternativa de pesos accesibles bajo condiciones; evaluar local si hardware lo permite. Menor tamaño no garantiza velocidad ni precisión suficientes |
| Llama 3.3 70B Instruct | [Ficha de Meta](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct): texto, español soportado, Llama 3.3 Community License | Comparador opcional vía proveedor; coste y recursos pueden exceder el MVP. No asumir que mayor tamaño mejora seguridad clínica |
| Muse Voice Transcribe 1.0 | [Ficha oficial](https://dev.meta.ai/models/muse-voice-transcribe): ofrece transcripción incremental y sesgo contextual | Evaluación opcional como ASR de Meta. Verificar español, API, privacidad y cuenta; no desplaza el baseline local antes de medir |

Las licencias de Llama son propias, no MIT ni Apache. Revisar las condiciones de atribución, redistribución y política de uso de la revisión elegida. El código propio y los pesos no comparten automáticamente licencia. Las modalidades alojadas añaden términos del proveedor.

**Selección propuesta:** probar Muse Spark 1.3 con texto sintético como corrector acotado en F1. Si el acceso o términos no permiten el experimento, evaluar Llama 3.1 8B; solo elegir Llama 3.3 si existe un endpoint viable. Mantener el ASR independiente para medir el aporte de Meta. No incorporar modelos de imagen/segmentación sin una necesidad del dictado.

**Puerta de decisión F1:** 10 casos de desarrollo, salida válida o abstención segura en todos, tiempos por solicitud, fallos, costes y revisión de condiciones. Comparar sobrecorrección antes que fluidez. Una latencia estimada a partir del tamaño no sustituye una medición. Documentar modelo exacto, endpoint, región, límites, retención/uso de datos y presupuesto; ninguna credencial se almacena en Git.

La ficha de Muse Spark distingue variantes con diferente uso de datos para mejora de productos. La selección no debe hacerse solo por precio: comprobar modalidad y términos efectivos del endpoint. No se ha verificado idoneidad para datos clínicos y este MVP usará material sintético.

## Infraestructura candidata

| Componente | Papel previsto | Fuente y estado de licencia |
| --- | --- | --- |
| faster-whisper | Ejecutar ASR local | [Repositorio oficial](https://github.com/SYSTRAN/faster-whisper), MIT; versión no elegida |
| Whisper | Pesos ASR multilingües de referencia | [Licencia oficial](https://github.com/openai/whisper/blob/main/LICENSE), MIT; variante y revisión pendientes |
| FastAPI | Backend HTTP/WebSocket | [Licencia oficial](https://github.com/fastapi/fastapi/blob/master/LICENSE), MIT; versión no elegida |
| Web Audio / getUserMedia / WebSocket | APIs de navegador | [Referencia de captura](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia); no se incorpora código de MDN |

Dependencias transitivas, servidor ASGI, validación, pruebas, inferencia y procesamiento de audio se inventariarán al fijar el entorno. Verificar licencias de distribuciones binarias y códecs efectivamente instalados. No se añade un archivo de dependencias vacío que sugiera un entorno reproducible ya resuelto.

## Registro a completar por componente incorporado

Nombre; función; versión/commit/hash; fuente oficial; licencia y copia de avisos necesarios; fecha de incorporación; modificaciones; obligaciones de distribución; términos de API; datos enviados; retención; responsable de revisión. Registrar licencias de datasets/glosarios de manera independiente a las del modelo.

## Pendientes de publicación

Licencia del código propio elegida el 02-11-2026: PolyForm Noncommercial 1.0.0. Mantener el lockfile y revisar avisos de distribución de los componentes realmente usados. Revisión de bases públicas y límites en LICENSING.md; instrucciones autenticadas de entrega pendientes. No se atribuye al proyecto autoría de modelos o bibliotecas externos.

## Actualización de candidatos de transcripción
La investigación del 28-10-2026 en TRANSCRIPTION_PLAN.md confirma en documentación oficial español y modo de dictado de Muse Voice Transcribe; el acceso de cuenta aún no se ha probado. La propuesta de prueba ASR y contratos allí descritos sustituye la prioridad preliminar de corrector en «F1» de este documento: fases 1/2 son captura/transporte y no se integra corrector aún. Muse, Whisper, Speechmatics y Scribe son candidatos, no nuevas dependencias instaladas. Términos efectivos de APIs, cuotas y coste del piloto siguen pendientes de confirmar.
# Componentes efectivamente incorporados al laboratorio · 2026-10-28

Esta actualización sustituye el estado «no instalado» de los candidatos Whisper/OpenVINO. Muse es adaptador implementado, acceso real aún pendiente.

| Componente | Versión y atribución |
| --- | --- |
| OpenVINO / GenAI / Tokenizers | 2026.4.1 / 2026.4.1.0 / 2026.4.1.0; proyectos Intel, Apache-2.0; [fuente](https://github.com/openvinotoolkit/openvino.genai) |
| Whisper large-v3 | Modelo original OpenAI, MIT; conversión [OpenVINO FP16](https://huggingface.co/OpenVINO/whisper-large-v3-fp16-ov) con ficha Apache-2.0; revisión 220761e60602a5ca694c409d5f424563b75d6820. Conservar atribución original y de conversión |
| NumPy / SciPy | 2.5.4 / 1.18.1; BSD-3-Clause, incluidos avisos de bibliotecas numéricas empaquetadas |
| huggingface_hub | 2.3.0, Apache-2.0; descarga de pesos fijados, no código remoto |
| Muse Voice Transcribe | muse-voice-transcribe-1.0 vía Meta Model API; servicio propietario, términos/retención/cuota efectivos pendientes de verificar para la cuenta; [contrato](https://dev.meta.ai/docs/speech-to-text) |
| Voz Windows Helena Desktop | Control sintético generado localmente con voz instalada; no redistribuida como dependencia ni corpus |

Lock completo: requirements-lab.lock.txt. Inventario extraído de metadatos instalados, incluidos avisos declarados: experiments/lab-dependencies.json. No sustituye una revisión jurídica ni todos los avisos de redistribución de binarios. Pesos, entorno y WAV no incluidos en Git. DO_NOT_TRACK y HF_HUB_DISABLE_TELEMETRY activados en el worker/descargador; no se añade analítica de uso. La dependencia openvino-telemetry viene con el runtime; no se incorpora un servicio propio de telemetría externa.


## Revisor Meta · 29-10-2026
muse-spark-1.3 vía Meta Model API, servicio remoto propietario; no se descargan ni modifican pesos. Contrato [chat completions](https://dev.meta.ai/docs/protocols/chat-completions). Acceso probado con clave existente. Tarifa, cuotas, retención y condiciones de cuenta/concurso siguen pendientes de verificación específica; no se atribuye licencia Llama a este servicio. Sin dependencias nuevas instaladas.


## Colección externa de plantillas
Colección PLANTILLAS GENERALES PUC aportada por el responsable, importada solo en data/local/templates (ignorado por Git). No es código ni autoría nueva del hackathon; fuente y hashes conservados. Permisos de redistribución no acreditados; no se incorpora el contenido al repositorio público. PDF/presentaciones se registran como referencia y no como plantillas del producto.

## Fuentes de Hoja clínica
Public Sans (400, 600, 700), Source Serif 4 (400) y Atkinson Hyperlegible Mono (400), descargadas de Google Fonts el 02-11-2026. Se sirven desde el propio servidor, sin llamadas del navegador a Google. Licencias SIL Open Font License 1.1 conservadas junto a los archivos en `apps/shared/fonts/*-OFL.txt`. Fuentes: https://github.com/google/fonts/tree/main/ofl/publicsans, https://github.com/google/fonts/tree/main/ofl/sourceserif4, https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegiblemono.

## Lector QR integrado · 02-11-2026

jsQR 1.4.0, Apache-2.0, dependencia fijada en pnpm-lock.yaml. Fuente: https://github.com/cozmo/jsQR. Biblioteca y licencia servidas desde el mismo servidor (/jsqr.js y /jsqr.LICENSE), sin CDN ni envío de imágenes. Lectura de fotogramas en memoria del navegador; no atribuir compatibilidad física iPhone/Samsung sin prueba de cámara real.
