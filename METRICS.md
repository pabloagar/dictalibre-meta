# Mediciones del prototipo

## Criterio permanente de desarrollo
Por solicitud del responsable, cada etapa medible debe incluir mediciones útiles para comparar alternativas. Si aún no puede instrumentarse, dejar definidos sus puntos de inicio/final, unidades, limitaciones y pendiente explícito. Este criterio forma parte de la aceptación de las próximas fases, no solamente del transporte.

Para cada experimento registrar hipótesis, variante, commit/build comprobado, configuración, entorno, fecha, fuente de audio, repeticiones, errores y resultados. Comparar bajo condiciones equivalentes, preferentemente alternando variantes; conservar muestras por toma y resúmenes, sin confundir muchos bloques de una sola toma con muchas repeticiones independientes. Medir también el sobrecosto de la telemetría cuando pueda afectar el resultado.

Pendiente en el exportador actual: identificador único global de ejecución, build/commit, configuración versionada y metadatos de dispositivo/red declarados. Hasta incorporarlos, acompañar los JSON con una ficha; los datos desconocidos permanecen como desconocidos. La persistencia automática entre sesiones tampoco está implementada: exportar conserva la evidencia.

## Estado actual
Implementadas el 28-10-2026. Se muestran para la última toma, con P50, P95 (rango más cercano), máximo y cantidad de muestras en JSON. Exportación manual en «Mediciones y diagnóstico». Sin audio, texto ni códigos de emparejamiento. Hasta 6000 bloques por toma y tres trazas en memoria; una recarga borra estos datos.

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
Ejecutar node --test tests/*.test.mjs. Después emparejar dos navegadores, preparar tono de diagnóstico y completar una toma con cada control. Abrir diagnóstico y exportar JSON antes de la siguiente toma. Repetir en S25 Ultra, Wi-Fi y 4G/5G, diez tomas de treinta segundos por condición, anotando versiones y red fuera del archivo automático. Comparar P50/P95, integridad, errores y estimaciones no disponibles; separar tono y micrófono real.

