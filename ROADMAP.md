# Diez fases de Dicta Libre

Actualización: 28-10-2026, America/Santiago. Las diez fases reemplazan la agrupación F0–F7 del primer borrador. Se avanza mediante discusión, implementación acotada y validación. La documentación inicial ya existe.

| Fase | Objetivo | Estado y criterio de aceptación |
| --- | --- | --- |
| 1. Captura | S25 Ultra, interfaz abierta, micrófono preparado y dos controles táctiles | Prototipo implementado; validado con tono y pruebas de worklet. Falta voz real, límites, permisos y ergonomía en S25 |
| 2. Transporte | Emparejamiento y envío durante la toma, Wi-Fi y 4G/5G desde el inicio | Relay y URL temporal implementados; WSS sintético público comprobado. Falta prueba física en ambas redes |
| 3. Segmentación inteligente | Decidir qué audio procesar sin perder palabras en límites | Pendiente de discutir; contrastar segmentación externa con el contrato real del ASR |
| 4. Reconocimiento de voz | Audio a texto y tiempos medidos | Pendiente; Muse Voice Transcribe es candidato del esquema discutido, no motor integrado ni acceso confirmado |
| 5. Reconstrucción del texto | Ordenar y consolidar parciales/finales sin duplicar ni perder texto | Pendiente; verificar primero la semántica real de eventos del proveedor |
| 6. Transcripción híbrida | Comparar motores sobre el mismo audio y evaluar una combinación | Experimento pendiente, sin promesa de mejora ni decisión final sobre motores |
| 7. Contexto y terminología | Medir ASR con y sin vocabulario radiológico | Pendiente; términos/corpus congelados y controles de sobrecorrección |
| 8. Incertidumbre y propuestas | Señalar dudas y alternativas con Meta bajo revisión humana | Pendiente; original preservado, abstención y ninguna modificación clínica silenciosa |
| 9. Editor e inserción | Mostrar, revisar y transferir texto al computador | Pendiente de discutir; copia/pega y posible integración Windows son decisiones futuras |
| 10. Evaluación y evidencia | Comparar exactitud, seguridad, latencia y costes | Se recopila evidencia desde cada fase; evaluación de IA aún no ejecutada |

## Acuerdos de fases 1 y 2

El S25 Ultra es fijo. Pantalla encendida y página visible. Micrófono preparado durante la sesión, descartando muestras fuera de toma. Comparar mantener pulsado y pulsar para iniciar/parar antes de decidir una preferencia. Botón físico pospuesto. Dos navegadores y relay WebSocket; enlace por QR/código y confirmación en PC. La prueba conjunta incluye redes diferentes desde el principio.

La demo temporal aloja el relay en el computador de desarrollo y usa un túnel HTTPS. El receptor puede ser un navegador en ese u otro PC. El alojamiento permanente queda pendiente; no se presenta el túnel como servicio de producción.

## Siguiente paso concreto

Ejecutar [DEVICE_CHECKLIST.md](tests/DEVICE_CHECKLIST.md) con el teléfono: primero treinta segundos con ambos controles en Wi-Fi, después con Wi-Fi apagado y 4G/5G. Escuchar inicio/final y verificar ausencia de audio entre tomas. Registrar preferencia de control y cualquier fallo.

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
