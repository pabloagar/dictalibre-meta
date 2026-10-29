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
