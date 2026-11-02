# Dicta Libre — discusión de fase 3: segmentación inteligente

Fecha: 29 de octubre de 2026. Documento de propuesta, no implementación ni resultados.

Leer primero PROJECT_CONTEXT_FOR_DISCUSSION.md para el contexto general. Nombres acordados: **Muse-Normal** (archivo completo), **Muse-streaming** (audio incremental) y **Whisper local** (Whisper large-v3 con OpenVINO/GPU por toma). En este documento, «Muse por archivo» significa Muse-Normal y «streaming» significa Muse-streaming. La comparación de fase 3 es entre **Muse-streaming con cierre manual** y **Muse-streaming con segmentación automática**; no son motores nuevos. El modo manual aquí no se refiere a Muse-Normal.

## Petición para el chat que reciba este documento

Ayúdame a discutir el comportamiento de la fase 3 antes de programar. Soy médico radiólogo y busco una experiencia familiar de dictáfono. Haz preguntas concretas, una decisión a la vez; distingue hechos, propuestas e incertidumbres. No asumas que debo mantener el micrófono abierto continuamente ni que toda pausa termina una frase. Contrasta los beneficios de segmentar con la posibilidad de conservar el modo manual. Al finalizar, devuelve acuerdos, alternativas descartadas, cuestiones abiertas y criterios de aceptación para llevarlos al chat de implementación.

## Contexto y estado real

Dicta Libre comenzó su implementación concursante el 28 de octubre de 2026; hubo ideación y exploración previas. El objetivo es dictar desde un Samsung S25 Ultra y ver el texto en el PC. Wi-Fi es la prioridad de la demo; también se probó transporte por datos móviles. Se orienta a profesionales, con pruebas sintéticas o autorizadas sin información identificable de pacientes.

Hay captura/transporte, emparejamiento QR, Muse por archivo y streaming, Whisper large-v3 local mediante OpenVINO/GPU y laboratorio para comparar el mismo audio. Hay números y comandos básicos con originales conservados. No hay validación clínica. Nueve grabaciones de varias voces ya se compararon entre los tres modos; faltan referencias humanas revisadas. Son lecturas de guiones, no evidencia suficiente sobre dictado espontáneo.

Las diez fases son: 1 captura, 2 transporte, 3 segmentación, 4 reconocimiento, 5 reconstrucción, 6 comparación/combinación de motores, 7 contexto médico, 8 incertidumbre y propuestas, 9 editor/inserción y 10 evaluación. Volvemos al orden lógico: ahora discutimos solo la fase 3. No entrenaremos modelos ni cambiaremos reglas de comandos en este experimento.

## Distinciones fundamentales

- Sesión de conexión: teléfono y PC emparejados.
- Toma: audio entre activación y parada del micrófono por el usuario.
- Bloque de transporte: paquete pequeño de audio; no representa una frase.
- Segmento: intervención detectada dentro de una toma; puede no coincidir con una oración.
- Informe: texto que puede reunir varias tomas y segmentos.
- Final del ASR: hipótesis que el motor considera terminada; no significa texto aprobado por el médico.

El streaming actual usa delimitación manual PUSH_TO_TALK. Muestra borradores mientras se dicta y finaliza la toma al detener. La segmentación automática sigue pendiente.

## Experiencia propuesta para discutir

1. El usuario activa la grabación explícitamente.
2. Se muestra claramente que el micrófono está activo y aparece texto provisional.
3. Una pausa puede cerrar un segmento de reconocimiento, pero no termina la toma ni crea por sí misma un párrafo.
4. Al continuar, el nuevo segmento se incorpora en orden al mismo informe.
5. El usuario detiene la toma; se procesan resultados pendientes y se conserva el audio completo.

Si el micrófono sigue activo durante una pausa, puede captar y transmitir sonidos del entorno. Debemos decidir si hace falta un control explícito de pausa/reanudación además de parar. No prometer captura en segundo plano o con pantalla bloqueada.

Ejemplos delicados: «no se observan [pausa] adenopatías»; «dos coma [pausa] cinco centímetros»; «nueva [pausa] línea». Conservar audio y texto original permite estudiar el corte sin inventar el contenido. Un segmento finalizado no garantiza que el motor lo revise al oír el siguiente; la reconstrucción entre segmentos pertenece a la fase 5.

## Opciones

| Opción | Ventaja | Coste o riesgo |
|---|---|---|
| Manual actual | Usuario controla límites; base ya funcional | Requiere parar para cerrar cada toma |
| ENDPOINTING de Muse | Detecta intervenciones dentro de una sesión streaming | Puede cortar durante pausas de pensamiento; depende del proveedor |
| Detector local de actividad de voz (VAD) | Permite experimentar con control local del silencio y límites | Detectar voz no equivale a entender una frase; requiere ajuste, márgenes de audio y adaptación por motor |
| Intervalos fijos | Referencia simple para ciertos experimentos | Puede partir palabras/contexto; solapamiento y eliminación de duplicados añaden complejidad |

