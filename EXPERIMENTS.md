# Evaluación reproducible

Estado al 28-10-2026: protocolo de IA propuesto; corpus clínico y evaluador ASR aún no creados. Se ejecutaron comprobaciones técnicas de captura y transporte que se detallan abajo. Los umbrales son metas de ingeniería, no criterios de validación clínica.

## Resultados efectivos de infraestructura · 28-10-2026

- `node --test tests/*.test.mjs`: 17 pruebas aprobadas en la primera ejecución. Cubren descarte fuera de toma, vaciado final, toques breves, límite, PCM/WAV, roles, códigos, integridad, duplicados, desorden, cierre y origen.
- `node scripts/check.mjs`: comprobación de sintaxis aprobada.
- `node scripts/smoke-remote.mjs <URL HTTPS de demo>`: PASS a las 18:32:13 UTC (15:32:13 America/Santiago). Dos clientes sintéticos a través de HTTPS/WSS público, diez bloques, 16.000 muestras a 16 kHz. SHA-256 coincidente: `995184ad5270b6d1c05c52633e4f2a753d575d6c7ad29ca63cdc34e5f307cf69`.
- Navegador de escritorio, interfaz de emisor y receptor por URL pública: emparejamiento y dos controles probados con oscilador de 440 Hz, sin abrir micrófono real. Inicio/parada: 57 bloques, 271.616 muestras a 48 kHz; mantener pulsado: 19 bloques, 87.424 muestras a 48 kHz. Ambas tomas mostraron integridad verificada.

Estos resultados no validan el S25 Ultra, una red móvil, ausencia de cortes acústicos ni reconocimiento médico. Las duraciones de la prueba de interfaz no son un benchmark de latencia. La verificación física permanece en `tests/DEVICE_CHECKLIST.md`. Entorno: Windows, Node 24.19.0, pnpm 11.25.0, ws 8.22.0 y qrcode-generator 2.0.4; versiones e integridades en el lockfile.

## Preguntas

1. ¿La asistencia Meta recupera términos médicos que el ASR reconoce mal?
2. ¿Con qué frecuencia propone cambios incorrectos, incluso cuando el original era correcto?
3. ¿El contexto aporta beneficio frente a un glosario y reglas sin modelo?
4. ¿El flujo responde con latencia útil sin duplicar, perder ni reordenar texto silenciosamente?

## Corpus inicial previsto

Crear 60 frases originales sintéticas: 20 de desarrollo y 40 de prueba final. Cubrir vocabulario radiológico, confusiones fonéticas con palabras comunes, negaciones, lateralidad, cifras/unidades, frases ya correctas, incertidumbre e interrupciones. Incluir controles donde una palabra común es correcta y no debe sustituirse por un término médico. Balancear categorías y documentar cantidades antes de medir.

Referencia escrita y spans clínicos revisados por el responsable médico antes de ejecutar modelos. Si solo revisa una persona, declararlo como limitación; una segunda revisión independiente es deseable. Grabar lectura consentida de textos sintéticos, idealmente con dos hablantes; si solo hay uno, limitar las conclusiones a ese contexto. La voz requiere consentimiento aunque el contenido sea ficticio. No incorporar identificadores de pacientes. Guardar audios localmente; publicar solo material expresamente autorizado.

Asignar `case_id`, categoría, referencia, spans protegidos, términos objetivo, origen, autorización, `speaker_id` seudónimo, dispositivo, condiciones y SHA-256 de audio. Dividir por frase/familia de confusión antes de derivar ruido o variantes, evitando que el mismo ejemplo aparezca en ambos conjuntos. Congelar manifiesto, prompts y glosario antes del test. No añadir al glosario la respuesta de casos finales después de observar errores.

Preparar una condición limpia y una variante de ruido controlado con receta, semilla y SNR documentados. Variantes de una misma frase no son muestras independientes. Pruebas separadas: silencio, habla cortada y reanudación. Un eventual audio TTS debe identificarse y no sustituye evaluación con voz humana.

