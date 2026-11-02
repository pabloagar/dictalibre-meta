# Fase 8 · Revisor Meta experimental

Implementado el 29-10-2026. Muse-Normal, Muse-streaming y Whisper local conservan su función ASR. Revisor Meta usa **muse-spark-1.3** mediante chat completions para revisar el texto final de una toma. No reconoce el audio ni certifica exactitud clínica.

## Uso
En dictado local (/live) y laboratorio, la casilla de revisión automática viene activada. Se captura su valor al iniciar cada toma; desactivarla afecta a las siguientes. Al terminar ASR y formato se muestra texto y se encola la revisión por separado. Se puede seguir dictando. Cada propuesta permite aceptar o rechazar; las alertas sensibles requieren escuchar/editar, sin botón de sustitución. Hay edición guardada por toma y deshacer. La toma original y el formato inicial nunca se sobrescriben.

El informe en vivo recibe cambios aceptados solo mientras su contenido siga coincidiendo. Si se editó por separado, aparece un aviso y se conserva ese informe: copiar manualmente el texto revisado. Reiniciar la sesión limpia la vista, no elimina el historial local del laboratorio.

## Contrato y límites
- Solo original ASR, texto formateado (o revisión humana actual) y glosario de la toma. No audio, referencias correctas de evaluación ni otras tomas.
- Cola serial independiente de ASR; petición con límite 30 s, cancelación y reintento manual. Fallar no invalida la transcripción. Reinicio marca pendientes como interrumpidas, no las reenvía.
- Prompt radiology-review-v1, JSON, hasta 8 fragmentos literales únicos, sin solapamiento. Máximo 8000 caracteres; cola hasta 100 pendientes.
- Validador local exige fragmentos existentes y transforma cambios de cifras, unidades, negaciones/lateralidad reconocidas en alertas sin reemplazo. Es una defensa parcial, no un detector exhaustivo de cambios clínicos: la aprobación humana sigue siendo obligatoria.
- No confianza inventada, no reescritura completa ni generación de diagnósticos. El LLM puede omitir errores o sugerir algo incorrecto; ausencia de observaciones no implica informe correcto.
- Snapshots y revisiones evitan aplicar propuestas sobre un texto modificado. Aceptar varios fragmentos de la misma revisión ajusta posiciones; editar/deshacer exige una nueva revisión para aplicar otras propuestas.

## Datos y dependencias
La misma clave local Meta, exclusivamente en backend. Con revisión activada, incluso Whisper local envía texto a Meta: se indica en la casilla. Sin revisión, Whisper sigue local. Catálogo, respuestas originales del LLM, historial, configuración y métricas quedan en data/local/lab (ignorado en Git). Exportación JSON completa; CSV revisiones por propuesta. No enviar esos archivos públicamente si contienen información privada.

Modelo y contrato: [Meta chat completions](https://dev.meta.ai/docs/protocols/chat-completions). reasoning_effort low, max_completion_tokens 3000, response_format json_object, temperatura por defecto. Se guarda modelo comunicado, uso de tokens si existe y hash de fuentes; no se afirma revisión inmutable del proveedor ni costo facturado.

## Verificación y pendientes
Tests locales: node --test tests/meta-review.test.mjs tests/lab.test.mjs tests/muse-stream.test.mjs. Incluyen contratos, guardas, cola, cancelación, persistencia, edición y activación automática tras ASR por archivo y streaming (proveedores simulados).
Piloto real: 7 textos sintéticos + tres transcripciones sintéticas ya guardadas. Resultados en EXPERIMENTS.md. Interfaz aceptar/deshacer comprobada con fixture aislada, sin alterar tus resultados.
Pendiente: aceptación física desde S25, valoración del médico de propuestas, corpus reservado con referencias humanas, falsas alertas/errores introducidos y costos. Fase 8 implementada para piloto, todavía en validación.
