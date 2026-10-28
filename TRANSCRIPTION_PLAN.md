# Transcripción intercambiable: propuesta para discutir
Fecha de investigación: 2026-10-28. Este documento conserva la propuesta inicial. Actualización posterior: el responsable aprobó construir el laboratorio Muse frente a Whisper large-v3/OpenVINO local en GPU; primera implementación y estado verificado en [LABORATORY.md](LABORATORY.md). Whisper ya ejecutado; Muse pendiente de credencial y contraste real. Los otros motores siguen siendo candidatos futuros, no parte de esta entrega.

## Decisión provisional
Evaluar Muse Voice Transcribe 1.0 como candidato principal por encaje con el hackathon y modo de dictado; Whisper large-v3 como referencia independiente; Speechmatics Enhanced Medical en español como contraste especializado. Scribe v2 es reserva si el contraste médico no es accesible. Ningún resultado público revisado establece un ganador para dictados radiológicos chilenos de 2–10 s desde este S25 Ultra.

## Evidencia consultada
- [Meta: STT](https://dev.meta.ai/docs/speech-to-text): español, PUSH_TO_TALK, entrada por archivo y streaming, vocabulario/contexto. No hay confianza ni tiempos por palabra. WAV mono PCM16 a 16/24 kHz; distinguir parcial de final. En streaming endStream termina sesión, no confirma una toma reutilizable indefinidamente. Probar ciclo de vida en adaptador.
- [Meta: guía](https://dev.meta.ai/resources/blog/meet-muse-voice-transcribe-streaming-speech-to-text): recorrido de archivo y streaming. No equiparar fragmentos de transporte con turnos ASR.
- [Meta: tarifas](https://dev.meta.ai/docs/pricing-rate-limits): Muse Voice $0,18/h de audio, medición por segundos; no acredita acceso de nuestra cuenta. Verificar términos, región, retención y cuotas antes de enviar audio.
- [Whisper](https://github.com/openai/whisper): ASR multilingüe, código/pesos MIT. Candidato reproducible local, sujeto a hardware aún no medido.
- [Groq](https://console.groq.com/docs/speech-to-text): alojamiento de large-v3 ($0,111/h) y turbo ($0,04/h), mínimo facturado 10 s por petición. Opción para no condicionar el piloto a una GPU; términos de API independientes de MIT. No trasladar su WER o factor de velocidad publicados a nuestro caso.
- [Speechmatics: español médico](https://www.speechmatics.com/company/articles-and-news/speechmatics-medical-model-launches-in-spanish) y [idiomas](https://docs.speechmatics.com/speech-to-text/languages): candidato especializado. Fijar variante exacta y acceso médico contratado; no intercambiar Enhanced Medical/Oak sin registrar variante. Precio/condiciones efectivos pendientes.
- [Scribe v2](https://elevenlabs.io/docs/api-reference/speech-to-text/convert) y [descripción](https://elevenlabs.io/docs/help-center/product/core-capabilities/speech-to-text/what-is-speech-to-text): alternativa con keyterms; probar por separado su efecto. No usar edición no literal como baseline.
- [Muse Spark](https://dev.meta.ai/models/muse-spark) y [Llama 3.3](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct): candidatos de propuestas textuales posteriores; sin validación radiológica. Llama requiere licencia propia; servicios alojados tienen términos adicionales.
- [fonendo-bench](https://github.com/Omniloy/fonendo-bench): referencia metodológica de STT clínico español; audio clínico sintetizado con acceso condicionado y restricciones de redistribución/entrenamiento. No descargado. Contexto privilegiado en una fila y modos distintos entre sistemas limitan comparaciones; no adoptar su ranking como decisión.
- [Preprint LatAm español](https://www.medrxiv.org/content/10.64898/2026.07.14.26358062v2): localizado, acceso directo devolvió 403; no usado para extraer cifras ni como evidencia concluyente. Consultas médicas no equivalen a dictados radiológicos cortos.

## Módulos propuestos
Una tubería con contratos explícitos, no un despliegue de microservicios por cada fase:
1. Fuente: captura en vivo o reproducción de un WAV de evaluación.
2. Preparación: preservar original; remuestreo por adaptador, identidad cuando compatible. Sin filtros de ruido automáticos de partida.
3. Delimitación: una toma completa al detener (baseline); alternativa streaming posterior. Bloques de red de 100 ms no son frases.
4. ASR: adaptadores Meta, Whisper, Speechmatics. Declaran capacidades: archivo/streaming, idiomas, formatos, contexto, confidencias, tiempos.
5. Consolidación: eventos del proveedor a texto por toma; reemplazar parciales cuando sean acumulativos. No duplicar texto en reintentos.
6. Evaluación de dudas/propuestas Meta: opcional; no reescribe original.
7. Revisión humana/salida: acepta o rechaza propuestas. Apagar propuestas devuelve ASR original.

Contrato de audio: sessionId, recordingId, audioHash, formato real, frecuencia, canales, muestras y duración. Guardar derivados con hash propio y relación al original. Contrato de ejecución: runId global, versión de pipeline, modelo/proveedor/revisión, parámetros, glosario y contexto versionados, fuente y red declarada.
Contrato de salida: estado (parcial/final/error/cancelado), texto original, identificación de toma/segmento/revisión, evidencia temporal opcional, señales de confianza con procedencia o null, métricas y error explícito. Un score de otro proveedor no se considera calibrado ni comparable automáticamente.
Desactivar ASR deja audio disponible y estado «sin transcripción», no texto vacío falsamente exitoso. Desactivar preparación solo si formato compatible; validar combinaciones antes de ejecutar. «Apagado», «no disponible» y «falló» son estados distintos.
Adaptadores de API en servidor: ninguna clave en celular/PC navegador. Decidir límite y borrado del búfer ASR; no convertir el relay actual en almacenamiento permanente implícito. Idempotencia por ejecución, concurrencia acotada, cancelación y resultados tardíos ligados a su toma, no al dictado activo.
Comparación paralela de motores: misma toma congelada en ramas independientes; no votación ni mezcla automática. Puntos de conexión estables permiten repetir una etapa sin recapturar.

## Aporte de Meta y ablaciones
Meta puede ser ASR principal, no solo corrector añadido. Medir Muse sin contexto frente al mismo motor con glosario/contexto general autorizado.
Más adelante comparar baseline ASR, ASR + glosario, ASR + propuestas Meta, y combinación. Cambiar un módulo cada vez.
Propuesta textual: fragmento original, alternativa, fundamento, señales usadas, riesgo y abstención. Un LLM de texto no oye la voz ni recupera con certeza la palabra pronunciada. Desacuerdo entre motores es señal de revisión, no verdad. Las alternativas generadas no son hipótesis acústicas salvo que procedan realmente del ASR.
Nunca modificación silenciosa de negación, lateralidad, números/unidades o hallazgos. Cualquier propuesta se muestra con original; reglas automáticas ayudan pero no garantizan conservación semántica. Cero cambios silenciosos es requisito del sistema; cero errores observados en una muestra no prueba seguridad clínica.
Confirmar que el uso concreto satisface el reglamento del evento, todavía no verificado íntegramente.

## Experimento propuesto, no ejecutado
Primero comprobar acceso y contratos con cinco frases ficticias; es prueba de integración, no ranking.
Piloto: 60 tomas de 2–10 s grabadas por el responsable con el S25 Ultra: 20 de desarrollo y 40 reservadas. Separar también por familias de frases para reducir filtración; se conserva limitación de un solo hablante.
Casos: rutina radiológica, términos difíciles y confusiones fonéticas, negación/lateralidad, medidas/decimales/unidades, siglas, pausas/reformulaciones; añadir silencio y ruido como controles separados. El texto de referencia refleja lo realmente pronunciado, revisado antes de ver resultados de motores. Pronunciar casos ficticios con voz humana; TTS no representa por sí solo el uso real.
Reutilizar exactamente los mismos WAV para todos los motores. Referencia y términos por caso no se pasan al motor. Glosario general congelado en desarrollo, con distractores y términos ausentes para medir inserciones; ningún ajuste después de mirar el test reservado.
Primera ronda: tres motores sin contexto ni corrector, configuración española cuando disponible. Segunda: mejor candidato y Meta con/sin contexto. Tercera posterior: corrector activado/desactivado. Opcional turbo solo si interesa resolver coste/latencia del baseline.
Métricas: WER con normalización documentada que no borre negaciones/unidades; recall/precisión de términos marcados; errores críticos por toma y categoría; exactitud de cifras/lateralidad/negación; inserciones en silencio; tiempo humano de edición y aceptación/rechazo.
Separar preparación, cola, petición de servicio, primer texto y final visible. Si proveedor no informa inferencia interna, el tiempo de petición incluye red/cola y no se etiqueta inferencia. Alojamiento local: registrar frío/caliente y hardware. Tres repeticiones por audio/modelo para variabilidad temporal con orden alternado; no contarlas como audios independientes de exactitud.
Medir modo archivo inicialmente; comparar streaming después sobre las mismas grabaciones reproducidas a velocidad real. No comparar latencia de archivo subido de golpe con streaming sin distinguir protocolo. Red del teléfono influye en recorrido completo; evaluación ASR sobre WAV recibido aísla ese factor.
Registrar fallos, timeouts, coste facturable real/estimado identificado, n y P50/P95. Bootstrap pareado por audio en comparación exploratoria, sin falsa precisión con pocas muestras.

## Criterios propuestos para acordar
Técnicos: formato válido, un final por toma, sin duplicación, original preservado, errores explícitos, credenciales fuera del cliente, métricas exportables y cambio de adaptador sin modificar captura.
Selección: primero errores críticos y esfuerzo de revisión, luego terminología, latencia y coste; no declarar ganador por WER global solamente. Si uno mejora velocidad y empeora exactitud, presentar el intercambio.
Objetivos numéricos clínicos y de demora final deben acordarse tras piloto; no prometer umbrales sin medir.
Antes de implementar: confirmar acceso Meta, vía de baseline (API/local), presupuesto del piloto y si la primera experiencia puede mostrar texto al soltar o requiere parciales mientras habla. Estas decisiones no bloquean el diseño de contratos.