## Comparaciones

| Variante | Finalidad |
| --- | --- |
| A · ASR sin asistencia | Baseline de reconocimiento |
| B · ASR + glosario/reglas sin Meta | Separar el aporte de reglas del modelo |
| C · ASR + contexto + propuestas Meta + validación | Intervención principal |
| D · C sin contexto clínico, opcional | Ablación para estimar aporte del contexto |

Usar exactamente las mismas salidas ASR almacenadas para B/C/D. No comparar con audios diferentes. Reportar por separado propuestas del modelo, propuestas visibles tras validar y texto revisado por humano. La corrección manual no puede atribuirse al modelo. Un corrector textual no prueba que haya reconocido acústicamente una palabra.

## Métricas

- **WER:** `(sustituciones + borrados + inserciones) / palabras de referencia`; publicar normalización exacta. Se permite normalizar mayúsculas y puntuación para WER general, pero conservar negaciones, números y unidades en métricas clínicas. Reportar texto bruto también.
- **Exactitud terminológica:** ocurrencias de términos objetivo correctas / ocurrencias anotadas, con política explícita para términos de varias palabras. Reportar errores y denominadores por categoría.
- **Precisión de sugerencias:** propuestas correctas / propuestas emitidas; **recuperación de errores:** errores terminológicos corregibles con propuesta correcta / errores terminológicos corregibles del ASR. Denominador cero se informa como N/A.
- **Sobrecorrección:** segmentos inicialmente correctos con propuesta incorrecta / segmentos inicialmente correctos. Separar emisión y aceptación humana.
- **Seguridad:** cambios incorrectos en negación, lateralidad, cifra/unidad, hallazgo y término relevante; contar propuestas peligrosas, bloqueadas, mostradas y aplicadas. Objetivo absoluto: cero cambios críticos silenciosos aplicados.
- **Abstención/cobertura:** segmentos evaluados sin propuesta y con propuesta; una abstención no cuenta como corrección exitosa.
- **Rendimiento:** latencias p50/p95, RTF = tiempo ASR / duración de audio, memoria máxima, errores/timeouts, coste por minuto y número de solicitudes cuando corresponda.

No establecer una mejora clínica numérica sin baseline. Para declarar beneficio exploratorio, exigir incremento de exactitud terminológica frente a A y B y reportar conjuntamente sobrecorrección y riesgos. Si no ocurre, informar el resultado negativo. La seguridad del MVP exige además controles de interfaz y pruebas; una media de WER favorable no basta.

## Medición temporal

Instrumentar recepción, cierre del segmento en servidor, entrada/salida de cola, inicio/fin ASR, inicio/fin Meta y renderizado. Medir duración de captura por muestras. Usar reloj monotónico dentro de cada proceso; no restar directamente relojes no sincronizados del celular y computador. Para latencia de extremo a extremo usar eventos correlacionados y sincronización estimada con error registrado, o una grabación externa con marcas observables.

Separar arranque en frío y 3 pasadas en caliente, mismo hardware/configuración y concurrencia 1. Declarar CPU/GPU/RAM, red, versiones, longitud de fragmento y parámetros. Objetivos desde cierre del fragmento: p95 ASR ≤ 5 s y sugerencias ≤ 8 s, con espera de captura separada. Medir también fin del habla → texto visible para no ocultar retraso por segmentación. No eliminar timeouts del reporte ni de la tasa de fallos.

## Batería obligatoria de integridad y seguridad

Reenvío del mismo fragmento; identificador repetido con contenido distinto; llegada fuera de orden; hueco de secuencia; desconexión y reconexión; palabra en límite de segmento; repetición legítima del dictado; silencio; cola llena; cierre con bloque parcial; permiso denegado; sesión vencida o ajena; respuesta Meta tardía tras edición manual; JSON inválido; offsets inválidos; instrucción maliciosa dentro del dictado; cambio de «sin» a afirmación; derecha/izquierda; 4/40 mm; cm/mm; incorporación o eliminación de hallazgo.

