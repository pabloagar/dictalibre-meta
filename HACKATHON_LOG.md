# Bitácora del hackathon

Zona horaria de referencia: America/Santiago. Registrar hechos ejecutados; planes futuros van en `ROADMAP.md`. No reconstruir retrospectivamente avances no verificables.

## 2026-10-28 · Inicio documental

**Inspección realizada:** exclusivamente la carpeta nueva `C:\Users\pablo\OneDrive\Documentos\ChatGPT\DictaLibre Meta IA`.

- El listado inicial mostró únicamente `.git`.
- `git status --short --branch`: `No commits yet on main`.
- `git log -5 --format=fuller`: informó que la rama no tiene commits; es el estado esperado de este repositorio vacío.
- `git remote -v` y `git ls-files`: sin resultados. No existe remoto configurado ni archivos versionados.
- No había instrucciones `AGENTS.md` dentro de la carpeta inspeccionada.

**Trabajo realizado:** definición documental del MVP, módulos y contratos propuestos; fases y criterios de aceptación; metodología de evaluación; registro preliminar de dependencias y riesgos pendientes. Creación de los siete documentos base, `.gitignore`, `.gitattributes` y directorios vacíos reservados mediante `.gitkeep`.

**Verificación externa:** consulta de la página oficial del evento, fichas de Meta/Llama, repositorios de dependencias y documentación de captura web. Las referencias están en `README.md`, `ARCHITECTURE.md` y `THIRD_PARTY.md`. El enlace de condiciones del evento devolvió una pantalla de carga; no se verificó el reglamento completo.

**No realizado:** implementación funcional, instalación de dependencias, descarga/inferencia de modelos, grabación de audio, corpus, pruebas de rendimiento, commits, publicación pública o envío al concurso. No hay evidencia de mejora clínica o de reconocimiento.

**Siguiente paso previsto:** F1, verificar entorno y acceso con pruebas mínimas antes de construir módulos.

**Comprobación documental:** se verificó la existencia de los siete archivos requeridos y la resolución de sus enlaces Markdown locales. El inventario final contiene esos documentos, dos archivos de configuración de Git y seis `.gitkeep`. `git status --short` muestra los archivos nuevos sin versionar. No se ejecutaron pruebas de aplicación, ya que no existe código funcional.

## 2026-10-28 · Implementación inicial de fases 1 y 2

Tras discusión, el responsable fijó el S25 Ultra, pantalla encendida, interfaz abierta, micrófono preparado sin guardar/enviar fuera de toma, comparación de dos controles táctiles y transporte por Wi-Fi y 4G/5G desde el primer prototipo. Se adoptó navegador en ambos extremos y servidor de enlace WebSocket. Se reemplazó el roadmap inicial por diez fases; no se asumió aprobación de las decisiones de ASR posteriores.

Trabajo realizado: interfaces, AudioWorklet, PCM/WAV, emparejamiento temporal con confirmación, relay Node, validaciones de secuencia y hash, abortos visibles, señal sintética y scripts de demo. Dependencias fijadas e instaladas: ws 8.22.0 y qrcode-generator 2.0.4. cloudflared 2026.10.5 descargado de fuente oficial y verificado mediante SHA-256. Se inició un relay local oculto y un túnel HTTPS temporal, sin instalar servicio ni cambiar reglas del firewall.

Verificación: 17 pruebas automatizadas aprobadas; sintaxis aprobada; smoke test sintético público aprobado; emparejamiento y ambos controles de grabación probados en navegador con tono sintético. Resultados concretos en `EXPERIMENTS.md`.

Limitaciones: no se usó el micrófono del S25 Ultra ni se probó una red 4G/5G física; no se ejecutó ASR/Meta ni evaluación clínica; alojamiento permanente y repositorio público pendientes. La demo depende de que el equipo de desarrollo y el túnel sigan funcionando. No se declara terminada la aceptación en dispositivo.

Trazabilidad: primer commit local `e19577ff75718129b753974c925f33d86c01d9a8`, rama `codex/capture-transport`, creado efectivamente el 28-10-2026. Incluye código, pruebas, lockfile y documentación. `pnpm audit --prod --json` informó cero vulnerabilidades conocidas en las dos dependencias a la fecha de consulta; esto no equivale a una auditoría de seguridad del producto. La carpeta de trabajo quedó limpia tras ese commit; este registro y el resumen experimental se agregan en un commit documental posterior.

## Formato para próximas entradas

Fecha y zona; objetivo; archivos y commit real; pruebas ejecutadas y resultados; contribución nueva; dependencias usadas; fallos y limitaciones; siguiente tarea. Anexar enlaces a ejecuciones o artefactos cuando existan. Distinguir métricas de desarrollo y de prueba final. No registrar una tarea como terminada por haberla descrito.

## 2026-10-28 · Interfaz compacta e instrumentación
Por solicitud del responsable se retiró la casilla de uso sintético de ambas vistas, se redujo el espacio de cabecera y controles, y se dio prioridad visual al área de transcripción. Es una revisión provisional; no se registra aprobación del diseño final. El área de texto informa que ASR aún no está integrado.

