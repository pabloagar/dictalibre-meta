# Diez fases de Dicta Libre

Actualización: 02-11-2026, America/Santiago. Las diez fases reemplazan la agrupación F0–F7 del primer borrador. Se avanza mediante discusión, implementación acotada y validación. La tabla inicial refleja el estado actual; los cortes fechados al final conservan la evolución histórica.

## Estado respecto de las diez fases originales

Se conserva la numeración y propósito del plan inicial; las modificaciones de alcance acordadas (S25 Ultra, prioridad Wi-Fi, tomas principales de 2–10 s, validación incremental) prevalecen sobre el borrador inicial. «Operativa» significa recorrido funcional probado, no validación clínica ni cierre de todas las pruebas de resistencia.

**Recuento:** 3 operativas (1, 2, 4) y 7 parciales/en validación (3, 5, 6, 7, 8, 9, 10). Segmentación, Revisor Meta y editor ya tienen implementación; sus pruebas pendientes no equivalen a módulos desde cero. Ninguna aceptación clínica global está cerrada. La fusión automática de fase 6 y la inserción directa al RIS de la visión original no son requisitos acordados para esta demo.

| Fase original | Estado | Evidencia actual | Qué falta / criterio de cierre |
|---|---|---|---|
| 1. Captura de audio | Operativa | S25, AudioWorklet, PCM, voz real y comprobación de integridad | Series cortas sin perder inicio/final; permisos, interrupciones y visibilidad. Segundo plano no prometido |
| 2. Comunicación celular-computador | Operativa | QR/código, bloques en vivo, Wi-Fi y datos móviles probados, ACK/hash | Repetición en condiciones variables y recuperación explícita sin falso éxito; alojamiento temporal sigue siendo limitación |
| 3. Segmentación inteligente | Parcial / en validación | Muse-streaming con cierre manual PUSH_TO_TALK o segmentación ENDPOINTING; prueba técnica con 3 segmentos y tomas físicas de un segmento | Comparación física pareada con pausas, sin perder/duplicar palabras. El botón controla el micrófono en ambos modos; una pausa no crea un párrafo |
| 4. Reconocimiento de voz | Operativa | Muse-Normal, Muse-streaming y Whisper local con OpenVINO/GPU; originales y tiempos persistidos | Confirmar referencias multivoz y errores clínicos; esta evidencia completa aceptación, no exige otro motor |
| 5. Reconstrucción del texto | Parcial avanzada | Reemplazo de parciales, final único, orden por toma y formato básico | Punto aparte, puntuación sobrante y mayúsculas; pruebas de cancelación/orden/límites. Ningún parcial se promueve como final por fallo |
| 6. Transcripción híbrida | Parcial | Comparaciones de los mismos audios y métricas separadas | Alinear desacuerdos y evaluar si una combinación supera al motor individual. Si no mejora o altera clínica, documentar resultado negativo y no fusionar automáticamente |
| 7. Contexto y terminología médica | Parcial avanzada | Glosario versionado y comparación con/sin él | Referencias revisadas, efecto por término y regresiones en textos/voces no usados para ajustar. No asumir que el glosario siempre mejora |
| 8. Incertidumbre y propuestas clínicas | Parcial / piloto | Revisor Meta muse-spark-1.3, propuestas localizadas, aceptar/rechazar/editar/deshacer, originales conservados; 25/27 respuestas válidas en evaluación multivoz | Juicio humano de propuestas y errores introducidos, abstenciones y corpus reservado. Validez de formato no demuestra exactitud clínica; ningún cambio silencioso |
| 9. Editor e inserción | Parcial / piloto | Borrador dentro del informe, selección por toma, persistencia local, deshacer y copiar; 285 plantillas únicas importadas y activadas en servidor principal | Prueba física de selección/cancelación/copia y contenido heredado. Biblioteca activada el 01-11 con autorización; falta validación de uso/contenido. Inserción directa RIS diferida |
| 10. Evaluación y evidencia | Infraestructura técnica cerrada; evaluación transversal abierta | Laboratorio ampliado activo; 6/6 transcripciones reales, tres pares y exportación HTTP verificada el 02-11; referencias TTS provisionales | Referencias humanas, evaluación reservada, errores de números/unidades/negaciones/lateralidad y términos; instalación limpia, resultados negativos, documentación y demo |

## Prioridad tras implementar A compacta (02-11-2026)