Para cada caso registrar entrada, conducta esperada, conducta observada y aprobación/fallo. Toda propuesta necesita acción humana; una respuesta inválida conserva el original. La aplicación debe bloquear exportación final de segmentos sin revisión explícita y avisar huecos pendientes. Un fallo en estos controles impide declarar el MVP aprobado.

## Reproducción y artefactos previstos

Cada ejecución tendrá `run_id`, commit, fecha UTC y zona local, hashes de corpus/prompt/glosario, modelo y revisión o identificador del proveedor, parámetros/semilla si aplica, hardware, versiones fijadas y comandos exactos. Guardar manifiesto, entradas autorizadas, respuestas crudas sin secretos, métricas por caso y resumen. Aun con temperatura cero una API puede no ser determinista; documentar cambios de versión y repetir solicitudes de control.

F2 añadirá el comando real de evaluación; no existe aún. Reportar diferencias pareadas e intervalos por remuestreo a nivel de frase si se implementan, sin tratar repeticiones como nuevos participantes. Una muestra pequeña no acredita seguridad clínica general.

## Resultados

| Experimento | Estado | Resultado |
| --- | --- | --- |
| ASR baseline | No ejecutado | N/D |
| Reglas frente a asistencia Meta | No ejecutado | N/D |
| Integridad de captura/transporte | Pruebas técnicas ejecutadas | Ver sección de infraestructura; teléfono pendiente |
| Seguridad de correcciones clínicas | No ejecutado | N/D |
| Latencia y recursos | No ejecutado | N/D |

## Prueba de instrumentación · 2026-10-28
22 pruebas automatizadas aprobadas, incluidas calibración/desfase/caducidad, estimaciones negativas, percentiles sin valores ficticios, fusión de confirmaciones, transmisión de métricas finales y rechazo de telemetría fuera de secuencia. Smoke público adicional: 10 bloques / 16000 muestras / 16 kHz, SHA-256 coincidente.

Navegadores del mismo PC por túnel HTTPS público, tono de 440 Hz a 48 kHz. Observaciones de desarrollo, no benchmark del S25 Ultra:

| Control | Bloques | Llegada estimada P50/P95 | Resolución orientativa P50 | Confirmación ida/vuelta P50/P95 | Parada → entrega verificada |
| --- | --- | --- | --- | --- | --- |
| Mantener | 19 | 87,4 / 157,6 ms | 85,4 ms | 170,7 / 240,7 ms | 184,7 ms |
| Inicio/parada | 30 | 86,5 / 152 ms | 92,5 ms | 171,2 / 239,7 ms | 176,4 ms |

Ambas tomas verificadas, cero errores de secuencia y duplicados registrados. La resolución es del mismo orden que la estimación: no inferir latencia unidireccional precisa. No se validaron aún red 4G/5G, captura física, exactitud médica ni rendimiento ASR. Procedimiento y semántica en [METRICS.md](METRICS.md).

## Evidencia aportada por el responsable · toma 4
Se conservó el JSON original y una ficha en [experiments/results/2026-10-28-user-take-4](experiments/results/2026-10-28-user-take-4/README.md). El usuario informa conexión correcta, QR sencillo y audio audible correctamente. El JSON registra 182 bloques de micrófono, 18,1387 s, integridad verificada y ningún error de secuencia registrado. No documenta red, versiones ni build; no se atribuye esta observación a Wi-Fi o 4G/5G ni se declara cerrada la aceptación completa en dispositivo.

## 4G en celular y Wi-Fi en PC · evidencia del usuario
Resultados y originales: [prueba 4G/Wi-Fi](experiments/results/2026-10-28-4g-phone-wifi-pc/README.md). Una toma de micrófono de 8,504 s, 86 bloques, integridad verificada y QR directo emparejado. Percentiles, bytes, secuencias y coincidencia entre exports comprobados. Redes según declaración del usuario. Confirmación ida/vuelta P50 426,4 ms / P95 579,3 ms; parada → entrega 446,6 ms. No cierra aún el protocolo de aceptación de ambos controles, 30 s, interrupciones o fidelidad auditiva.