Se implementaron calibración temporal celular/PC contra relay, telemetría por bloque, resúmenes P50/P95, tiempos de preparación/inicio/parada/hash/entrega y exportación JSON. Campos futuros ASR/Meta reservados como null. Ver METRICS.md para límites de precisión.

Verificación realizada: 22 pruebas automatizadas aprobadas; sintaxis aprobada; smoke público sintético aprobado el 28-10-2026 a las 18:57:38 UTC; prueba de navegador con tono 440 Hz, modos mantener (19 bloques) e inicio/parada (30 bloques), ambas con integridad verificada y métricas visibles. No se usó teléfono físico, micrófono real ni red celular. Se reinició únicamente el relay de la demo, conservando el túnel y su URL.

## 2026-10-28 · Criterio transversal de medición y primera evidencia del usuario
Se añadió AGENTS.md para mantener el requisito de instrumentación/comparación en cambios futuros y se amplió METRICS.md con metodología y metadatos pendientes. Se revisó y conservó dicta-metricas-4.json, con ficha de resultados y límites en experiments/results/2026-10-28-user-take-4. La audición satisfactoria y facilidad de conexión/QR son observaciones del usuario, no pruebas auditivas del agente. Se revisó el emparejamiento en backend/server.mjs para explicar la confirmación adicional; no se modificó ese flujo. Solo documentación y evidencia: no se ejecutaron nuevas pruebas de aplicación.

## 2026-10-28 · QR directo y tiempos de emparejamiento
Implementados token QR de 256 bits, caducidad/consumo conjunto con código manual, conexión automática al abrir enlace, confirmación exclusiva para código manual y exportación de tiempos de emparejamiento. 25 pruebas automatizadas aprobadas. Sin validación física de QR/S25 Ultra en esta revisión.
La revisión automática de permisos rechazó detener/reiniciar el relay de la demo, sin motivo específico adicional. No se reintentó la acción bloqueada. Activación del nuevo backend pendiente; interfaz compatible con backend previo para mantener el flujo manual existente.

## 2026-10-28 · Reinicio autorizado, nuevamente bloqueado
El usuario autorizó expresamente el reinicio. La revisión automática volvió a rechazar la acción antes de ejecutarla, sin motivo específico. El backend nuevo no quedó activado. Se creó scripts/Restart-Relay.ps1 para ejecución manual, con validación del proceso y carpeta, conservación del túnel y comprobación de salud; sintaxis PowerShell validada, ejecución pendiente. Las 25 pruebas locales pasan. La demo existente pasó la prueba pública de audio sintético a las 19:12:49 UTC; esto no valida QR directo en el backend público anterior.

## 2026-10-28 · Comprobación pública tras aviso de reinicio
Se añadió scripts/smoke-pairing.mjs para comprobar ambos accesos, bloqueo de audio previo a aprobación manual, consumo del token y envío de métricas. La ejecución contra la URL pública falló porque created no contiene token: sigue respondiendo el backend anterior. Inspección de solo lectura: PID 46512, iniciado 15:57:10 America/Santiago; backend/server.mjs modificado 16:10:01. No se afirmó activación ni validación del QR directo público.
La prueba pública manual con confirmación y audio sintético sí pasó (19:17:36 UTC, 10 bloques, 16000 muestras, hash coincidente). Las 25 pruebas locales pasan. Pendiente ejecutar correctamente el reinicio y repetir prueba pública de emparejamiento; no se reintentó detener el proceso tras los bloqueos anteriores.

## 2026-10-28 · Activación pública verificada tras reinicio manual
El usuario ejecutó correctamente Restart-Relay.ps1 desde CMD mediante powershell.exe -NoProfile -File. Se repitió smoke-pairing.mjs contra la URL pública: PASS QR y manual a las 19:19:12 UTC. QR autorizado sin approve; manual recibió pending, bloqueó inicio de audio antes de autorización y conectó después de approve. El token consumido fue rechazado y las métricas llegaron al receptor sin incluir el secreto.
Mediciones de clientes sintéticos: creación → autorización QR 292,6 ms, manual 447,5 ms; solicitud → autorización QR 0,162 ms, manual 160,785 ms. Son pruebas de protocolo con confirmación automatizada, no tiempos humanos ni de escaneo; el intervalo cliente de esta prueba comienza antes de enviar join y no antes de abrir WebSocket. No comparar directamente con métricas de la interfaz.
Prueba pública de transporte PASS a las 19:19:18 UTC: 10 bloques, 16000 muestras, hash coincidente. Pendiente comprobar escaneo físico y ergonomía en S25 Ultra. Se conserva el enlace de la demo.

## 2026-10-28 · Evidencia del usuario con celular 4G y PC Wi-Fi
Se revisaron y conservaron los dos JSON aportados en experiments/results/2026-10-28-4g-phone-wifi-pc, con hashes y condiciones declaradas. Validación de consistencia aprobada: 86 secuencias continuas, bytes, percentiles y emparejamiento coincidentes. Se registró éxito de QR/transporte en una toma; no se asumió aceptación completa ni red conocida para la toma anterior. Sin cambios de funcionalidad.