Recomendación provisional: comparar manual contra ENDPOINTING antes de construir VAD propio. Conservar selección intercambiable. No asumir que la segmentación siempre mejora precisión o latencia.

## Hechos de API y límites

La documentación oficial consultada describe ENDPOINTING con speechStart, speechEnd y speechComplete, y turnId para asociar resultados. Pueden solaparse eventos de turnos distintos; los parciales acumulativos sustituyen hipótesis anteriores. endStream cierra la sesión, no es una señal para cerrar cada pausa. Muse no expone confianza por palabra. No se ha confirmado un parámetro configurable de duración de silencio; no prometerlo.

Fuente: https://dev.meta.ai/docs/speech-to-text (consultada durante la revisión previa; verificar antes de implementar).

## Protocolo propuesto, todavía no ejecutado

Hipótesis: ENDPOINTING permite consolidar texto durante pausas sin intervención manual, manteniendo la integridad del contenido frente a PUSH_TO_TALK.

Condiciones: mismos PCM, glosario, idioma y reglas de formato; reproducción a ritmo real; ejecución secuencial y orden alternado de modos. Propuesta: tres repeticiones por audio y modo. Registrar hash de código/audio, configuración, tiempos, entorno y errores. Dispositivo/red desconocidos se guardan como null. Una reproducción en PC no acredita experiencia real del teléfono.

Material: nueve audios existentes como prueba exploratoria, más dictados sintéticos de 2–10 segundos y casos nuevos con pausas. Probar pausas de 0,3 / 0,8 / 1,5 / 3 segundos como estímulos experimentales, no como umbrales del servicio. Si se insertan silencios, conservar original y variante con sus hashes, documentando la modificación. Añadir dictado espontáneo sintético, comandos, negaciones, lateralidad, decimales/unidades y pausas largas al mirar imágenes. Reservar ejemplos nuevos para comprobar generalización.

Antes de puntuar, revisar lo realmente pronunciado. El PDF no es automáticamente la referencia correcta. Etiquetar por separado palabras literales y formato esperado.

| Métrica | Unidad e intervalo/definición |
|---|---|
| Primer texto | ms desde primera muestra enviada hasta primer parcial recibido |
| Consolidación tras habla | ms desde fin del habla anotado en la reproducción hasta final del segmento recibido; documentar alineación de reloj |
| Espera al parar | ms desde parada/envío final hasta recepción del resultado completo; separar intervalos cliente/servidor |
| Cortes problemáticos | Conteo y proporción de límites que perjudican un número, unidad, negación, término o comando según revisión |
| Omisiones/duplicaciones | Conteos de audio perdido o texto repetido por orquestación, separados de errores del motor |
| Fidelidad | WER sobre referencia oral revisada y conteos separados de errores críticos; formato evaluado aparte |
| Esfuerzo humano | Segundos de revisión/corrección hasta texto aceptado y valoración de interrupciones |

Reportar muestras individuales, mediana, rango y n; no sacar conclusiones sólidas de percentiles extremos con pocas repeticiones. Medir o documentar el sobrecosto de instrumentación; guardar fracasos y valores ausentes como null.

Criterios propuestos: cero pérdidas/duplicaciones atribuibles a la integración en el conjunto de aceptación; parada explícita respetada; ningún fallo presentado como resultado completo; cero errores críticos nuevos atribuibles al corte en los casos de aceptación revisados. Comparar fidelidad y esfuerzo contra manual; si no aporta o empeora, conservar manual como predeterminado. Acordar con el usuario el objetivo de latencia antes de ejecutar, sin prometer un valor clínicamente validado. Estos criterios no prueban seguridad fuera de la muestra.

## Decisiones que quiero discutir

1. ¿Prefiero activar/parar por toma corta, o mantener una toma abierta durante varias frases y pausas?
2. ¿Necesito pausa explícita para hablar con otra persona sin enviar audio, además de parar?
3. ¿Cómo quiero distinguir texto provisional, consolidado por el ASR y revisado por mí?
4. ¿Qué pausas ocurren de forma natural en mi dictado y cuáles me molestaría que cortaran el contexto?
5. ¿Cuánto retardo después de una pausa me resulta aceptable?
6. ¿Qué ejemplos y resultados bastan para adoptar el modo automático o mantenerlo opcional?

## Fuera del alcance de esta fase

Fine-tuning, corrección clínica automática, fusión automática de motores, plantillas, inserción RIS/PACS y cambios generales de comandos. Se registran problemas de esas áreas para sus fases correspondientes. No hay implementación autorizada por este documento: primero se acuerda el comportamiento y la prueba.
