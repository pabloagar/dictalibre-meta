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