## 2026-10-28 · Dictados cortos y exportación de series
Por indicación del responsable se ajustó el caso principal a dictados de 2–10 s. Treinta segundos deja de ser requisito; tomas largas/5G son complementarias. Se actualizaron ROADMAP, METRICS, RUNNING y DEVICE_CHECKLIST sin reescribir la evidencia histórica. Se documentaron comprobaciones restantes y propuesta de primer ASR por toma, pendiente de discutir motor/contrato.
Implementado exportador metrics-batch.v1 con últimas cinco tomas iniciadas de la sesión, incluidos estados incompletos/activos; resumen por toma verificada con n explícito. Retención de audio ampliada a cinco. La nueva sesión deshabilita exportación previa. Historial no persistente.
Verificación: 26 pruebas automatizadas aprobadas, incluida retención de cinco, fallos, toma activa, agregación por toma y valores vacíos; sintaxis aprobada. HTML, desktop.js y metrics.js públicos comprobados con las nuevas versiones. No se ejecutó una nueva serie física ni descarga desde interfaz en esta revisión. No requiere reinicio de backend, sí recarga de vistas.

## 2026-10-28 · Investigación de transcripción, sin implementación
Se consultaron fuentes oficiales de Meta, Groq/Whisper, Speechmatics y ElevenLabs y referencias metodológicas de evaluación clínica en español. Se creó TRANSCRIPTION_PLAN.md con candidatos, límites de evidencia, módulos intercambiables, contratos, integración Meta y experimento pareado de dictados 2–10 s. Se enlazó desde arquitectura y actualizó estado de candidatos. No se instaló software, descargaron modelos/corpus, enviaron audios a proveedores ni ejecutaron inferencias. No hay ranking experimental propio ni aprobación final del motor.

## 2026-10-28 · Comparación de dos lotes del usuario
Conservados y analizados lotes móvil 4G/5G y Wi-Fi según orden declarado. Consistencia de métricas, secuencias y bytes aprobada. Diez tomas íntegras, Wi-Fi estable en confirmación final (280–290,6 ms), móvil con aumento hasta 4726 ms. Se documentó apoyo a Wi-Fi para demo, sin generalizar a hospitales ni modificar capacidades/configuración. No se ejecutaron nuevas grabaciones o inferencias.

## 2026-10-28 · Primer laboratorio de ASR, autorizado
Implementados carga WAV, reproducción, referencias y configuraciones versionadas, cola secuencial con cancelación, historial persistente, originales/diferencias, WER y exportación JSON/CSV. Servidor local 8789 independiente; relay público sin cambios. Instalados en .venv OpenVINO/GenAI y dependencias fijadas; descargada revisión pública FP16 de Whisper large-v3. GPU Intel Arc detectada y usada para inferencia real. Adaptador Muse según API oficial; no se dispone de credencial y no se afirma validación real.

Verificados desde navegador: carga de frase sintética y silencio, referencia, ejecución Whisper, persistencia tras reinicio del laboratorio y repetición. Frase reconocida con diferencia tres/3; silencio produjo «Gracias.», conservado como resultado adverso. 30 pruebas automáticas aprobadas al incorporar el laboratorio. Evidencia, fuentes y límites en LABORATORY.md y EXPERIMENTS.md. No se declara precisión radiológica ni ganador del contraste.

Verificación adicional: beams=3 reprodujo fallo remote_tensor de OpenVINO GPU; desactivar optimización SDPA no lo resolvió. Se bloquearon variantes >1 y preservó el fallo, sin fallback a CPU. Suite final: 31 pruebas aprobadas. Configuración local base continúa siendo la única validada; Muse permite versionar términos orientativos pero requiere acceso real para completar el contraste.

## 2026-10-28 · Captura conectada con Whisper
Implementado receptor local `/live`, puente al relay, importación de tomas íntegras, cola Whisper base y texto por toma. Medición fin recibido→texto directa y parada→texto estimada con relojes calibrados; exportación en sesión y laboratorio. Cancelación y asociación por ID, sin transcribir audio incompleto. Se renovó túnel caducado y se reiniciaron servicios de este proyecto. Prueba pública sintética con 56 bloques de frase de 5,54 s: integridad verificada, Whisper real, texto visible, ~2,52 s parada→texto estimada con modelo cargado. No equivale a prueba física del S25 Ultra. 32 tests automatizados aprobados. Muse sigue pendiente de clave.

## 2026-10-28 · Muse elegible para dictado
Por solicitud del responsable, selector Muse/Whisper en receptor local, motor congelado al inicio de cada toma y etiqueta por resultado. Se reutiliza clave en memoria y endpoints existentes sin reiniciar servicios. Comprobación con frase sintética de 5,54 s por relay público: 56 bloques e integridad verificada, tarea Muse creada, proveedor respondió HTTP 401. No hubo texto de Muse. UI explica autenticación y cómo reemplazar la clave localmente. Acceso real pendiente de resolver credencial; no se publica ni inspecciona su valor. Selección de Whisper sigue disponible.

## 2026-10-28 · Retorno desde laboratorio
Se hizo visible Volver al dictado en la cabecera del laboratorio y junto al formulario de Meta. Navegación por enlace local /live, sin reinicio del servidor ni cambios de credencial. Sustituye el enlace menos visible junto a exportaciones.