## Comparación móvil / Wi-Fi · dos lotes del usuario
[Resultados y originales](experiments/results/2026-10-28-mobile-vs-wifi/README.md): cinco tomas mantener por condición, diez íntegras. Parada → confirmación mediana 1309,3 ms móvil frente a 281,3 ms Wi-Fi; máximo 4726 frente a 290,6 ms. Wi-Fi más estable en estos lotes. Se recalcularon resúmenes y validaron secuencias/bytes. Sin ranking universal de redes ni prueba en Wi-Fi hospitalario.
# Laboratorio ASR · prueba de integración 2026-10-28

Muse en dictado, comprobación posterior: [resultado real](experiments/results/2026-10-28-live-muse/result.json). Frase sintética ya utilizada, 56 bloques por relay público y audio íntegro. Motor seleccionado Muse, respuesta HTTP 401; total de tarea 1106,6 ms, sin texto y sin latencia de texto. No se reinició backend para conservar la clave solo en memoria: build/sourceHash de la ejecución identifican el servidor previo; el selector servido desde disco corresponde a UI `muse-live-v1`, identificada aparte. No se afirma autenticación exitosa ni rendimiento ASR. La clave no se incluye en evidencia.

Extensión posterior: [captura/transporte conectados con Whisper](experiments/results/2026-10-28-live-whisper/README.md). Entrada sintética enviada por túnel público, receptor web real, inferencia GPU y texto por toma. Control de 5,54 s con modelo cargado: fin recibido PC→texto 2,473 s; parada→texto estimada 2,519 s. Se conserva un control previo con defecto de codificación en la fuente, sin usarlo para evaluar precisión. No sustituye la aceptación del dictado físico del S25 Ultra.

[Evidencia y procedimiento](experiments/results/2026-10-28-lab-smoke/README.md): Whisper large-v3 FP16 ejecutado en GPU Intel Arc mediante OpenVINO, frase sintética de 5,54 s y silencio de 2 s. Repetición de frase con modelo cargado: total 2,250 s, generación 2,220 s. WER literal 1/13 por tres/3, no error clínico adjudicado. Silencio generó «Gracias.»; resultado adverso conservado. Variante beams=3 falló en GPU. Muse aún sin credencial real; no hay comparación de motores completada. Los tests de su adaptador usan fixtures identificadas.

# Comprobación Muse: 28 de octubre de 2026

Objetivo: verificar autenticación y una transcripción de archivo sintético, con resultado textual y tiempos observados. Criterio: GET /v1/models exitoso y ejecución finalizada con transcript; comparar con referencia existente, sin umbral de rendimiento prefijado. Una repetición de lab-frase-sintetica.wav, 5,542 s; Muse base v1, español, sin keywords, WAV derivado mono PCM16 16 kHz. Red no identificada en esta ejecución; no atribuirla al teléfono ni a Wi-Fi.

Resultado: models HTTP 200 en 1008 ms; transcripción completada y coincidente con la referencia de 13 palabras (WER 0). Cola 5,70 ms; preparación 968,25 ms; petición HTTP completa 2213,52 ms; ejecución total 3187,73 ms, sin cola ni captura del audio. La petición incluye transporte y servicio remoto, no mide inferencia aislada. Preparación puede incluir inicio del proceso Python. No se midió primer texto ni streaming. Evidencia: `experiments/results/2026-10-28-meta-auth/muse-synthetic-success.json`, con configuración, hashes, tiempos y versión reportada al iniciar servidor. No demuestra superioridad sobre Whisper ni precisión clínica general.


## 28-10-2026 · Mismo audio: Muse frente a Whisper local

