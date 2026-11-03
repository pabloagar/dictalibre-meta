# Diez sesiones simultáneas · Render, 02-11-2026

Resultado directo: diez parejas independientes PC/teléfono simuladas por WebSocket, diez transcripciones Muse reales simultáneas y diez resultados con su marcador exclusivo; integridad de audio verificada en relay y ASR. Cero marcadores ajenos, diez intentos de cancelar una toma ajena rechazados (404), cero cupos residuales. Versión activa `2d8aaa80f4b0074d79c93900ce34455aa9635122`, deployment GitHub/Render 7506671636. Resumen numérico en [summary.json](summary.json).

Fuente: diez frases TTS no clínicas diferentes, una sola voz Microsoft Helena Desktop es-ES, PCM16 mono 48 kHz, entre 7,8145 y 8,2845 segundos; total 80,885 segundos de audio. Driver Node 24.22.1 en Windows, una sola máquina y conexión hacia Render y Meta. No micrófonos, personas ni navegadores físicos. Diez ASR alcanzaron ready antes de comenzar el audio; no mide la comodidad de iniciar desde un teléfono. Una repetición remota. Hardware, tipo de red del emisor, consumo CPU/RAM, precisión/sobrecosto del reloj y coste monetario no medidos (null).

## Protocolo y reproducción

Criterios fijados antes de cada corrida en protocol.json: diez activas, diez finales, audio exacto por hash, marcador exclusivo, aislamiento y liberación de cupos. Scripts públicos: `scripts/build-concurrency-corpus.ps1` y `scripts/test-demo-concurrency.mjs`; comandos en RUNNING.md. La prueba remota utiliza credencial existente por archivo temporal ignorado y se niega a comenzar si hay dictado activo. No se publica código de acceso, cookies, transcripciones, WAV ni archivos del laboratorio.

Evidencia completa local: `data/local/concurrency-render-20261102-v2`. El metadato build proviene de /api/state del servidor, contrastado con el despliegue. Métrica stopToDoneMs: desde envío del mensaje end del teléfono simulado hasta recepción de done del ASR en el PC simulado, reloj monotónico del driver; incluye red/relay/proveedor, excluye interfaz y captura acústica. No equivale a latencia física móvil ni benchmark general.

## Resultados desfavorables conservados

- Tres rondas locales con proveedor simulado: 30/30 correctas. El primer protocolo local marcó el commit base como build pese al árbol sucio; no atribuir esa ejecución al commit limpio. El driver se corrigió para build null con cambios locales; conserva hash de fuentes.
- Primera corrida local con Meta: 10/10 finales e integridad, 8/10 marcadores; el generador PowerShell había interpretado mal el UTF-8 sin BOM. Se corrigió su codificación y se generó un corpus nuevo. Segunda corrida local: 10/10 marcadores. No se borraron los resultados iniciales.
- Primer intento remoto: HTTP 401 al consultar estado después de login, sin tomas enviadas. Una comprobación posterior funcionó; se esperó la ventana de login y el segundo intento completó 10/10. Causa del 401 no establecida; no se atribuye como hecho al despliegue.

## Límites

Prueba corta de concurrencia e integridad, no validación clínica, resistencia prolongada ni prueba de diez redes móviles. No incluye carga simultánea del revisor Spark. Máximo configurable 1–10, una toma por visitante; el undécimo recibe aviso, sin cola automática. Audio diario compartido contado en vuelo; 60 minutos predeterminados, contador en memoria que reinicia con el proceso. Spark mantiene límites separados. No se modificó el plan Starter de Render ni se contrataron servicios.