## 2026-10-28 · Diagnóstico de autenticación Meta
GET /v1/models ejecutado con la clave ya presente en memoria, sin mostrarla, exportarla ni reiniciar servidor. Respuesta 401, authentication_error, invalid_api_key (455 ms). Confirma rechazo de autenticación también en endpoint general; no es exclusivo del servicio de audio. Al cerrar el diagnóstico se produjo ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING y terminó el servidor; se perdió la clave solo en memoria. La comprobación posterior detectó la caída, por lo que no se considera conservada la credencial. Evidencia saneada en experiments/results/2026-10-28-meta-auth/models-check.json.

## 2026-10-28 · Credencial persistente solicitada por el responsable
Creado `.env.local` vacío, oculto en Windows y excluido de Git. Formulario guarda allí y actualiza la memoria; inicio carga el archivo. Nuevo botón de diagnóstico usa endpoint local POST /api/meta/check para consultar GET /v1/models sin exponer secretos. Se restauró el servidor tras la caída del diagnóstico anterior. No se recuperó ni inventó una clave: el usuario debe introducirla una vez. Tests verifican persistencia tras reinicio, rechazo de acceso HTTP al archivo, reemplazo/vaciado y respuesta saneada del diagnóstico. Archivo local en texto, sin cifrado propio.

## 2026-10-28 · Primera transcripción Muse exitosa
Tras guardar nuevamente la clave el responsable, GET /v1/models respondió 200 (1008 ms), autenticación válida y Muse listado. Una ejecución autorizada de lab-frase-sintetica.wav (5,542 s) con Muse base, español y sin keywords devolvió la frase de referencia completa: WER 0 en 13 palabras. Preparación 968 ms, petición 2214 ms y total de ejecución 3188 ms; cola 6 ms por separado. Resultado preservado en el laboratorio y experiments/results/2026-10-28-meta-auth/muse-synthetic-success.json. No se expuso la credencial. Una prueba de archivo no acredita latencia desde el celular ni precisión general. El build registrado corresponde al HEAD al arrancar el proceso, antes del commit de persistencia; se conserva sin reasignarlo al commit actual.

## 2026-10-28 · Comparación solicitada con Whisper
Ejecutado el mismo audio sintético de Muse en Whisper large-v3 OpenVINO Intel Arc GPU. Primera toma: 13,73 s total, incluyendo 11,22 s de carga. Repetición con modelo cargado: 1,94 s total. Ambas devolvieron la referencia con «3» en lugar de «tres» (WER literal 7,69 %, diferencia de representación). Muse anterior: 3,19 s total, WER 0. Verificados hashes originales y derivados idénticos y persistencia de ambas ejecuciones en el laboratorio. Metodología y límites en EXPERIMENTS.md; exportación conjunta sin secretos en experiments/results/2026-10-28-meta-auth/muse-whisper-comparison.json. No se modificaron motores ni configuración.

## 2026-10-28 · Comandos básicos y comparación de tomas
Implementado módulo determinista independiente es-basic-v1: punto, coma, dos puntos (incluido «2 puntos» del ASR), punto y coma, nueva línea y nuevo párrafo. Original inmutable, formato opcional, auditoría y duración persistidos, exportación JSON/CSV. Informe editable por tomas en orden, saltos entre tomas y enlace que abre comparación en otra pestaña con el mismo audio y motores base seleccionados. No se envía a ambos motores automáticamente al dictar.

39 pruebas automáticas aprobadas; sintaxis verificada. Control TTS Windows Helena de 7,08 s enviado por relay público en 71 bloques, integridad confirmada y Muse real: seis comandos aplicados, formato correcto, 1,61 ms de formato y ~4,08 s parada→texto estimados. Navegador IAB en PC, emisor sintético; no equivale a validación física del S25 Ultra. Comparación desde UI verificada. Se conservó una repetición Muse que duplicó «conclusión»; Whisper produjo «2 puntos», variante incorporada y comprobada en ejecución real. Whisper ya cargado produjo formato correcto (excepto representación 3/tres) en 2,11 s total. Auditoría en experiments/results/2026-10-28-dictation-commands/control.json. Las tomas reales del responsable y precisión de comandos en su voz siguen pendientes. Instrucciones, fuentes Dragon y límites en DICTATION_COMMANDS.md.

## 2026-10-28 · Comparación de tomas nuevas del responsable
Comparadas las cinco tomas de dictado nuevas (5,34–20,24 s) y una captura de 48 ms, una ejecución por motor y orden alternado. Las 12 finalizaron; Whisper cold=false y loadMs=0 en las seis. Verificados hashes originales y derivados idénticos por pareja. Total medio sin cola, solo cinco dictados: Muse 3118,77 ms, Whisper 3088,29 ms; mediana 3143,13 / 2873,93 ms. No hay referencias humanas, por lo que no se calculó precisión ni se eligió ganador. Los conteos de comandos no equivalen a aciertos. Originales, formato y métricas quedan en el laboratorio; informe detallado y JSON en data/local/lab/reports/2026-10-28-phone-commands (excluido de Git).
Incidente de selección: comparación de fechas incorrecta incorporó nueve audios anteriores. Se cancelaron trece ejecuciones pendientes; cinco adicionales ya completadas se conservaron, excluidas del análisis. La selección final quedó fijada por seis IDs explícitos. No se cambió código ni se reescribieron resultados.