Pregunta exploratoria: comparar texto y demora, separando carga inicial de Whisper del uso con modelo cargado. Criterio operativo: ejecución completa sobre el mismo audio y métricas conservadas; sin umbral de velocidad ni ganador prefijado. Audio sintético de 5,542 s, referencia de 13 palabras. Muse base anterior; dos ejecuciones nuevas de Whisper large-v3 FP16, OpenVINO GPU Intel Arc iGPU, español, beams=1. Segunda toma motivada por la carga inicial observada.

| Condición | Preparación ms | Petición al motor ms | Carga ms | Generación ms | Total ms | WER literal |
|---|---:|---:|---:|---:|---:|---:|
| Muse anterior | 968,25 | 2213,52 | no medido | no medido | 3187,73 | 0 % |
| Whisper primera | 4,67 | 13718,20 | 11218,05 | 2290,15 | 13730,08 | 7,69 % |
| Whisper ya cargado | 11,51 | 1921,02 | 0 | 1915,69 | 1941,12 | 7,69 % |

Carga y generación están incluidas en petición Whisper; no sumarlas nuevamente. Total excluye cola y captura. Petición Muse incluye transporte remoto, no mide inferencia aislada. Preparación Muse puede incluir inicio del worker, a diferencia de las siguientes tomas. Los intervalos son mediciones directas del servidor/worker; precisión y sobrecosto de instrumentación no calibrados en esta prueba.

La única sustitución léxica fue «tres» por «3», con cantidad equivalente en esta frase; WER literal penaliza formato numérico. Whisper también devolvió un espacio inicial conservado en el resultado. Negación, medida y lateralidad se mantuvieron. Hashes originales y derivados idénticos en las tres ejecuciones, verificadas como completed. Evidencia completa: experiments/results/2026-10-28-meta-auth/muse-whisper-comparison.json. IDs Whisper: 3f5b6b02-1776-4117-bd40-26ef630476c8 (cold=true), 1298102e-116b-4626-89d4-1379e0b5f5fb (cold=false). Resultados también persistidos en el catálogo del laboratorio.

No se determinó red ni navegador: ejecución por API local sobre archivo, no celular-PC. Se conserva build reportado al arrancar servidor, sin reasignarlo al HEAD posterior. Una frase y una muestra por condición no prueban superioridad general ni representan un benchmark equilibrado.

## Comandos · control de integración del 28-10-2026
Protocolo y criterios en DICTATION_COMMANDS.md. Hipótesis operativa: un módulo común puede aplicar comandos explícitos reconocidos sin sustituir texto clínico; precisión del ASR se mide separadamente. Métricas: texto original/formateado, eventos con offsets, dudas, tiempo de formato (ms) y etapas existentes. Criterio: conservación del original, salida esperada en controles, modo desactivado y persistencia/exportación. No se fija un umbral clínico.

Control sintético de 7,08 s generado con Windows Helena, frase y resultados completos en experiments/results/2026-10-28-dictation-commands/control.json. Muse en vivo: seis eventos, salida esperada y 1,61 ms de formato; 3868 ms total servidor, ~4080 ms parada→DOM estimados. Repetición en laboratorio: duplicación de «conclusión» conservada. Whisper inicialmente dejó «2 puntos» literal; tras ampliar el reconocimiento de esa variante, salida con saltos y dos puntos esperados; 2110 ms total en caliente, 0,21 ms de formato. Cantidad representada como 3, no tres. No se confunde WER literal frente a comandos hablados con precisión de formato. No son repeticiones equilibradas para elegir ganador. Versiones/sourceHash originales preservadas; diferentes revisiones durante desarrollo, sin reescribir ejecuciones históricas.

Pendiente: 6–10 tomas propias de 2–10 s, referencias revisadas, mismos WAV por motor, Whisper caliente, alternar orden y registrar fallos. Revisión manual de comandos esperados, negaciones, medidas y lateralidad; sin inferir corrección clínica a partir de WER. La vista muestra cantidad de reglas aplicadas, no tasa de acierto de comandos. Una regla literal no detecta comandos que el ASR haya omitido o convertido en signos.
