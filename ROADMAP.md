# Diez fases de Dicta Libre

Actualización: 28-10-2026, America/Santiago. Las diez fases reemplazan la agrupación F0–F7 del primer borrador. Se avanza mediante discusión, implementación acotada y validación. La documentación inicial ya existe.

| Fase | Objetivo | Estado y criterio de aceptación |
| --- | --- | --- |
| 1. Captura | S25 Ultra, interfaz abierta, micrófono preparado y dos controles táctiles | Prototipo implementado; validado con tono y pruebas de worklet. Voz real e integridad aportadas por el usuario; faltan series cortas, límites audibles e interrupciones |
| 2. Transporte | Emparejamiento y envío durante la toma, Wi-Fi y 4G/5G desde el inicio | Relay y URL temporal implementados; WSS sintético público comprobado. Evidencia del usuario con celular 4G y PC Wi-Fi; faltan series repetidas y recuperación explícita tras interrupción |
| 3. Segmentación inteligente | Decidir qué audio procesar sin perder palabras en límites | Pendiente de discutir; contrastar segmentación externa con el contrato real del ASR |
| 4. Reconocimiento de voz | Audio a texto y tiempos medidos | Whisper GPU implementado en laboratorio y receptor local al terminar cada toma; prueba sintética de extremo a extremo. Pendiente experiencia física del S25 Ultra en este flujo y acceso real a Muse |
| 5. Reconstrucción del texto | Ordenar y consolidar parciales/finales sin duplicar ni perder texto | Pendiente; verificar primero la semántica real de eventos del proveedor |
| 6. Transcripción híbrida | Comparar motores sobre el mismo audio y evaluar una combinación | Experimento pendiente, sin promesa de mejora ni decisión final sobre motores |
| 7. Contexto y terminología | Medir ASR con y sin vocabulario radiológico | Pendiente; términos/corpus congelados y controles de sobrecorrección |
| 8. Incertidumbre y propuestas | Señalar dudas y alternativas con Meta bajo revisión humana | Pendiente; original preservado, abstención y ninguna modificación clínica silenciosa |
| 9. Editor e inserción | Mostrar, revisar y transferir texto al computador | Pendiente de discutir; copia/pega y posible integración Windows son decisiones futuras |
| 10. Evaluación y evidencia | Comparar exactitud, seguridad, latencia y costes | Se recopila evidencia desde cada fase; evaluación de IA aún no ejecutada |

## Acuerdos de fases 1 y 2

El S25 Ultra es fijo. Pantalla encendida y página visible. Micrófono preparado durante la sesión, descartando muestras fuera de toma. Comparar mantener pulsado y pulsar para iniciar/parar antes de decidir una preferencia. Botón físico pospuesto. Dos navegadores y relay WebSocket; QR directo con token temporal o código manual con confirmación en PC. La prueba conjunta incluye redes diferentes desde el principio.

La demo temporal aloja el relay en el computador de desarrollo y usa un túnel HTTPS. El receptor puede ser un navegador en ese u otro PC. El alojamiento permanente queda pendiente; no se presenta el túnel como servicio de producción.

## Siguiente paso concreto

Ejecutar [DEVICE_CHECKLIST.md](tests/DEVICE_CHECKLIST.md) con el teléfono: series de cinco dictados de 2–10 segundos por control en Wi-Fi y en 4G (5G solo si está disponible). Escuchar inicio/final y verificar ausencia de audio entre tomas. Registrar preferencia de control y cualquier fallo.

Corregir los fallos observados antes de integrar ASR. Después discutir la fase 3 conjuntamente con los requisitos de entrada/eventos del candidato ASR de fase 4; esa revisión de interfaz no implica implementar todas las fases a la vez.

## Camino crítico provisional hasta el 4 de noviembre

- **28–29 oct:** completar aceptación de captura/transporte y decidir ajustes.
- **29–30 oct:** verificar acceso real, condiciones e interfaz del modelo Meta/ASR; acordar fases 3–5.
- **30 oct–1 nov:** implementar el recorrido de transcripción acordado y medir baseline.
- **1–2 nov:** experimentos acotados de terminología/alternativas y revisión humana según lo que apruebe la discusión.
- **3 nov:** congelar configuración, evaluación, demo y reproducción desde instalación limpia.
- **4 nov, antes de 18:00:** revisión documental, repositorio público y entrega. Reconfirmar plazo oficial.

Fechas previstas, no trabajo realizado. No se afirma que quepa toda la visión en ese plazo: al cerrar cada fase se revisará el alcance siguiente. Si el acceso Meta falla, debe quedar explícito; las respuestas simuladas no cumplen esa integración. No declarar mejoras si los experimentos no las muestran.

## Trazabilidad y pendientes

Mantener commits reales sin alterar fechas, bitácora y resultados asociados a la versión evaluada. Pendientes: reglas completas, inscripción/elegibilidad, licencia del código propio, remoto público y alojamiento estable. La URL de la demo no publica el repositorio ni prueba por sí sola la fecha de creación del código.

## Cierre de fases 1 y 2: uso principal de 2–10 segundos
Este criterio sustituye el requisito previo de 30 s; las tomas largas son pruebas complementarias y no bloquean el inicio de ASR.
- Cinco dictados consecutivos de 2–10 s por control y condición (Wi-Fi y 4G). Escuchar primera/última palabra, comprobar integridad, ausencia de mezcla/duplicación y que no se envíe audio fuera de toma. Exportar cada serie antes de empezar la siguiente.
- Una interrupción de red y una pérdida de visibilidad: aviso de toma incompleta, sin falso éxito y posibilidad de volver a preparar/emparejar y grabar.
- Comprobar permiso de micrófono denegado y reintento; pulsación breve y soltar fuera del botón sin captura atascada.
- Registrar preferencia entre ambos controles, entorno y valoración del retardo. No se impone un umbral de latencia clínica aún no acordado. Cinco tomas ofrecen una impresión inicial, no una estimación estadística sólida.

La toma de 8,504 s ya es evidencia válida del caso principal. No hace falta repetirla por no llegar a 30 s. 5G y grabación de tres minutos son complementarios; los tests automáticos del límite se conservan.

Antes de programar transcripción: discutir el motor y comprobar acceso, licencia, español médico, formatos/frecuencia y si acepta toma completa o streaming. Para el primer recorrido propuesto, una toma corta terminada puede ser una unidad de entrada, si el motor lo admite; no imponer segmentación inteligente ni streaming antes de conocer ese contrato. Medir cola, inferencia, primer/final texto y error de palabras/términos, conservando el original. Esta propuesta no selecciona ni integra un motor.
# Actualización: laboratorio de transcripción aprobado e iniciado

28-10-2026: el responsable autorizó implementar el alcance de [LABORATORY.md](LABORATORY.md). Primera entrega local operativa con Whisper large-v3/OpenVINO/GPU. Próxima puerta de aceptación: credencial Muse, prueba del contrato real, 3–5 dictados sintéticos del S25 Ultra de 2–10 s con referencia revisada y ejecución de ambos motores sobre los mismos archivos. Después: piloto reservado y revisión de errores clínicos. No avanzar a corrección ni integración automática en captura antes de revisar esta evidencia. Wi-Fi principal para demo; no depende de que el laboratorio se publique.

