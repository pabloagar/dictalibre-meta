# Mediciones del prototipo

## Criterio permanente de desarrollo
Por solicitud del responsable, cada etapa medible debe incluir mediciones útiles para comparar alternativas. Si aún no puede instrumentarse, dejar definidos sus puntos de inicio/final, unidades, limitaciones y pendiente explícito. Este criterio forma parte de la aceptación de las próximas fases, no solamente del transporte.

Para cada experimento registrar hipótesis, variante, commit/build comprobado, configuración, entorno, fecha, fuente de audio, repeticiones, errores y resultados. Comparar bajo condiciones equivalentes, preferentemente alternando variantes; conservar muestras por toma y resúmenes, sin confundir muchos bloques de una sola toma con muchas repeticiones independientes. Medir también el sobrecosto de la telemetría cuando pueda afectar el resultado.

Pendiente en el exportador actual: identificador único global de ejecución, build/commit, configuración versionada y metadatos de dispositivo/red declarados. Hasta incorporarlos, acompañar los JSON con una ficha; los datos desconocidos permanecen como desconocidos. La persistencia automática entre sesiones tampoco está implementada: exportar conserva la evidencia.

## Estado actual
Implementadas el 28-10-2026. Se muestran para la última toma, con P50, P95 (rango más cercano), máximo y cantidad de muestras en JSON. Exportación manual en «Mediciones y diagnóstico». Sin audio, texto ni códigos de emparejamiento. Hasta 6000 bloques por toma y cinco trazas en memoria; una recarga borra estos datos.

| Medición | Inicio → final | Limitación |
| --- | --- | --- |
| Llegada estimada | Envío del bloque en celular → recepción en PC | Relojes calibrados contra el relay; no es latencia acústica |
| Confirmación PC | Envío en celular → recepción de confirmación del PC en celular | Un único reloj monotónico; incluye ida y vuelta y procesamiento |
| Audio por bloque | Muestras / frecuencia | Duración del audio contenido, no tiempo de ejecución |
| Servidor | Entrada de bloque → preparación del reenvío | No incluye transmisión saliente |
| Intervalo de llegada | Recepción anterior → recepción actual | Variabilidad de entregas, no jitter de captura |
| Preparación | Solicitud de preparación → grafo listo | Incluye espera del permiso cuando corresponde |
| Inicio | Orden de inicio → respuesta del AudioWorklet | No mide latencia física del micrófono |
| Parada | Orden de parada → bloque final vaciado | Sin muestra si parada automática al límite |
| Integridad | Cálculo SHA-256 en cada extremo | Medido separadamente |
| Entrega final | Parada → confirmación de integridad en celular | Incluye vaciado, hashes y red |

También se registran bytes PCM + cabeceras, bloques, cola de salida del celular, duplicados idénticos detectados por el relay, errores de secuencia y bloques sin estimación. Los bytes no incluyen TLS, TCP ni mensajes de control. Las pérdidas no se infieren a partir de la red TCP: una interrupción marca la toma incompleta y conserva el motivo, sin inventar cantidad de muestras perdidas.

## Relojes y precisión
Tres intercambios iniciales y luego uno cada cinco segundos. Se conserva el menor RTT entre las últimas ocho muestras con menos de treinta segundos. Desfase: ((servidor recibe − cliente envía) + (servidor envía − cliente recibe)) / 2. RTT descuenta el procesamiento del servidor.
La resolución orientativa suma medio RTT por extremo y una provisión de deriva de 200 ppm por edad de calibración. No es intervalo de confianza ni cota garantizada. Una ruta asimétrica sesga la estimación. Valores negativos se conservan como rawEstimateMs, pero se excluyen del resumen; falta de calibración se representa con null, nunca cero. Dos navegadores en un PC no validan relojes o conectividad del S25 Ultra.