## 28-10-2026 · Glosario y cantidades en cifras
- Completada comparación de cinco audios, dos repeticiones y tres configuraciones (30 ejecuciones), Whisper ya cargado. Guardados protocolo, originales, hashes, métricas y revisión local; resumen y límites en EXPERIMENTS.md.
- Incorporada etapa numérica determinista es-cardinals-v1 antes de los comandos, con original inmutable, eventos, advertencias, tiempos, control en laboratorio y exportaciones JSON/CSV. Pruebas automatizadas: 42 satisfactorias.
- Fine-tuning y streaming permanecen propuestas; no se implementaron en esta entrega. No se han validado clínicamente las salidas del piloto.
- Verificación posterior al reinicio: Muse y Whisper completaron la misma frase sintética (batch 038ad333-3f2c-4041-a1b2-5c8b1b75587f). Muse conservó «tres» en el original y mostró «3» en la etapa numérica; Whisper mantuvo su cifra 3. Comprobada la presentación del original y del texto numérico en el navegador. Whisper quedó cargado; esta prueba de arranque en frío se excluye de la comparación del glosario. Evidencia local: number-smoke.json.

## 28-10-2026 · Muse streaming opcional
Implementados transporte incremental local a Meta, borradores acumulativos, final único condicionado a integridad PCM, números/comandos solo sobre final, selección independiente de glosario y persistencia de audio/hipótesis/métricas. Muse por toma y Whisper siguen disponibles. Se comprobó Meta real con una frase sintética y el recorrido por relay/receptor del navegador; no equivale a prueba física del S25. Detalles en EXPERIMENTS.md y METRICS.md. Revisión clínica y experiencia con micrófono quedan pendientes del responsable.
- Comparación final del mismo WAV recibido por el navegador: Muse por toma y Whisper caliente completaron batch 42e92f89-f970-45f6-ae69-0963335d6710. Se conserva aparte la carga fría previa; Whisper queda cargado. Métricas y textos en catálogo y data/local/lab/reports/2026-10-28-streaming/same-audio-comparison.json. Los intervalos de sesión streaming y procesamiento por archivo no son directamente intercambiables.

## 28-10-2026 · Revisión de tomas streaming del responsable
- Revisadas seis tomas de micrófono con hashes verificados, conservando originales, números y eventos de comandos. Muestra seleccionada por IDs explícitos; no se infiere una toma ausente a partir de la numeración.
- Completadas 24 comparaciones adicionales: mismo audio, Muse por toma con glosario coincidente y Whisper ya cargado, dos repeticiones. Todas completadas; cold=false y carga 0 ms en las doce Whisper. Batch 1b6a2d53-4801-403c-b2b1-0d024aa43c76.
- Textos y métricas persistidos en el laboratorio y reporte local data/local/lab/reports/2026-10-28-streaming-phone/. Hallazgos y limitaciones en EXPERIMENTS.md. Sin cambios de funcionalidades, sin reinicio del servidor y sin sobrescribir resultados anteriores.

## 28-10-2026 · Cierre de jornada y corpus multivoz
- Incorporados nueve audios M4A aportados mediante ZIP, conservando originales/hashes y derivados. Guía páginas 1–2 inspeccionada; sin ejecutar sus instrucciones ni asumir que es una referencia oral exacta.
- Finalizada primera comparación de 18 ejecuciones Muse por toma/Whisper caliente; resultados y análisis guardados en el laboratorio y data/local/lab/reports/2026-10-28-multivoice/. No se ejecutó streaming con este corpus todavía.
- Actualizados estados obsoletos de README, ROADMAP y DICTATION_COMMANDS (autenticación y streaming ya resueltos). Prioridades: formato/comandos, evaluación con varias voces, robustez, editor persistente, sugerencias revisables y entrega reproducible. Sin cambios en el comportamiento de la aplicación.

## 28-10-2026 · Comparación multivoz streaming y plan original
- Completados 9/9 replays de los audios aportados a ritmo real, con comprobación PCM 9/9. Comparación preservada contra 18 resultados previos de Muse por toma y Whisper caliente. Reglas y glosario intactos.
- Guardados textos, parciales/finales, muestras de ritmo y métricas en catálogo del laboratorio y data/local/lab/reports/2026-10-28-multivoice/streaming/. Observaciones favorables y discrepancias clínicas documentadas; no se declara precisión sin referencia humana.
- Contrastado ROADMAP.md con el texto original de diez fases aportado por el responsable. Recuento explícito: tres operativas (1,2,4), cinco parciales (5,6,7,9,10), dos con función principal pendiente (3,8). Siete por completar, más aceptación de las operativas; no es estimación porcentual de trabajo. Actualizados orden de ejecución, puertas de cierre y calendario propuesto sin prometer toda la visión ni dar por verificada la hora oficial de entrega.