La base visual y los controles del editor están implementados; no equivale a cerrar la aceptación de fase 9. Próximo paso: recorrer desde S25 físico conectar → dictar → corregir → deshacer/rehacer → copiar, con informes sintéticos, pausas y reconexión; registrar pérdidas, duplicados y tiempos. Después, fase 10: congelar configuración y comparar tareas/errores con referencias humanas. La revisión Meta continúa como piloto de fase 8 en laboratorio; habilitarla en la demo pública requiere un trabajo separado de backend, aislamiento/límites y evaluación humana. No hace falta otro rediseño para iniciar estas pruebas.

## Acuerdos de fases 1 y 2

El S25 Ultra es fijo. Pantalla encendida y página visible. Micrófono preparado durante la sesión, descartando muestras fuera de toma. Comparar mantener pulsado y pulsar para iniciar/parar antes de decidir una preferencia. Botón físico pospuesto. Dos navegadores y relay WebSocket; QR directo con token temporal o código manual con confirmación en PC. La prueba conjunta incluye redes diferentes desde el principio.

La demo temporal aloja el relay en el computador de desarrollo y usa un túnel HTTPS. El receptor puede ser un navegador en ese u otro PC. El alojamiento permanente queda pendiente; no se presenta el túnel como servicio de producción.

## Siguiente paso concreto

1. Validar la experiencia integrada de fases 3/5/9 con series de 2–10 s: destino, reemplazo, cifras, comandos, pausa manual/automática, deshacer y copia. Exportar últimas cinco tomas y mediciones del editor antes de cambiar condiciones. Protocolo en CODE_REVIEW_2026-11-01.md.
2. Revisar fase 8 por separado sobre las mismas tomas: observar propuesta, aceptar/rechazar/deshacer y comprobar texto vecino/original. No activar simultáneamente varias variantes mientras se compara latencia.
3. Consultas compartidas y retención de tarjetas ya corregidas y probadas (01-11). Mantener vigilancia del tamaño de catálogo/persistencia; no abrir otra optimización sin una necesidad medida.
4. Biblioteca completa activada el 01-11: validar selección, contenido heredado y copia con el responsable. La disposición enfocada ya está integrada; probarla dictando desde S25.
5. Completar aceptación de recuperación y acceso. El túnel temporal volvió a fallar el 01-11 y se renovó sin reiniciar laboratorio. Un enlace estable es prioridad para la demo.
6. Fase 10: confirmar referencias de los nueve M4A, errores de términos/negaciones/lateralidad/medidas y evaluación reservada. Congelar configuración, instalación limpia, versiones/licencias, repositorio público, trazabilidad y demo. No usar el guion como referencia oral exacta sin escuchar.

Fine-tuning no es requisito previo: primero referencias revisadas y evidencia de errores repetibles que glosario/formato no resuelvan. No se implementa fusión automática ni generación de informes a partir de instrucciones dictadas.

## Orden propuesto y camino crítico hasta el 4 de noviembre

Calendario de trabajo propuesto; no representa tareas ya realizadas ni una garantía de completar toda la visión.

- **1 nov · fases 3/5/8/9:** pruebas físicas controladas, exportaciones, revisión de recursos y de propuestas. Activar biblioteca al terminar; no interrumpir tomas.
- **2 nov · aceptación 1/2 y fases 5/7/8/9:** resolver fallos concretos, consultas innecesarias y acceso estable; repetir casos afectados con evidencia antes/después. Revisar referencias y contenido de plantillas.
- **3 nov · fase 10 y aceptación 1/2/4:** congelar configuración, evaluación reservada, instalación limpia y grabación de demo. Revisar repositorio público/licencias/trazabilidad. Si faltan referencias o estabilidad, reducir alcance de la demostración y declarar la limitación.
- **4 nov:** revisión y entrega según fecha indicada por el responsable. Hora exacta, zona y reglas oficiales siguen pendientes de confirmar.

Si hay que recortar, conservar captura/transporte, Muse streaming, números/comandos fiables, editor y evidencia. Segmentar automáticamente y fusionar motores no deben retrasar el recorrido ya funcional; cualquier recorte se registra como alcance pendiente, no fase completada. El piloto clínico de fase 8 solo se incorpora si conserva supervisión y evidencia suficiente.

## Trazabilidad y pendientes

Mantener commits reales sin alterar fechas, bitácora y resultados asociados a la versión evaluada. Pendientes: reglas completas, inscripción/elegibilidad, licencia del código propio y alojamiento estable. El repositorio público ya está creado; falta congelar y comprobar la versión que incluya esta ampliación. La URL de la demo no publica el repositorio ni prueba por sí sola la fecha de creación del código.