Base metodológica: [RFC 5905](https://www.rfc-editor.org/info/rfc5905/) y [performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now). Implementación de calibración propia y simplificada; no es un cliente NTP.

## Próximas etapas
El esquema reserva asrQueueMs, asrRunMs, firstTextMs, finalTextMs y suggestionMs como null. Conectar sus puntos de medición al implementar ASR y Meta. No se ha medido precisión médica ni generación de texto.

## Prueba reproducible
Ejecutar node --test tests/*.test.mjs. Después emparejar dos navegadores, preparar tono de diagnóstico y completar una toma con cada control. Abrir diagnóstico y exportar JSON después de cada serie de hasta cinco tomas. Repetir en S25 Ultra, Wi-Fi y 4G/5G, cinco tomas de 2–10 segundos por control y condición, anotando versiones y red fuera del archivo automático. Comparar P50/P95, integridad, errores y estimaciones no disponibles; separar tono y micrófono real.


## Emparejamiento QR/manual
Implementado: token aleatorio de 256 bits para QR/enlace, temporal (120 s) y de un solo uso; almacenado como hash en el índice del relay. Viaja en el fragmento URL y se retira de la barra antes de conectar. No activa el micrófono automáticamente. Consumir QR o código invalida ambos accesos; el código manual conserva confirmación del PC. El enlace copiado tiene la misma capacidad de conexión directa que el QR.

Mediciones exportables por separado antes de grabar y anexadas al JSON de audio:
- createdToPairedMs: creación en servidor → autorización, incluye tiempo humano para escanear/escribir.
- requestToPairedMs: solicitud recibida en servidor → autorización.
- confirmationWaitMs: espera manual en servidor; null para QR.
- mobileConnectToPairedMs: inicio de conexión WebSocket en celular → recepción de paired, incluye apertura/red y espera manual.
Todos usan un solo reloj monotónico por intervalo. No miden el inicio del escaneo ni la carga inicial de la página. No incluyen tokens/códigos en exportación. Pendiente: registro persistente de intentos fallidos y tiempo de apertura/escaneo. No interpretar una conexión exitosa como ausencia de intentos previos.

Hipótesis para comparar: QR reduce tiempo humano y pasos frente al código manual. Ejecutar diez emparejamientos alternados por método en el mismo dispositivo/red; exportar cada resultado, registrar fallos aparte y comparar medianas/P95 por sesión. No comparar requestToPairedMs de QR con latencia de red: es solo autorización interna del servidor.

## Exportación de series (implementada)
El botón exporta dicta-libre.metrics-batch.v1: hasta cinco tomas iniciadas más recientes de la sesión, sus bloques/etapas y el emparejamiento. Incluye tomas incompletas o activas identificadas como tales. Exportar al finalizar la serie para tener confirmaciones completas. El resumen separa cantidades verificadas/incompletas/activas y calcula tiempos sobre tomas verificadas, con una observación por toma; no mezcla todos los bloques ni da más peso a dictados largos. perTakeAckMedianMs resume las medianas de cada toma, no el percentil global de bloques. null conserva mediciones ausentes y n indica cuántas existen. Cinco tomas dan una impresión exploratoria.

Se conserva un máximo de cinco audios y cinco trazas; recarga o nueva sesión borra el historial. Sin migración de tomas anteriores a la recarga, ni persistencia automática. Las cifras principales de la pantalla siguen correspondiendo a la última toma.
# Instrumentación del laboratorio ASR · 2026-10-28

Extensión en vivo: `receiveEndToTextMs` mide desde recepción de `end` hasta actualización DOM del texto usando un reloj del PC; incluye verificación, importación, cola, preparación, inferencia y polling (250 ms nominal, sujeto a throttling de pestañas). `stopToTextEstimateMs` resta marcas calibradas al reloj del relay, desde orden de parada del emisor hasta actualización DOM. `clockUncertaintyMs` suma resolución orientativa de ambas calibraciones: NO es intervalo de confianza ni garantía de error. No mide presentación física en pantalla. Calibración ausente/negativa produce null. Campos `asrQueueMs` y `asrRunMs` son cola del servidor y petición al motor. Se conservan `firstTextMs`/`finalTextMs` null por su semántica anterior no definida; los nombres nuevos tienen intervalos explícitos.

Calibración de parada transportada en `end`, solo números finitos y edad inferior a 30 s. La parada automática sin orden táctil usa el vaciado del worklet, no una interacción inexistente. Receptor público antiguo no ejecuta ASR. El puente loopback añade tránsito a la calibración, incluido en RTT; la asimetría de red puede sesgar la estimación.

Semántica y límites completos en [LABORATORY.md](LABORATORY.md). Cada ejecución registra cola, preparación, petición, carga/generación locales cuando observables, total, estado, hash de original/derivado, configuración, revisión y fuentes. RTF de petición agregado en la versión final. Referencias y resultados no se sobrescriben; puntuación visible contra última referencia, snapshot histórico disponible. Ausentes: primera palabra (sin streaming), memoria, coste real, red/servidor Muse desglosados y latencia de captura a texto. Se mantienen null; no se infieren del RTT. P50/P95 exploratorios incluyen cargas frías, identificadas por ejecución; no comparar esos resúmenes como rendimiento sostenido.


## Formato por comandos
Véase DICTATION_COMMANDS.md. commandMs mide transformación del original a formato y construcción de auditoría con reloj monotónico; incluido en totalMs. Se exportan versión, eventos, dudas, original y resultado. No hay tiempos por palabra ni exactitud automática de comandos. Las métricas live incluyen formato y actualización DOM, no presentación física de pantalla. Exportación CSV incluye commandMs y cold para separar carga inicial de uso habitual. Sobreprecio temporal de instrumentación no calibrado; no sumar commandMs a totalMs.

## Normalización numérica
numberFormatMs mide exclusivamente la etapa determinista con reloj monotónico, incluyendo auditoría; está incluido en totalMs, sin sumarlo nuevamente. numberFormatting guarda version, text, events, warnings y elapsedMs; numbersEnabled registra la selección. CSV incorpora numericText, numberVersion, numberWarnings y numberFormatMs. Los offsets de comandos se refieren a formatting.input, que puede ser numberFormatting.text o text. No hay una métrica de exactitud numérica validada sin referencia humana. Sobrecosto del reloj no calibrado.

## Métricas de streaming · versión inicial
Todas las duraciones del servidor usan performance.now; los tiempos del navegador usan su propio reloj. No se restan relojes distintos.
- handshakeMs: inicio aceptado por servidor local → confirmación de sesión Meta.
- firstPartialMs: inicio aceptado por servidor → primer parcial no vacío. Incluye conexión y silencio inicial; no es tiempo desde inicio físico del habla.
- live.startToFirstPartialMs: inicio recibido en navegador → actualización DOM del primer parcial no vacío. Exportado también en las métricas de sesión.
- endToFinalMs: end recibido en servidor (audio verificado) → final Meta; incluye vaciado de cola.
- endStreamToFinalMs: envío endStream a Meta → final Meta.
- streamSessionMs: inicio aceptado → final/error; incluye duración del dictado. totalMs/requestMs se dejan null para no mezclar con procesamiento por archivo.
- partialCount, duplicatePartialCount y revisionCount: hipótesis provisionales, idénticas a la anterior y cambios que no son mera extensión de prefijo. No son métricas de exactitud ni duplicación clínica.
- maxBufferedAudioMs, resampleMs, inputDurationMs, sentAudioMs y providerAudioProcessedMs: cola máxima, tiempo de remuestreo, duración de entrada/enviada y progreso informado por proveedor. El progreso no es un timestamp por palabra.
- integrityVerified: comparación de hash PCM original al recibir end. Sin verificación no se acepta final.

JSON conserva eventos con texto y tiempos; CSV incorpora modo y tiempos/conteos principales. No se calcula latencia física de micrófono/pantalla ni coste real. El sobrecosto de instrumentación no está calibrado. Las medidas con reproducción sintética no representan una prueba de red Wi-Fi o del S25.

## Segmentación Muse-streaming (29-10-2026)
Configuración congelada por toma: segmentation manual/automatic y providerMode PUSH_TO_TALK/ENDPOINTING. stream.segments conserva turnId, texto original, tiempos monotónicos relativos al inicio backend, audioProcessedMs del proveedor y estado incompleto. endToCompleteMs = recepción speechComplete menos recepción speechEnd (ms); NO mide pausa acústica ni latencia desde fin real del habla. endToFinalMs incluye vaciado de cola y cierre del proveedor después de parada. segmentCount cuenta turnos iniciados, incluso incompletos en fallos; duplicateSegmentFinals registra finales idénticos repetidos. Campos ausentes null. Sin timestamps por palabra ni confianza inventada.
Eventos/segmentos persisten en JSON del laboratorio y métricas de toma; CSV actual no aplana el detalle por segmento. Registro y envío al cliente O(n) por snapshot con límite de 4000 eventos/180 s. Sobrecosto total de snapshots/render no aislado aún: medir con replay instrumentado/no instrumentado antes de afirmar mejora fina de latencia. No modifica ni recorta PCM. Eventos del servidor y reloj del emisor son intervalos distintos.

## Recuperación de visibilidad, 29-10-2026
Hipótesis: al volver a la página el usuario puede identificar reactivación o necesidad de emparejar, sin captura automática. Prueba reproducible: node --test tests/mobile-lifecycle.test.mjs; criterio: ocultar toma activa emite abort/libera pista, regresar no activa grabación y reset no reutiliza token. Simulación aprobada; ejecución física pendiente.
Diagnóstico dicta-interrupciones.json exporta últimos 100 eventos (solo navegación actual, en memoria): type, atMs monotónico desde navegación, recordingId local o null, paired; hiddenDurationMs visible menos hidden y prepareMs inicio preparación→micrófono listo. Red null; navegador reportado por userAgent. No mide tiempo de desbloqueo del sistema ni garantiza evento antes de suspensión abrupta. Sobrecosto de push/export no aislado, pendiente perfilado si se compara latencia fina; exportar antes de recargar. Medición de tiempo total de recuperación/reemparejamiento pendiente del ensayo físico. Backend conserva sourceHash de inicio; cambios estáticos posteriores se documentan aquí, no se atribuyen al hash antiguo como si los incluyera.

## Fase 8 · revisión de texto Meta (29-10-2026)
Hipótesis: detectar confusiones puntuales sin aplicar cambios silenciosos. Criterio técnico: original inmutable, propuestas ancladas, datos sensibles reconocidos sin sustitución, fallos aislados y trazabilidad. No hay umbral clínico de latencia/precisión aprobado.
Medidas directas en ms, performance.now backend: queueMs desde encolado hasta inicio; requestMs desde llamada al adaptador hasta respuesta/error; validationMs parseo y validación (null si no llegó); totalMs inicio del trabajo hasta resolución, EXCLUYE cola e incluye sobrecosto de guardado inicial. Latencia desde encolado aproximable como queueMs+totalMs, no latencia acústica. La petición incluye red y proveedor, no inferencia pura. Uso tokens ausente null; no costo estimado por tokens sin tarifa validada.
uiMeasurements.shownAfterTextMs: montaje del panel de toma hasta observación DOM de revisión completa; reloj browser, incluye sondeo 1,5 s. context live-final o laboratory-history; una reapertura NO mide latencia original. Medidas anteriores sin context no sirven para esa comparación. No garantiza tiempo hasta píxel físico. Hasta 10 observaciones por revisión, no repeticiones independientes. Navegador/red/dispositivo de estas medidas no recolectados: no inferirlos; metadata ausente null. Sobrecosto de serialización, archivos y render no aislado: pendiente perfilado pareado antes de comparar diferencias pequeñas.
Cada revisión conserva runId, baseRevision/texto, hash de entrada, prompt/config/hash, sourceHash y build; JSON incluye decisiones e historial. El hash corresponde al inicio del servidor, no equivale a commit limpio. CSV ofrece resumen por sugerencia; JSON conserva detalle y valores null. No se añadió analítica externa.


Resolución efectiva del reloj performance.now no calibrada en este piloto; los decimales exportados no implican esa precisión física. La comparación clínica requiere anotación humana y medición separada de falsos positivos/errores introducidos: todavía pendiente, no inferida de respuestas completas.

## Fase 9 · editor anclado (29-10-2026)
Hipótesis antes de aceptación: dictar/reemplazar dentro de plantilla preserva el resto del informe y permite revertir. Criterio técnico: cero cambios fuera del destino en fixtures, cero finales duplicados y restauración exacta al cancelar/deshacer. No prueba seguridad clínica global.
Exportación dicta-editor-metricas.json: versión anchored-report-v1, build/hash de inicio backend, userAgent, red/dispositivo null, eventos hasta 1000 de la navegación. atMs performance.now desde navegación; preview.elapsedMs y final-insert.elapsedMs miden modificación del modelo + actualización DOM + guardado local hasta retornar (no píxeles físicos ni latencia del habla). anchorToFinalMs incluye dictado/red/ASR/cola y es tiempo desde reservar destino hasta inserción, no tiempo de inferencia. copy.elapsedMs desde solicitud hasta resolución del portapapeles, no hasta pegar en RIS. También registra bloqueo, cancelación, deshacer, plantilla guardada/cargada, edición e inserción pendiente. RunId en finales permite vincular ASR; ausente null en simulación. Sin texto clínico ni nombre de plantilla en eventos.
Eventos se conservan además en localStorage como último registro de navegación; una nueva navegación con actividad reemplaza ese registro. Exportar antes de cambiar de sesión/navegador. No se suben al catálogo automáticamente. Métricas de plantillas solo conteo de caracteres, no identidad del contenido: comparación entre plantillas requiere protocolo externo. Resolución efectiva y sobrecosto de reconstrucción DOM/localStorage no calibrados; pendiente comparación instrumentada/no instrumentada con informes largos y medición física de pantalla. Tiempo de composición IME, si ocurre, no incluido en elapsedMs de inserción; se espera al fin de composición para no pisar escritura.

## Biblioteca completa · sesión de importación
Hipótesis/criterio previos en data/local/templates/protocol.json: todos los archivos inventariados, originales intactos, separación sin pérdida de caracteres, variantes distintas conservadas. 603 archivos + 354 miembros ZIP; 285 textos únicos, 732 duplicados exactos agrupados, 40 referencias y 12 archivos de bloqueo Word. Última pasada elapsedMs=21023,69: inicio importador→fin extracción/dedupe/verificación de originales, antes de escribir catálogo final. No es medición de carga de UI. Cada entrada registra lectura/extracción/trans formación elapsedMs; contenedores ZIP incluyen sus hijos, no sumar intervalos como independientes. Tres pasadas de desarrollo, no benchmark homogéneo; versiones previas conservadas. Reloj perf_counter, resolución/sobrecosto no calibrados, red null, fuente local. Comprobar hash del script en protocolo, no asumir un commit limpio.
UI añade template-filter.elapsedMs (filtrado y reconstrucción selector), template-library-loaded.elapsedMs (fetch local→JSON→opciones), conteos, versión de biblioteca y templateId al crear informe. No mide lectura humana, exactitud clínica ni píxel físico. Se exporta con mediciones del editor; primer despliegue del servicio pendiente mientras el usuario graba. Coste de instrumentación/almacenamiento local por aislar si se comparan diferencias pequeñas.

## Diagnóstico de recursos y disponibilidad · 01-11-2026
`node scripts/audit-resources.mjs` genera primero protocol.json y después results.json bajo data/local/audits/fecha-UTC. Métricas agregadas: bytes de catálogo/respuesta HTTP/disco, conteos, tiempos de parseo/serialización/evaluación y tamaño lógico de historial del modelo de edición. Cinco repeticiones para HTTP y operaciones sobre snapshot; una fixture de 1000 ediciones. Performance.now, resolución/sobrecosto no calibrados. HTTP = inicio fetch→cuerpo recibido, sin parseo JSON; serialización excluye escritura de disco; fixture de editor excluye DOM/localStorage. Preserva las cinco observaciones, incluida primera petición. Actividad simultánea no controlada: no interpretar como benchmark de inferencia ni cambio antes/después.

Versionado: hashes de archivos inspeccionados, snapshot de catálogo, HEAD observado y dirty; hash de backend activo se conserva aparte. No atribuir cambios estáticos posteriores a hash de inicio del servidor. Browser/GPU no medidos permanecen null. La estimación de bytes/s por panel combina tamaño observado e intervalo de código; no es tráfico capturado ni datos móviles. Historial en caracteres lógicos no equivale a RAM física. Instrumentación de editor actual calcula elapsedMs antes de guardar su propio evento; ese guardado queda fuera del intervalo y requiere perfilado separado.

Recuperación: data/local/operations/20261101-183146 conserva protocolo, hashes de scripts, respuestas HTTP agregadas, sondas de QR/manual/tono y puente local. Tiempo HTTP se mide desde petición a cuerpo recibido, una repetición por ruta; tiempo de puente desde construir WebSocket a evento created. Clientes sintéticos desde PC, sin cámara ni teléfono físico. Snapshot de working set/private bytes es puntual, CPU/GPU null; no diagnostica fuga ni ocupación GPU. El diagnóstico añade unas pocas consultas locales: se debe separar de futuras series controladas de latencia.


## Consultas compartidas · 01-11-2026
Medición por conteo en fixture VM con reloj virtual: 5 paneles × 20 intervalos de 1500 ms. Baseline reconstruido de callbacks anteriores; nuevo scheduler ejecutado desde fuente actual con hash guardado. 100→20 solicitudes. Proyección usando cuerpo previamente observado de 1.220.916 bytes: 122.091.600→24.418.320 bytes; no transferencia real ni tiempo físico. Pruebas en tests/review-polling.test.mjs. Intervalos reales, parseo/render y latencia física quedan pendientes de medir con navegador/teléfono. Caché compartida puede conservar estado hasta 150 ms; mutaciones de revisión fuerzan actualización. Las tarjetas pendientes o con edición sin guardar pueden superar cinco temporalmente para evitar pérdida.


## Disposición enfocada v1
Exportación adicional dicta-disposicion-metricas.json en Mediciones y diagnóstico: versión, navegador, red null, hasta 500 eventos en memoria de esta navegación. Panel-toggle registra apertura/cierre; editor-scroll se limita a un evento cada 200 ms (no contar como desplazamientos físicos exactos). editor-visible mide rectángulo DOM tras requestAnimationFrame: viewport CSS, top, altura y altura visible; no detecta oclusiones ni presentación física. atMs es performance.now desde navegación. Editor exportado añade layoutVersion y eventos font-size (18–32 px), panel-toggle de plantillas. Se conservan métricas anteriores de preview/final/copia y fuentes de incertidumbre. Sobrecosto no aislado, null en evidencia; no se afirma mejora temporal antes/después. Hipótesis/aceptación UX en design/README.md. Exportar antes de recargar; los eventos de disposición no persisten en servidor.


## Laboratorio y conexión visible · 01-11-2026
Disposición de dictado identificada focused-workspace-v2-connect; exportación de disposición existente preservada. Laboratorio añade botón Mediciones de interfaz: lab-focused-v1, hasta 500 eventos en memoria, navegador, red null, hash backend separado de versión UI. audio-filter.elapsedMs mide normalización/filtrado/conteo DOM hasta antes de añadir el evento, sin píxeles físicos; no exporta consulta ni nombres de archivos. panel-toggle registra sección y estado. Sin persistencia automática: exportar antes de recargar. Hipótesis de aceptación: localizar conexión inicial sin scroll, obtener QR con una acción, seleccionar audios sin perder selecciones ocultas al filtrar, acceder a configuración/ejecución sin recorrer toda biblioteca. Comparar mismo viewport/navegador/zoom/catálogo, conteos de clic/scroll y tiempo de tarea por usuario, tres repeticiones por condición. Mediciones antes/después y sobrecosto pendientes, no se afirma ganancia cuantificada.

## 2026-11-01 · Vibración móvil opcional
Diagnóstico mobile-lifecycle.v1: capture-request guarda hapticsEnabled y requestedPulseMs por recordingId; haptic guarda edge, requestedMs=12, accepted, outcome y callMs. callMs mide con performance.now desde antes de llamar vibrate hasta su retorno/error, en ms; excluye guardar el evento. No mide respuesta mecánica: actualDurationMs y audibleInRecording son null. La API aceptada no garantiza pulso físico. Registro acotado a 100 eventos, sin audio/texto/secretos. Sobrecosto total del registro y precisión efectiva del reloj pendientes de medir en teléfono; no interpretar diferencias pequeñas como mejoras. Protocolo pareado en tests/HAPTICS_CHECKLIST.md.

Retroalimentación de copia: elapsedMs continúa midiendo solicitud de portapapeles hasta respuesta; feedback identifica confirmación en botón y estado. Tiempo hasta percepción del usuario y render efectivo: null, pendientes de prueba física. Prueba de vibración directa: edge=test, recordingId=null; no representa una toma ni cambia hapticsEnabled.

## 2026-11-01 · Revisión global y contexto
Cada revisión guarda inputHash del texto y contexto, prompt/version/hash, build/sourceHash, cola→inicio (queueMs), solicitud al proveedor→respuesta (requestMs), validación (validationMs) y ejecución total sin cola (totalMs), ms monotónicos; uso de tokens según proveedor o null. Revisión global comparte cola, no sumar su latencia a ASR como tiempo de transcripción. UI: report-review-request, report-review-shown (solicitud UI→resultado DOM, incluye cola/polling), report-review-cancel, report-copy-offer y report-copy-without-review; exportación del editor, sin texto en esos eventos. Polling solo durante trabajo, cada 1000 ms, puede añadir espera de presentación; no mide pintado físico. Sobrecosto total y precisión efectiva en móvil null, pendientes. Snapshot/version por resultado y marcado de desactualizado; no convertir ausencia de avisos en exactitud clínica.