## 29-10-2026 · Definición de fase 3 para discusión
Creado PHASE_3_DISCUSSION.md con contexto, alternativas de segmentación, protocolo propuesto y decisiones pendientes para conversar en otro chat. No se modificó la aplicación ni se ejecutaron nuevas comparaciones; umbral de aceptación de latencia pendiente de acordar.

## 29-10-2026 · Contexto general para discusión externa
Creado PROJECT_CONTEXT_FOR_DISCUSSION.md con estado de las diez fases, evidencia y límites. Acordada nomenclatura conversacional Muse-Normal, Muse-streaming y Whisper local; aclarada en PHASE_3_DISCUSSION.md. Solo documentación: sin cambios de interfaz, motores ni nuevas inferencias.

## 29-10-2026 · Fase 3: segmentación opcional implementada
Implementado ENDPOINTING como opción de Muse-streaming, manteniendo cierre manual por defecto. Eventos por turnId, parciales reemplazables, finales sin duplicación y concatenación por orden de inicio. Se muestra borrador/consolidado por segmento sin aplicar comandos hasta finalizar la toma íntegra. Un cierre 1000 solo completa después de verificar PCM, enviar endStream y recibir finales de todos los turnos; fallos conservan evidencia sin promover parciales.
51 tests aprobados (7 nuevos: orden/duplicados, éxito, final ausente, cierre anormal, cierre prematuro, hash incorrecto y silencio). Sintaxis validada. Smoke real con frase sintética repetida y silencios explícitos: completed, 3 segmentos, integridad true; evidencia local reports/endpointing-1793285684603. Emparejamiento público QR/manual aprobado con clientes sintéticos. Laboratorio/relay/túnel de ayer estaban apagados y se iniciaron; interfaz verificada y preparada para grabación humana. Prueba física del responsable pendiente. No se declara cerrada fase 3.

## 29-10-2026 · Primeras tres tomas físicas con segmentación
Revisados IDs f3684560-22a7-407d-9007-bc997e239373, e159551e-021d-491a-b0a7-4e6bb86fac2b y 67884ac0-63b9-4dce-ac5b-ff99a80a7d5b. Tres completed con integridad true y glosario 20 términos; 6,58/7,73/8,65 s. Usuario comunica experiencia excelente. Una intervención por toma; ninguna acredita varios segmentos durante una toma física. Detener→texto estimado según captura 2,08/1,93/1,62 s. Texto muestra 2,5 centímetros y atelectasia laminar basal derecha con salto aplicado. Tercera contiene «No se observan derrame pleural»: pendiente escuchar referencia para distinguir lo pronunciado de error ASR; sin corrección automática. Sin nuevas inferencias ni cambios de reglas. Evidencia local data/local/lab/reports/2026-10-29-phone-endpointing/review.json. Fase 3 continúa en validación.

## 29-10-2026 · Recuperación tras ocultar pantalla y reinicio de sesión
Revisión: visibilitychange ya abortaba toma y liberaba micrófono; se añadió explicación al volver y botón Reactivar micrófono si sigue emparejado. Sesión cerrada invalida paired y cierra cliente. Reiniciar sesión en móvil libera recursos y limpia indicadores/código; necesita nuevo QR. En PC nuevo botón limpia pantalla mediante recarga y crea nueva sesión/QR; nueva sesión limpia además informe editable. No elimina audios/resultados del laboratorio. Corregido aviso móvil obsoleto de ausencia de IA.
Diagnóstico móvil exportable de últimos 100 eventos de visibilidad, conexión y preparación; sin audio ni token. 52 tests aprobados, incluida simulación de ocultar/volver/reset; sintaxis y HTML servido PC/móvil comprobados. No se verificó bloqueo físico en S25 en esta revisión. Cambios estáticos requieren recarga de ambas páginas, sin reiniciar backend ni interrumpir servicios.

## 29-10-2026 · Recuperación de túnel público
Ante imposibilidad de abrir desde otra Wi-Fi, se comprobó salud local HTTP 200 y fallo DNS del enlace público anterior. Log cloudflared registra Unauthorized: Tunnel not found. No se atribuye el fallo a la Wi-Fi del usuario. Se preservaron estado/log anteriores en .runtime, validaron procesos y renovaron relay/túnel del proyecto. Nuevo origen travels-cad-cameras-shop.trycloudflare.com; laboratorio y datos conservados. Smoke público QR/manual aprobado a 18:48:59 UTC. Se requiere nueva sesión/QR; la estabilidad del alojamiento temporal sigue pendiente.

## 2026-10-29 · fase 8 Revisor Meta
Implementación nueva: adaptador muse-spark-1.3, cola independiente, activación por toma en laboratorio/en vivo, propuestas ancladas, guardas sensibles, aceptar/rechazar/editar/deshacer, historial y exportaciones. Clave existente backend, no expuesta. Pruebas reales: 7 casos de texto sintético y 3 transcripciones sintéticas existentes (sin cambios aplicados); protocolos/resultados locales detallados en EXPERIMENTS.md. Interfaz aceptar/deshacer comprobada en fixture aislada. Se corrigió propagación del interruptor en streaming y se agregaron pruebas de activación por archivo y streaming. No se alteraron reglas ASR, números ni comandos. Estado piloto, no validación clínica; trabajo sobre árbol con cambios locales, no atribuido a commit limpio.