## Cierre de fases 1 y 2: uso principal de 2–10 segundos
Este criterio sustituye el requisito previo de 30 s; las tomas largas son pruebas complementarias y no bloquean el inicio de ASR.
- Cinco dictados consecutivos de 2–10 s por control y condición (Wi-Fi y 4G). Escuchar primera/última palabra, comprobar integridad, ausencia de mezcla/duplicación y que no se envíe audio fuera de toma. Exportar cada serie antes de empezar la siguiente.
- Una interrupción de red y una pérdida de visibilidad: aviso de toma incompleta, sin falso éxito y posibilidad de volver a preparar/emparejar y grabar.
- Comprobar permiso de micrófono denegado y reintento; pulsación breve y soltar fuera del botón sin captura atascada.
- Registrar preferencia entre ambos controles, entorno y valoración del retardo. No se impone un umbral de latencia clínica aún no acordado. Cinco tomas ofrecen una impresión inicial, no una estimación estadística sólida.

La toma de 8,504 s ya es evidencia válida del caso principal. No hace falta repetirla por no llegar a 30 s. 5G y grabación de tres minutos son complementarios; los tests automáticos del límite se conservan.

## Evolución del alcance

La aprobación del laboratorio, la resolución de la credencial Muse y las pruebas por toma/streaming ya ocurrieron y están en HACKATHON_LOG.md. Los requisitos antiguos de «antes de programar ASR» eran puertas históricas, no bloqueos actuales. Continúa pendiente la validación humana y la aceptación de robustez; no se presentan estas pruebas de ingeniería como validación clínica.

## Estado al cerrar la jornada del 28-10-2026
Streaming ya fue probado desde el micrófono del responsable; seis tomas verificadas y comparación del mismo audio con ambos motores. La espera final estimada promedió 1,34 s en esa serie, sin prometer ese valor en otras condiciones. Muse por toma y Whisper siguen disponibles. Los límites operativos y métricas están en LABORATORY.md/METRICS.md. El ZIP con varias voces se conserva localmente; es evaluación, no entrenamiento automático.

## Evidencia multivoz por streaming
Los nueve archivos aportados ya se reprodujeron a ritmo real y se compararon con Muse por toma y Whisper caliente, sin cambiar reglas. Véase EXPERIMENTS.md y el reporte local data/local/lab/reports/2026-10-28-multivoice/streaming/REVIEW.md. La siguiente intervención propuesta es fase 5 (casos concretos de comandos/números) junto con referencias de fase 10; este ensayo no modifica esa funcionalidad.

## Actualización 29-10-2026 · fase 3 en pruebas
Segmentación automática de Muse-streaming implementada como opción experimental y verificada con servidor simulado y un control Meta real. La fase 3 pasa de función principal pendiente a parcial/en validación: falta experiencia física, referencias de pausas y comparación pareada con cierre manual. Recuento actualizado: 3 operativas, 6 parciales, 1 con función principal pendiente (8); ninguna aceptación clínica implícita. No se cambiaron reglas de números/comandos. El estado anterior queda como corte histórico del 28-10.

## Actualización 29-10-2026 · fase 8 para piloto
Revisor Meta implementado y probado técnicamente con proveedores simulados y diez revisiones reales de textos sintéticos. La fase 8 pasa de pendiente principal a parcial/en validación. Recuento de trabajo: 3 operativas y 7 parciales; no supone cerrar validación clínica. Pendientes de fase 8: revisión humana de propuestas, corpus reservado, errores introducidos/falsas alertas, aceptación desde celular y medición de interacción. No añade entrenamiento ni fusión automática de motores.


## Fase 9 · alcance acordado y piloto del 29-10
Editor con plantillas propias, dictado provisional en el destino seleccionado, consolidación/cancelación, deshacer y copiar implementados. Inserción directa al RIS diferida por decisión del responsable. Pendientes: prueba física S25, plantillas aportadas por radiólogos, revisión de contenido heredado, propuestas Meta contextualizadas visualmente y evaluación de usabilidad. No cerrar fase 9 por pruebas simuladas.


## 02-11-2026 · Cierre de ampliación técnica del laboratorio
Aceptación real completada: seis transcripciones/tres pares, una revisión Meta, originales preservados y exportaciones HTTP verificadas por cálculo independiente. Informe: experiments/results/2026-11-02-lab-acceptance/README.md. No se cierra validación clínica ni toda la fase 10: referencias TTS provisionales, una voz y tres frases. El siguiente trabajo recomendado es aceptación física integrada de fases 1/2/3/5/8/9 y congelar la demo, no ampliar funcionalidades. Multilingüismo permanece diferido por decisión del responsable.