Verificación final de esta implementación: 58/58 pruebas automáticas aprobadas y scripts/check.mjs sin errores de sintaxis. Laboratorio reiniciado solo tras verificar ausencia de trabajos ASR/revisión activos; revisiones previas conservadas. No se hizo prueba física nueva del teléfono.

## 2026-10-29 · editor con plantillas y evaluación multivoz del revisor
Implementación nueva de fase 9: modelo de edición con destinos por toma, borrador streaming en el informe, plantillas locales, restauración/cancelación, deshacer, copia y exportación de mediciones. Prueba de navegador aislada confirmó sustitución seleccionada, cursor desplazado sin cambiar destino, deshacer exacto, portapapeles con saltos y persistencia tras recarga. Sin nueva prueba física del teléfono ni integración RIS.
Se predefinió y encoló evaluación de Revisor Meta sobre 27 resultados ASR existentes (9 audios × 3 motores); no se repitió ASR, no se enviaron referencias ni nombres de archivo al LLM, no se cambiaron reglas ni se aplicaron propuestas. Resultados completos y fallos se conservan en data/local/lab/reports/2026-10-29-review-multivoice. No se declara grupo reservado independiente: estos audios ya fueron examinados.

Cierre técnico del cambio: suite 66/66, 25/27 revisiones reales aceptadas por validador y 2 fallos conservados. Resumen y textos pendientes de valoración humana en reporte local. Servidor actualizado después de finalizar todas las revisiones. Fases 8/9 siguen en validación; falta prueba física y juicio clínico.

La prueba de escritura manual detectó un problema de cursor tras un salto final; se corrigió el render del salto y se verificó Primera.\nSegunda. en el navegador antes de entregar. Cancelación restaura selección; el estado lo indica expresamente.

## 2026-11-01 · recuperación de acceso e importación completa
Se constató que laboratorio y relay estaban detenidos; estado anterior respaldado, túnel temporal nuevo y servicios levantados. URL pública nueva salmon-runs-subscribers-jeans.trycloudflare.com, PC en localhost:8789/live. Health y rutas 200; pruebas sintéticas públicas QR/manual/audio aprobaron. Son sondas de software, no prueba física del S25. UTC real de sondas 2026-10-31T08:17Z conservado en evidencia; fecha de esta entrada según contexto actual del responsable.
Se indicó protocolo de cinco tomas (reemplazo, deshacer, cifras, pausa/comando y repetición con ruido). Condiciones comunicadas por el responsable: internet del PC compartido desde celular y aeropuerto ruidoso; tecnología móvil, dB y rendimiento físico no inferidos.
Biblioteca completa importada, buscador/categorías/favoritas/vista previa implementados. Validación aislada en 8792. El responsable respondió «Sigo probando; espera a que termine»: NO se reinicia el laboratorio principal ni se recarga su página. Activación pendiente hasta aviso de término/exportación; no presentar biblioteca ya activa en su sesión.

Verificación de biblioteca: 67 pruebas Node + 5 Python aprobadas; sintaxis y diff sin errores. Activación principal continúa pendiente por instrucción explícita del responsable; no se reinició durante sus grabaciones.

## 2026-11-01 · nueva recuperación de acceso y revisión general
Ante «No me carga dicta libre», se comprobó laboratorio/relay locales HTTP 200 y fallo DNS ENOTFOUND de salmon-runs-subscribers-jeans.trycloudflare.com. El log registraba Unauthorized: Tunnel not found. Se preservaron estado/log/protocolo en data/local/operations/20261101-183146; se renovaron únicamente túnel y relay del proyecto. Nuevo origen governance-unavailable-following-cosmetic.trycloudflare.com. Laboratorio conserva PID 30212 y datos; biblioteca pendiente de activar. Sondas públicas QR directo, código manual con confirmación, rechazo de token usado y transporte de tono íntegro aprobaron; puente WebSocket del laboratorio también. No es una prueba física nueva del S25.

Revisión estática y diagnóstico de recursos sin inferencias: añadido scripts/audit-resources.mjs y ejecutado con protocolo previo; evidencia agregada en data/local/audits/2026-11-01T21-33-52-665Z. 55 audios/167 ejecuciones/35 revisiones; respuesta de estado 1.220.916 bytes. Identificados sondeos redundantes por tarjeta, retención que no recorta tarjetas con botones, guardado síncrono completo, historial de edición sin límite y límites de medición/versionado. Hallazgos, mediciones, pruebas físicas y correcciones propuestas en CODE_REVIEW_2026-11-01.md. No se aplicaron esas optimizaciones durante la grabación. ROADMAP actualizado a 3 fases operativas y 7 parciales/en validación, manteniendo cortes históricos. Verificación nueva: sintaxis del diagnóstico y ejecución local; suite funcional previa no repetida durante pruebas del responsable.


## 01-11-2026 · consultas compartidas y retención corregidas
Implementado sharedState con una petición en vuelo y caché de 150 ms compartida por consumidores de la página. Paneles de revisión comparten un temporizador de 1,5 s; se retiran suscripciones desconectadas. Laboratorio y espera de transcripción usan la misma función. Retención cuenta solo tarjetas directas .clip, conserva cinco elegibles y protege trabajo/edición pendiente; al guardar una edición se vuelve a recortar. El historial del laboratorio no se borra.
Comparación controlada: cinco paneles, veinte intervalos virtuales, baseline reconstruido de sondeos independientes 100 solicitudes frente a 20 ejecutando código nuevo (80% menos). Evidencia data/local/audits/polling-2026-11-01. No es tráfico de navegador capturado ni reducción medida de latencia ASR; no se redujo tamaño de /api/state ni se optimizó persistencia. node --test tests/review-polling.test.mjs reproduce pruebas de consultas, reintento y retención; suite completa 70/70 y sintaxis aprobadas. Cambios estáticos: recargar PC después de exportar; laboratorio no reiniciado y biblioteca sigue pendiente.

## 01-11-2026 · propuesta visual del editor
Analizada jerarquía de interfaz; creada maqueta independiente design/dictation-workspace.html con dictado simulado y revisión lateral, fuente ajustable y controles secundarios agrupados. Verificada visualmente en navegador, capturas guardadas. No se modificó sesión ni editor productivo. Stitch no entregó diseño/vista previa pese a intentos en conectores; limitación registrada en design/README.md junto a protocolo de evaluación UX pendiente. Los 800 ms de simulación son deliberados, no mediciones ASR.


## 01-11-2026 · disposición enfocada integrada y biblioteca activada
Implementada focused-workspace-v1 en /live, reutilizando editor y manejadores existentes: informe 24 px ajustable, controles compactos, plantillas/ajustes desplegables, tomas/Revisor en panel lateral y diagnósticos conservados. Muse-streaming seleccionado al entrar cuando Meta está configurado; demás motores disponibles. Borrador permanece en destino original, sin nuevo autoscroll ni cambios ASR. Tras autorización explícita del responsable se respaldó catálogo y reinició solo laboratorio; API confirma 285 plantillas. UI comprobada: biblioteca/búsqueda torax, edición/deshacer y abrir/cerrar revisión. Suite 70/70 y sintaxis aprobadas; prueba física S25 pendiente. Evidencia agregada data/local/audits/focused-layout-2026-11-01/verification.json y captura design/dictado-implementado.png con texto sintético escrito manualmente y luego deshecho. No es resultado ASR.


## 01-11-2026 · conexión inicial y laboratorio más legibles
Cambio estático: bloque inicial destacado con botón Conectar teléfono y explicación QR; al emparejarse se contrae y queda estado a izquierda. Conserva botón/ID/controladores del transporte. Laboratorio: búsqueda de audios con conteo visibles/seleccionados, listas de altura acotada, ejecución antes de biblioteca, referencia/resumen/historial plegables, métricas/formato/revisión bajo detalle de cada resultado. Fallos y originales conservados. 70/70 tests y sintaxis aprobados; comprobación visual pendiente por fallos de herramientas: IAB no adjuntó pestañas, Chrome recibió rechazo de origen y servidor auxiliar de verificación fue bloqueado por política automática. No se cambiaron guardas del backend. Stitch no entregó pantalla; listado posterior sin pantalla nueva. Evidencia agregada data/local/audits/lab-layout-2026-11-01/verification.json. Sin reinicio ni nuevas inferencias.


## 01-11-2026 · comprobación de publicación y bases
Comprobación read-only: git remote vacío; 55 rutas modificadas/no seguidas; último commit local 28d75be del 28-10-2026. Búsqueda GitHub conectada DictaLibre sin repositorios devueltos (no prueba inexistencia universal). No se creó repositorio, commit ni publicación en esta revisión. .env.local y catálogos privados ignorados; aún falta auditoría de secretos en historial/archivos antes de publicar. No se encontró LICENSE/COPYING en raíz. README actualizado para no describir Revisor/streaming implementados como pendientes. Página oficial https://dev.meta.ai/events/global-hackathon accesible y mantiene cierre 4 noviembre 21:00 ET; enlace de reglas/waiver no accesible con herramienta. Exigencia de repositorio público y demás principios comunicados por responsable se mantienen; no se declara verificación integral de las bases. Prioridad de entrega: auditar contenido publicable y licencias, registrar cambios reales sin retrofechar, publicar repo público y comprobar instalación/documentación.


## 2026-11-01 · Preparación de publicación pública
Revisión del árbol candidato y de todo el historial alcanzable (246 blobs en primera pasada), patrones de credenciales, coincidencia de clave local sin mostrarla y 285 plantillas privadas: sin hallazgos en esa pasada. Exclusiones ampliadas para audio/archivos privados y capturas de diseño. Documentación actualizada para separar estado operativo de entradas históricas. Se conservan fechas originales; cambios acumulados se registran con fecha real, sin backdating. Bases completas/licencia exigida no verificables desde el enlace accesible: pendiente explícito en PUBLICATION.md. No se reinició el servicio ni se ejecutaron inferencias durante esta preparación.
