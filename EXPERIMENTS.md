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

## 28-10-2026 · Voz del responsable, seis capturas nuevas
Protocolo: comparar mismos WAV originales/derivados entre Muse base y Whisper FP16 GPU beams=1, español, comandos activos. Una repetición nueva por motor, alternando orden. Pregunta: comportamiento del formato y tiempos con Whisper cargado; criterio operativo: pares completos y hashes idénticos. Verificación: 12/12 completadas, seis Whisper cold=false/loadMs=0. Cinco dictados de 16,976 / 6,875 / 20,243 / 5,344 / 12,685 s; captura de 0,048 s analizada aparte. Red no determinada; origen celular comunicado por usuario y microphone en telemetría original. Intervalo totalMs: ejecución del servidor, excluye cola y captura/transporte celular. Los resultados originales en vivo se conservan aparte, sin asignar sus latencias a la comparación de archivos.
Totales por toma, Muse/Whisper (ms): 4233,63/3829,76; 1758,19/2060,44; 5003,80/4815,65; 1455,12/1861,64; 3143,13/2873,93. Media 3118,77/3088,29; mediana 3143,13/2873,93. No hay evidencia estadística de superioridad con cinco audios y una repetición. No hay referencia revisada: WER y precisión de comandos no calculados. Se observaron discrepancias de vocabulario, duplicaciones y comandos omitidos por ASR; el formato conserva esas salidas sin corrección clínica. La captura mínima generó texto no vacío con Whisper y vacío con Muse; no se declara silencio sin escucha.
Evidencia local (no incorporada al repositorio): data/local/lab/reports/2026-10-28-phone-commands/comparison.json y REVIEW.md, junto al catálogo. Contiene resultados, configuración, hashes, build/sourceHash originales y mediciones. Un filtro de fechas defectuoso incorporó ejecuciones anteriores; cinco se completaron y trece se cancelaron. Todas excluidas por IDs explícitos, con detalle en excludedRuns; no se borró el historial. No se cambió código durante el experimento.

## Glosario radiológico: piloto de comparación (28-10-2026)
Se ejecutaron cinco audios del responsable, dos repeticiones por audio y configuración: Muse base, Muse con 20 términos radiológicos y Whisper large-v3 OpenVINO FP16 ya cargado (30 ejecuciones completas). Se preservaron hashes y originales. Protocolo, configuraciones, resultados y revisión están en data/local/lab/reports/2026-10-28-glossary/ (datos locales excluidos de Git). Batch: c4998150-f7b6-47c2-8978-47cc92a62b74.

Tiempo total medio, excluyendo cola/captura/transporte: Muse base 2725,76 ms; Muse con glosario 3049,16 ms; Whisper caliente 3047,09 ms. Todas las ejecuciones Whisper tienen cold=false y loadMs=0. Dos repeticiones por audio no sustentan conclusiones estadísticas ni una clasificación general de motores.

En las dos tomas pertinentes, «atelectasia» apareció en 4/4 salidas con glosario frente a 0/4 en Muse base y 0/4 en Whisper. Persisten repeticiones y discrepancias en decimales y negaciones. No hay referencias revisadas por el profesional: no se declara WER, precisión clínica ni ausencia de errores nuevos. El glosario usa vocabulario de audios ya conocidos; hace falta validación con tomas nuevas antes de adoptarlo como mejora general. Las salidas de este experimento preceden al nuevo normalizador numérico y no se reescribieron.

## Prueba inicial streaming · 28-10-2026
Hipótesis: mostrar borradores antes del fin de una toma manteniendo final único, formato y audio recuperable. Aceptación: parciales reemplazables, texto final independiente, hash íntegro, números/comandos únicamente al final, fallos visibles y exportación. Las referencias clínicas requieren confirmación humana.

Prueba real con frase sintética de 5,542 s reproducida a ritmo de audio desde script local: Muse devolvió 12 parciales, primer parcial a 1965,63 ms desde inicio aceptado, conexión 1137,34 ms, end recibido → final 1032,47 ms y endStream → final 168,72 ms. Final original conservó «tres milímetros»; formato mostró «3 milímetros». Run 1dac053c-ce65-4236-986d-7be2a05102b1. No se modificó el glosario (sin términos).

Segunda prueba: emisor de protocolo sintético → relay local → receptor real en navegador → Meta. Integridad confirmada, un único texto añadido al informe; primer borrador visible a unos 2,38 s y fin recibido en PC → DOM final a unos 1,37 s. Sin calibración de parada del emisor: stopToTextEstimateMs permanece null. No se utilizó el micrófono físico ni una red móvil: son pruebas de integración.

Pruebas automatizadas: 44 satisfactorias; incluyen independencia de bloques del remuestreo, autenticación en handshake, rechazo de origen, revisiones/duplicados, integridad incorrecta, cancelación y persistencia. Tras ajustar límites de espera se repitieron los 9 controles de streaming, laboratorio y puente: satisfactorios.

Siguiente validación humana: tres tomas de 2–10 s desde S25 por Wi-Fi: «No hay derrame pleural punto nueva línea», «Nódulo de tres milímetros en el pulmón derecho punto» y «Lesión de dos coma cinco por ocho milímetros punto». Revisar negación, lateralidad, 3, 2,5 y 8, saltos y ausencia de duplicación. Guardar referencia hablada en laboratorio y ejecutar Muse por toma/Whisper sobre esos mismos audios; no volver a grabarlos para esa comparación. Evaluar aparte tiempo de respuesta y calidad de formato.

Verificación de versión activada: repetido el recorrido completo tras ajustar tiempos límite. El receptor mostró primer borrador a 1,79 s y final a 0,82 s desde fin recibido en PC; el intervalo del servidor end → final fue 0,67 s. Texto final sin duplicación y 3 en cifras. Se conserva también la ejecución anterior (1,37 s); no seleccionar solo el resultado más rápido como rendimiento esperado. Captura visual local .runtime/streaming-verificado.png. La variación temporal requiere más tomas reales.

## 28-10-2026 · Seis tomas reales de streaming y comparación por archivo
Se identificaron seis ejecuciones de micrófono completas con integridad verificada (tomas 1, 2, 3, 4, 5 y 7). Se congelaron sus IDs en data/local/lab/reports/2026-10-28-streaming-phone/protocol.json. Dispositivo S25 Ultra según usuario; red no registrada en estas ejecuciones. Duraciones de 9,56 a 23,35 s. No hay referencias humanas confirmadas; no se calculó WER ni precisión clínica y no se realizó escucha humana de referencia.

Se ejecutaron los mismos WAV, comprobando hashes, dos veces por Muse por toma con el mismo glosario de 20 términos y por Whisper large-v3 FP16 OpenVINO beams 1. Batch 1b6a2d53-4801-403c-b2b1-0d024aa43c76: 24/24 completadas, doce Whisper cold=false y loadMs=0. Calentamiento separado y excluido. Con los seis resultados streaming originales, el informe conserva 30 ejecuciones. Preparación diferente: streaming 24 kHz sinc-Hann; archivo 16 kHz scipy. No atribuir causalmente todas las diferencias al modo de entrega.

Auditoría: cinco conversiones numéricas y veinte eventos de comandos en streaming. Concordancia de cantidades entre las tres modalidades: 5, 2,5, 12 por 8 y 4; no equivale a validación de lo pronunciado. Dos salidas streaming conservan doble punto final y una conserva minúscula tras encabezado y salto. Muse por toma presenta repeticiones léxicas adyacentes en 6/12 salidas; streaming 0/6 y Whisper 0/12 bajo el detector descriptivo del informe. Whisper repite exactamente el original en 6/6 pares de audios; Muse en 1/6. La repetición de comandos puede dejar palabras o puntuación sobrantes. No se modificaron las reglas ni las salidas históricas.

Promedios: inicio recibido → primer borrador streaming 3060,77 ms; fin recibido PC → texto 1271,42 ms; detener → texto estimado 1336,06 ms. Procesamiento por archivo: Muse 3295,75 ms y Whisper caliente 3477,11 ms, excluyendo cola/captura/transporte. Estos últimos intervalos no equivalen a espera tras detener en streaming. No se extrapola rendimiento con seis audios y dos repeticiones.

Evidencia local: comparison.json (metadatos, textos y métricas completos), summary.json, runs.csv y REVIEW.md en la carpeta del protocolo. Pendiente: cotejar referencias con el responsable y definir una nueva versión de reglas para doble punto y mayúscula tras encabezado, sin borrar automáticamente negaciones repetidas.

## 28-10-2026 · Corpus de nueve grabaciones aportadas (guía páginas 1 y 2)
Se inspeccionaron visualmente ambas páginas de la guía y se inventariaron nueve M4A del ZIP, de 38,40 a 44,99 s. Originales y hashes conservados en datos locales; se decodificaron copias PCM16 mono a 24 kHz para importación al laboratorio. Configuración/preparación documentada en data/local/lab/reports/2026-10-28-multivoice/protocol.json y manifest.json. Las etiquetas de página se infieren del nombre original y requieren confirmación; no se verificó identidad de lectores.

Primera pasada exploratoria: 18/18 ejecuciones completas, una por motor y archivo. Muse por toma usa el glosario existente de 20 términos, sin ajustarlo a las nuevas salidas; Whisper large-v3 OpenVINO FP16 beams 1 estaba caliente (9/9 cold=false). Batch dae0d881-1ec2-49fc-b0d1-18e7d38e7e9e. Promedio de procesamiento por archivo: Muse 8160,16 ms; Whisper 12862,20 ms. Incluye preparación interna y formato; excluye cola y decodificación M4A previa. Son audios más largos que el objetivo de 2–10 s y no una evaluación de streaming.

El guion no se registró como transcripción humana verdadera. Lectores pueden omitir títulos/cambiar palabras y la página 2 permite comandos libres; no se calculó WER. Hallazgos a cotejar: ambos motores devuelven milímetros para la medida de 2,5 en un archivo, aunque el PDF indica centímetros; Whisper produce 2.9 alrededor de un encabezado en dos archivos; Muse produce «dos coma cinco cinco» en dos archivos y el normalizador conserva esa ambigüedad con aviso. Punto aparte no está soportado como comando completo y puede dejar «aparte» literal. No se corrigen unidades ni se ejecutan instrucciones dictadas.

Textos originales/formateados, métricas, controles por archivo y próximos pasos en REVIEW.md, comparison.json, summary.json y runs.csv del directorio local. Pendientes: referencias humanas, replay streaming de los mismos audios a ritmo real, repetición temporal y corpus realmente nuevo reservado. Estos resultados por archivo no invalidan ni confirman la experiencia streaming del S25: son condiciones diferentes.

## 28-10-2026 · Replay streaming de los nueve audios multivoz
Se reprodujeron secuencialmente los nueve PCM del corpus aportado, bloques de 80 ms programados con reloj monotónico. Una pasada por archivo, mismo glosario Muse existente de 20 términos, reglas es-basic-v1 y es-cardinals-v1 sin cambios. 9/9 completadas, PCM de origen y guardado idéntico en 9/9. El contenedor WAV canónico puede cambiar hash/audioId: la asociación se conserva por PCM y manifest. Se compara con las 18 ejecuciones por archivo previamente guardadas, no con audios regrabados.

Evidencia: data/local/lab/reports/2026-10-28-multivoice/streaming/ contiene protocol.json, JSON por replay con frames/eventos, comparison.json (27 ejecuciones), summary.json, runs.csv y REVIEW.md. sourceHash del servicio permaneció 1640186449dc3b7b80a9df56790d5511518fb62d987cca9840a37d4a05874af1. Trazas del emisor: 4658 frames; retraso respecto a programación máximo 22,46 ms, media 7,00 ms. Duración total de envío menos audio entre -0,06 y 70,90 ms (fraccionamiento del último bloque y resolución del temporizador). No se infiere exactitud física del reloj.

Promedios: primer parcial recibido en emisor 3290,04 ms; fin de envío → done 1340,84 ms (rango 1032,28–1700,05 ms); servidor end recibido → final Meta 1232,85 ms; endStream → final 187,78 ms. Los tiempos por archivo previos fueron Muse 8160,16 ms y Whisper caliente 12862,20 ms. Son intervalos diferentes: streaming procesa durante la reproducción, done incluye persistencia/transporte local y no renderizado. No es una prueba del micrófono/red del S25. Preparación diferente: streaming sinc-Hann 24k frente a scipy 16k en archivo.

El detector descriptivo de repetición adyacente de palabras en texto formateado encontró casos en 0/9 streaming, 7/9 Muse archivo y 0/9 Whisper. No mide toda repetición ni precisión clínica. Persisten discrepancias: streaming devuelve ecografía computada y metástasis de tamaño en voice-02; voice-01 conserva puntos literal; voice-07 reconoce nueve línea y el formato escribe 9 línea. La ausencia de avisos numéricos no demuestra ausencia de errores contextuales. En lectura sin comandos puede faltar puntuación. No hay referencia humana ni WER; todos los casos y originales se conservan sin corrección.

## 29-10-2026 · ENDPOINTING: control previo al celular
Hipótesis y criterios registrados antes de inferencia en protocol.json por scripts/smoke-endpointing.mjs. Reproducir: node scripts/smoke-endpointing.mjs <ID de audio sintético>. Dos copias de una frase previamente sintética, cada una seguida por 3 s de silencio PCM; reproducción 80 ms a ritmo real, una repetición, Muse sin glosario, mismas reglas de números/comandos. No es comparación pareada ni ensayo de precisión.
Resultado: run 610ce6f1-0f89-4d33-be6d-59ca04f57edb, completed, 3 segmentos e integridad verificada. Fin recibido por backend→cierre final 1593,38 ms. Los tres finales llegaron antes de terminar el audio. La primera copia se consolidó como una intervención y la segunda como dos: límites variables, no equivalencia segmento/oración. Conservar ese resultado como limitación. Texto y eventos/configuración/sourceHash en data/local/lab/reports/endpointing-1793285684603/result.json; protocolo adyacente. No hubo teléfono físico en ese control ni nuevas referencias clínicas.
Próximo ensayo humano: 3–5 tomas sintéticas con pausas entre frases y dentro de decimal/negación/comando; usuario declara red/navegador. Guardar tomas y repetir posteriormente el mismo audio en modo manual para comparación. Umbral de comodidad de latencia pendiente del usuario; no declarar superioridad por este smoke.

## Primer piloto físico ENDPOINTING, 29-10-2026
Tres tomas seleccionadas por IDs explícitos, preservadas en reports/2026-10-29-phone-endpointing/review.json. Revisión retrospectiva, no experimento pareado: no atribuir mejoras al glosario ni al modo automático. Integridad 3/3; segmentos 1/1/1. Los finales de segmento llegaron al backend después de recibir fin de entrada en las tres: no prueba consolidación durante pausas antes de soltar. Valores estimados de parada→texto tomados de captura: 2080/1930/1620 ms redondeados; media 1876,7 ms aproximada, no latencia acústica. Usuario satisfecho; red de esta serie no confirmada. Sin referencia oral validada ni WER. Falta toma con varias intervenciones/pausas manteniendo pulsado y posterior contraste manual sobre mismo PCM; conservar reglas actuales.

## 29-10-2026 · piloto Revisor Meta
Protocolo escrito antes de ejecutar en data/local/lab/reports/meta-review-pilot-1793311854117/protocol.json. Siete textos sintéticos, una repetición, expectativas redactadas por el agente y NO validadas por médico; sin audio enviado al LLM. Modelo muse-spark-1.3, radiology-review-v1, configuración/hash en resultados locales. Red, dispositivo de captura y navegador no aplican a texto generado; red de ejecución desconocida (null).
Resultados: 7/7 respuestas completas. Propuso Ate tacia→Atelectasia y se observan derrame→se observa derrame; abstuvo en controles correcto, decimal, negación e instrucción incrustada; alertó 25 centímetros sin reemplazar. Peticiones 1,43–4,16 s. No prueba robustez general ante instrucciones ni mejora clínica de precisión. No WER de LLM calculado sin referencia humana.
Segundo protocolo previo en data/local/lab/reports/2026-10-29-meta-review-phone/protocol.json: mismas tres tomas sintéticas del teléfono, solo texto guardado, una revisión por toma. 3/3 completas. Primeras dos sin sugerencias; tercera propone se observan derrame→se observa derrame. Peticiones 1996,87 / 3843,17 / 5742,82 ms; colas 31,07 / 2020,72 / 5900,78 ms. No aplicadas; originales intactos. Audio/red iniciales no se vuelven a medir ni se atribuyen al entorno del LLM. Evidencia completa en results.json. Se conservan resultados aunque luego el médico discrepe.
Interfaz: fixture simulada aislada en puerto 8792 verificó Aceptar y Deshacer, con original intacto. No se contabiliza como llamada Meta. Pendiente evaluar sensibilidad, falsos positivos, errores introducidos, tiempos de decisión humana y mayor número de repeticiones con corpus reservado.

## 29-10-2026 · revisión multivoz y editor con plantillas
Protocolo previo: data/local/lab/reports/2026-10-29-review-multivoice/protocol.json. Nueve audios de lectura ya transcritos; 27 resultados ASR guardados, una revisión Meta por resultado, sin repetir audio/ASR ni modificar reglas. Se enviaron solo campos de revisión, no pauta ni nombres de archivo. No existe conjunto independiente reservado en esta corrida; referencias por lectura aún pendientes de validar escuchando.
Resultados: 25 revisiones validadas, 2 rechazadas por fragmento inexistente/ambiguo/solapado (una Muse-Normal y una Muse-streaming). Originales conservados, ninguna propuesta aplicada. Muse-Normal: 8/9 válidas, 28 propuestas (10 alertas sin reemplazo), mediana petición 8,50 s. Muse-streaming: 8/9 válidas, 3 propuestas (1 alerta), mediana 6,21 s. Whisper local: 9/9 válidas, 24 propuestas (2 alertas), mediana 7,30 s. Medianas excluyen respuestas rechazadas; resultados JSON conservan también sus tiempos y respuestas. Estos son tiempos de REVISOR, no ASR. Menos propuestas no demuestra mayor precisión; calidadVerdict=null y referenceValidated=false.
Casos para valorar: correcciones fonéticas a atelectasia, duplicaciones y sugerencia de eliminar un resto «aparte» que podría interferir con comandos. Ninguno se etiqueta acierto clínico sin revisión. Evidencia y tarjetas por caso en REVIEW.md local; no se reintentaron los fallos.
Editor: 8 pruebas unitarias nuevas, suite total 66/66 aprobada, sintaxis verificada. Navegador con fixture aislada probó selección y borrador en sitio, mover cursor sin cambiar destino, final, deshacer exacto, portapapeles conservando saltos, plantilla guardada y borrador restaurado al recargar. Página /live integrada comprobada. Sin prueba física de S25 en esta sesión.

## Biblioteca de plantillas · 2026-11-01 (fecha de contexto del responsable)
Corpus completo del Escritorio importado localmente; fechas UTC de ejecución conservadas en protocolos sin alterarlas. 285 textos distintos y 732 duplicados agrupados, 603 archivos + 354 miembros de ZIP. Los 12 errores iniciales de lectura eran archivos de bloqueo ~$, reclasificados explícitamente; evidencia inicial conservada. El candidato PDF DefecoRM resultó artículo por cabecera/resumen y quedó referencia; 38 PDF y 2 presentaciones separados. No hay validación clínica ni inspección visual exhaustiva.
Pruebas de importador: división reversible, conservación de ambiguos, codificación/nombres, deduplicación exacta preservando variantes, ZIP sin extracción de rutas y Word con aviso de tablas. Prueba API de catálogo local/ausencia/archivos no expuestos. Interfaz aislada: búsqueda torax sin acento, filtro Tomografía, favorita, Solo favoritas y crear informe con TAC tórax. No se tocaron la página ni el servidor principal durante la prueba del responsable.

## 01-11-2026 · acceso y recursos, sin nueva inferencia
Hipótesis de recuperación: renovar túnel inválido restaura acceso conservando laboratorio; aceptación previa: HTTP local/público 200, QR directo, código manual confirmado y PID de laboratorio intacto. Resultado: aprobado con sondas sintéticas, transporte 10 bloques/16000 muestras/16 kHz con hash idéntico; prueba de puente local aprobada. Fallo previo DNS/Unauthorized preservado junto a éxito, evidencia data/local/operations/20261101-183146. No equivale a prueba móvil física ni alojamiento estable.

Hipótesis de auditoría: catálogo completo por panel e historial sin límite aumentan trabajo con sesiones largas. Diagnóstico reproducible: node scripts/audit-resources.mjs; protocolo y resultados en data/local/audits/2026-11-01T21-33-52-665Z. 5 respuestas HTTP 200, 1.220.916 bytes cada una; 21,18–90,68 ms, mediana 26,44 ms. Catálogo 1.528.557 bytes, 55 audios/167 runs/35 revisiones. Sobre snapshot, medianas de cinco: parseo 4,64 ms, serialización sin disco 8,20 ms, score de todos los runs 0,92 ms; solo 3 audios con referencia guardada. Editor aislado: 1000 ediciones dejan 1000 snapshots y 5.599.500 caracteres lógicos retenidos, no bytes de heap medidos. Sin comparación de optimizaciones ni nuevas reglas. Detalle, límites y protocolo físico A/B/C en CODE_REVIEW_2026-11-01.md.


## 01-11-2026 · consultas compartidas y retención corregidas
Implementado sharedState con una petición en vuelo y caché de 150 ms compartida por consumidores de la página. Paneles de revisión comparten un temporizador de 1,5 s; se retiran suscripciones desconectadas. Laboratorio y espera de transcripción usan la misma función. Retención cuenta solo tarjetas directas .clip, conserva cinco elegibles y protege trabajo/edición pendiente; al guardar una edición se vuelve a recortar. El historial del laboratorio no se borra.
Comparación controlada: cinco paneles, veinte intervalos virtuales, baseline reconstruido de sondeos independientes 100 solicitudes frente a 20 ejecutando código nuevo (80% menos). Evidencia data/local/audits/polling-2026-11-01. No es tráfico de navegador capturado ni reducción medida de latencia ASR; no se redujo tamaño de /api/state ni se optimizó persistencia. node --test tests/review-polling.test.mjs reproduce pruebas de consultas, reintento y retención; suite completa 70/70 y sintaxis aprobadas. Cambios estáticos: recargar PC después de exportar; laboratorio no reiniciado y biblioteca sigue pendiente.


## 01-11-2026 · disposición enfocada integrada y biblioteca activada
Implementada focused-workspace-v1 en /live, reutilizando editor y manejadores existentes: informe 24 px ajustable, controles compactos, plantillas/ajustes desplegables, tomas/Revisor en panel lateral y diagnósticos conservados. Muse-streaming seleccionado al entrar cuando Meta está configurado; demás motores disponibles. Borrador permanece en destino original, sin nuevo autoscroll ni cambios ASR. Tras autorización explícita del responsable se respaldó catálogo y reinició solo laboratorio; API confirma 285 plantillas. UI comprobada: biblioteca/búsqueda torax, edición/deshacer y abrir/cerrar revisión. Suite 70/70 y sintaxis aprobadas; prueba física S25 pendiente. Evidencia agregada data/local/audits/focused-layout-2026-11-01/verification.json y captura design/dictado-implementado.png con texto sintético escrito manualmente y luego deshecho. No es resultado ASR.


## 01-11-2026 · conexión inicial y laboratorio más legibles
Cambio estático: bloque inicial destacado con botón Conectar teléfono y explicación QR; al emparejarse se contrae y queda estado a izquierda. Conserva botón/ID/controladores del transporte. Laboratorio: búsqueda de audios con conteo visibles/seleccionados, listas de altura acotada, ejecución antes de biblioteca, referencia/resumen/historial plegables, métricas/formato/revisión bajo detalle de cada resultado. Fallos y originales conservados. 70/70 tests y sintaxis aprobados; comprobación visual pendiente por fallos de herramientas: IAB no adjuntó pestañas, Chrome recibió rechazo de origen y servidor auxiliar de verificación fue bloqueado por política automática. No se cambiaron guardas del backend. Stitch no entregó pantalla; listado posterior sin pantalla nueva. Evidencia agregada data/local/audits/lab-layout-2026-11-01/verification.json. Sin reinicio ni nuevas inferencias.

## 2026-11-01 · Verificación previa a publicación
Hipótesis: el árbol candidato puede distribuirse sin entradas privadas y mantiene las pruebas existentes. Criterio: cero hallazgos de rutas prohibidas/credenciales conocidas/plantillas completas; todas las pruebas automatizadas aprobadas. Una ejecución en Windows, sin navegador, red ni fuente de audio de usuario (no aplican), sin llamadas a modelos. Árbol de trabajo posterior a 28d75be; no atribuir estas ejecuciones a ese commit. Resultados: 70/70 pruebas Node, 5/5 Python y sintaxis JavaScript aprobadas; auditoría de 119 candidatos y 246 blobs históricos sin hallazgos. Duración de auditoría y sobrecosto: null, no instrumentados; no se realiza comparación de rendimiento. Alcance y límites en PUBLICATION.md.

## 2026-11-01 · Observaciones del responsable: vibración y revisión
El responsable comunicó ausencia de vibración percibida en la condición activada. Sin diagnóstico móvil exportado, aceptación de API y duración física desconocidas: no es una comparación válida de efecto acústico de vibración efectiva. Revisor activado en la captura de ajustes: no corresponde al protocolo previo con revisión desactivada. Consulta del catálogo local: propuestas acertadas de terminología quedaron pendientes; se observó además una propuesta de término que podría perder una negación fusionada por ASR, frente a la frase de prueba comunicada. Sin escucha humana del audio no se da por establecida referencia oral exacta. Mantener evidencia local y resultado desfavorable; no interpretar sugerencia como corrección validada. Próximo experimento propuesto: mismo texto/toma con contexto actual frente a contexto acotado de plantilla e informe; medir aciertos, omisiones, negaciones alteradas, falsas alertas, tokens y latencia. Criterio: ninguna nueva alteración clínica en el conjunto revisado; usar casos reservados además de estos ejemplos. No implementado aún.

## 2026-11-01 · Análisis de seis exportaciones de interfaz/transporte
Análisis descriptivo, sin cambio de configuración ni nuevas inferencias. Pregunta: comparar tiempos de las cinco frases de cada serie; no demostrar efecto causal de vibración. Primera serie comunicada sin vibración, segunda con opción activada pero sin vibración percibida. Diagnóstico móvil ausente; red desconocida. Muse-streaming, cierre manual, comandos/números activos, sin glosario, Revisor activado según catálogo. Referencia oral no validada por escucha; no calcular WER contra guion asumido.
Las exportaciones de editor/disposición son acumulativas; no duplicar eventos. La segunda exportación de últimas cinco tomas contiene tres frases y dos resultados sin texto: primeras dos frases recuperadas del catálogo por fecha/runId, conservando métricas de distinta procedencia explícitas. Medianas de cinco frases: parada→texto estimada 1573,6 frente a 1625,8 ms; inicio recibido→primer borrador 2971,8 frente a 3174,5 ms; fin recibido PC→texto 1507,8 frente a 1555,5 ms. Incertidumbre de reloj 44,7–59,3 ms entre series; la diferencia de medianas de parada→texto de 52,2 ms no demuestra efecto de vibración. Actualización JS de borrador mediana 0,4 ms en ambas (25/26 eventos), excluye pintado y persistencia de instrumentación. Dos copias confirmadas por API en 9,5 y 2,9 ms; no prueba percepción de confirmación. Diez tomas en exportaciones de transporte verificadas, sin duplicados/errores de secuencia; no equivale a ausencia de cortes acústicos.
Datos originales, hashes, selección de ejecuciones y análisis reproducible local en data/local/lab/reports/2026-11-01-haptic-series. Build informado del servidor 28d75be es antiguo respecto de los cambios de cliente: no atribuir estas pruebas a ese commit ni al actual. S25 comunicado por responsable; navegador PC Chrome 156/Windows según exportación. Vibración física, sobrecosto completo y validación auditiva: pendientes.

## 2026-11-01 · Controles reales del revisor contextual/global
Plan guardado antes de ejecutar en data/local/lab/reports/2026-11-01-context-review/plan.json. Tres textos sintéticos, una repetición cada uno, mismo modelo muse-spark-1.3, sin audio ni navegador; red no medida, build null y hash de fuentes guardado. Criterios: JSON válido, detectar lateralidad explícitamente contradictoria, no alertar en control consistente, no sustituir posible negación fusionada. Resultados: 3 respuestas válidas. Contradicción derecha/izquierda: aviso con ambas citas, petición 3778,98 ms, 954 tokens; control consistente: cero avisos, 1750,89 ms, 841 tokens; toma con palabra deformada: aviso sensible sin sustitución, 3787,95 ms, 1267 tokens. Cola registrada por separado; ejecución serial. Todos los resultados y respuestas conservados localmente. No constituye comparación controlada de superioridad contra v1 ni validación clínica; falso negativo/falso positivo general y coste facturado desconocidos. Suite completa: 76/76 pruebas Node y sintaxis aprobadas. Interfaz física y persistencia contextual desde S25 aún pendientes.

Verificación de interfaz tras activación de de09560: pestaña temporal de navegador con informe sintético; Copiar mostró elección Revisar antes de copiar/Copiar sin revisar. Revisión real mostró aviso de lateralidad con dos citas; editar la conclusión marcó Desactualizada. Borrador inicialmente vacío restaurado y pestaña de prueba cerrada. Captura local .runtime/revisor-global.png excluida de Git. La revisión sintética de interfaz permanece identificable por texto/scope report en catálogo; no es toma del usuario. Prueba física S25 sigue pendiente.


## 2026-11-02 · Instrumentación léxica y protocolo de ampliación
Hipótesis técnica previa: CER distingue cambios de caracteres conservando WER/original y ausencia explícita. Criterio: fixtures Unicode, unidades, silencio, referencia ausente, límite computacional y exportación pasan junto a suite existente. Protocolo humano/acústico, hipótesis y aceptación: experiments/laboratory-evaluation-v1.md; aún no ejecutado.
Resultado realmente obtenido: 78/78 pruebas Node aprobadas, sintaxis JavaScript aprobada. Comandos: node --test tests/*.test.mjs y node scripts/check.mjs (npm no estaba en PATH). Una ejecución de suite en Windows, Node 24.22.1; fixtures sintéticas/adaptadores locales. Navegador, red física, dispositivo de audio y modelos reales: null/no usados. Árbol de trabajo sin commit; no atribuir a HEAD como ejecución limpia. No hay benchmark de velocidad ni validación clínica. Verificación visual, ensayos humanos, corpus WAV versionado, captura de edición/anotación y panel clínico/Revisor ampliado siguen pendientes; la comparación existente muestra ahora S/D/I y CER. No se reinició servicio ni se enviaron audios a proveedores.


## 2026-11-02 · Cierre técnico de ampliación
Hipótesis técnica: separar estudios preserva originales/contratos y permite reproducir métricas sin fabricar juicios clínicos. Criterios: snapshots inmutables, ausencia distinta de cero, guardas HTTP conservadas, persistencia tras reinicio y diferencias pareadas con condiciones explícitas. Protocolo humano previo en experiments/laboratory-evaluation-v1.md; guía ejecutable LAB_STUDIES.md.

Resultados reales: 86/86 pruebas Node y 5/5 Python aprobadas, sintaxis JavaScript aprobada. Una ejecución final de cada suite, Windows/Node 24.22.1; pruebas con fixtures sintéticas, sin modelos reales. HEAD observado 654bed86c05046546db7691103f1f248c13e57d2, árbol dirty: no atribuir pruebas a commit limpio. Logs y hashes en experiments/results/2026-11-02-lab-extension.

Corpus: 30 WAV TTS locales (Microsoft Helena Desktop, es-ES) y 12 variantes con ruido, 42/42 hashes/formato válidos; seis frases base. Verificación 21,91 ms en una pasada, excluye escritura de reporte; no velocidad ASR. 30 audios importados mediante API al servidor fixture aislado, sin referencia automática ni inferencia. Primera generación tuvo problema de codificación de PowerShell 5: se conservó como intento descartado en data/local/study-corpus-v1; fuente corregida a UTF-8 BOM y corpus válido en study-corpus-v1-utf8. Referencias auditivas y pausas acústicas aún no validadas.

Navegador: servidor fixture 8794, separado del catálogo/clave reales. Guardados clínico, edición, revisor y UX comprobados, con originales intactos y registros presentes tras recarga/reinicio. Evaluador fixture-E1 operado por automatización: sus tiempos/juicios son pruebas de interfaz, NO datos de médicos ni rendimiento de Meta. Navegador integrado, viewport CSS observado 1440×900 y 389×844 (zoom existente obligó a compensar tamaño solicitado), sin desbordamiento horizontal del documento; tablas desplazan internamente. Captura ui-synthetic.png corresponde a fixture. Chrome rechazó navegación automatizada por guarda de origen; se mantuvo la guarda y se verificó con navegador integrado. No prueba móvil física.

Pendiente experimental, no capacidad ausente: participantes humanos, corpus reservado mayor, anotación clínica doble/adjudicación, inferencias pareadas con ruido/pausas, validación física de latencias y calibración de sobrecosto. No se afirma mejora de rapidez/precisión.

Activación principal no ejecutada: revisión automática rechazó el comando de reinicio pese a autorización del responsable. Respaldo local del catálogo confirmado por hash. Los ensayos de nuevas API se realizaron en servidores aislados, no en el proceso principal antiguo. Comparación pareada UI verificada con dos fixtures: deltas léxicos calculados, tiempos ausentes permanecieron ausentes; no evidencia de superioridad de motores reales.


## 2026-11-02 · Activación manual verificada
El responsable reinició manualmente el laboratorio. Comprobación HTTP de /api/state y /api/study: ambas responden; sourceHash coincidente cb15829bc89d0d14665472ee41ba4e85b1be85816c1f07a8be2b511b3edd02da. Se mantienen los conteos previos: 70 audios, 182 ejecuciones y 54 revisiones. Cero registros de estudio nuevos en catálogo principal; las fixtures permanecen separadas. Esta verificación confirma disponibilidad y conteos, no una nueva prueba clínica ni comparación byte a byte del catálogo. La activación pendiente indicada anteriormente queda resuelta.


## 2026-11-02 · Aceptación real y cierre técnico del laboratorio
A pedido del responsable se ejecutó comparación real mientras un agente revisó el macroproyecto en paralelo. Protocolo previo, tres WAV TTS sintéticos, configuraciones base, una repetición por motor; 6/6 completadas y tres pares exportados. Cálculo independiente Python y exportación HTTP JSON/CSV coinciden en 6/6; ausentes preservados. Revisión Meta real completada, una propuesta no aplicada; originales preservados. Referencias son guiones provisionales no escuchados por humano; no hay nueva evaluación clínica ni tiempos humanos inventados.
Resultados y límites en experiments/results/2026-11-02-lab-acceptance/README.md y summary.json; detalle privado reproducible en data/local/lab/reports/lab-acceptance-1793595194080. Se conserva resultado desfavorable Muse («observa observa neuromotor») y limitación del revisor (solo duplicación); WER 25% de Whisper en medida por tres/3. Primera carga Whisper 43,63 s dentro de petición 49,05 s, separada de calientes 1,49/1,47 s. Ampliación técnica cerrada; fase 10 clínica abierta. ROADMAP actualizado para retirar pendientes ya resueltos y priorizar ensayo S25 integral/congelación de entrega.
## 2026-11-02 · Pendiente: efecto de enviar ficha y sección en vez de plantilla e informe completo

Protocolo definido antes de medir. **Todavía no hay ejecución**, así que todos los resultados son `null`.

- **Hipótesis:** con `report-context-v2` (ficha y sección de destino) el Revisor por toma mantiene la detección de discrepancias sensibles de `report-context-v1` (plantilla e informe completo), y envía menos texto a Meta.
- **Métricas:**
  - avisos sensibles correctos, falsas alarmas y omisiones por caso (conteos);
  - caracteres enviados en `context` (conteo);
  - tiempo de petición (ms).
- **Unidad:** caso sintético × variante de contexto.
- **Intervalo de tiempo:** desde el envío de la petición hasta la respuesta validada.
- **Condiciones:** los mismos casos sintéticos de `scripts/evaluate-meta-review.mjs`, más casos con contradicción entre la sección y la toma y casos cuya evidencia está en otra sección (el límite esperado de v2). Mismo modelo `muse-spark-1.3`, `reasoning_effort` low, 3 repeticiones por caso en orden alternado v1/v2.
- **Criterio de aceptación:**
  - ninguna pérdida de avisos sensibles en los casos dentro de la sección;
  - las omisiones de casos que dependen de otra sección se registran como costo conocido, no como fallo oculto.
- **Registro:** build, `promptHash`, `inputHash`, red y fecha. Se conservan los resultados favorables y desfavorables.
- **Estado:** requiere una credencial Meta en el PC de referencia. En la nube no se pudo ejecutar. `resultados: null`.

## 2026-11-02 · Glosario de Muse por evidencia: TC de tórax (protocolo registrado ANTES de medir)

Diseño aprobado por el responsable el 2-nov-2026. **Todavía no hay ejecución**: todos los resultados son `null`. Materiales en `data/vocabulario/` y scripts `scripts/vocab-*.mjs`.

- **Pregunta.** ¿Qué glosario corto, elegido por medición, mejora el reconocimiento de términos de TC de tórax sin hacer que Muse escriba términos que no se dijeron ni empeore el resto del texto?
- **Condiciones fijas:**
  - Muse por archivo en el laboratorio local, con los mismos WAV en todas las variantes;
  - se evalúa el **texto original del motor**: comandos, números y Revisor desactivados;
  - el Revisor recibe hoy los mismos términos y su efecto se medirá aparte, sin cambiar su comportamiento;
  - el streaming se confirmará después con una sola corrida.
- **Voces:** al menos dos humanas, incluida la del responsable (v1, v2…). Una voz sintética (s1) se informa aparte y no entra en la decisión.
- **Frases:** sintéticas, escritas por el equipo (`frases-tc-torax.v1.json`), leídas sin decir la puntuación. La referencia es el texto escrito; si una lectura sale distinta, se repite y no se corrige la referencia.
- **Fase A (selección), sin glosario:**
  - 50 frases con 60 candidatos (propuesta editorial a confirmar en la planilla);
  - cada candidato aparece en al menos 3 frases distintas, así que con 2 voces suma 6 o más lecturas;
  - la tasa de error por término sube de a 1/6 (unos 17 puntos porcentuales).
- **Selección:**
  - prioridad = frecuencia 1–3 (plantillas, o prioridad editorial A/B si no hay conteo, con la fuente visible) × tasa de error sin glosario × impacto clínico 1–3 (lo asigna el responsable);
  - quedan fuera los términos sin medir, con 0 errores o sin impacto;
  - el ranking es determinista y guarda los datos de entrada y sus hashes.
- **Fase B (evaluación):**
  - 29 frases objetivo distintas de las de la fase A, más 13 controles sin candidatos y con palabras que suenan parecido;
  - variantes: sin glosario (dos repeticiones, para estimar el ruido), glosario actual de 20 términos, y glosarios de 10, 25, 50 y 100 términos, solo si hay suficientes términos elegibles; si no, se omiten y se registra;
  - el laboratorio alterna el orden de las variantes por audio.
- **Métricas (conteos, por voz y agrupadas):**
  - aciertos en términos objetivo: forma exacta, sin distinguir mayúsculas pero sí tildes; una forma flexionada se registra aparte y no cuenta como acierto;
  - términos del glosario que aparecen sin haberse dicho, en controles y en frases objetivo;
  - errores en otras palabras, y errores nuevos frente a sin glosario (repetición 1) en el mismo audio;
  - WER (errores sobre palabras de referencia, normalizador `es-literal-v1`);
  - latencia de la petición (mediana, ms).
- **Regla de decisión** (implementada en `decideGlossary`, `backend/vocabulary.mjs`):
  - se elige el glosario más corto que logre al menos el **90 % de la mejora máxima** en aciertos;
  - se rechaza con **cualquier** término no dicho en las grabaciones control (cero en N, con N ≥ 20; con 10 controles no se puede medir 1 por cada 100);
  - se rechaza si su WER general supera al de sin glosario en más que la diferencia entre las dos repeticiones sin glosario;
  - si ninguna variante cumple, se mantiene el glosario actual;
  - la latencia se informa y la decide el responsable;
  - la decisión se toma sobre las voces humanas agrupadas, informando además cada voz.
- **Límite de Muse:**
  - el tope de 100 términos es del proyecto (`lab-core.mjs:41`);
  - en la documentación accesible no se encontró un tope documentado; la documentación oficial no se pudo leer desde la sesión en la nube, por la política de red;
  - solo se ha probado hasta 20 términos y no se harán pruebas de carga sin consultar.
- **Frecuencias:**
  - se cuentan solo en el PC del responsable (`scripts/vocab-frecuencias.mjs`);
  - se excluye la carpeta 28.10.26;
  - un 0 en las plantillas no significa que el término sea raro, porque describen sobre todo exámenes normales;
  - la frecuencia definitiva requiere una exportación local de informes de TC de un período completo, y al repositorio solo pueden llegar los totales agregados.
- **Verificación del flujo (no es medición):**
  - en un contenedor Linux se ejecutó el flujo completo con el laboratorio real y un **Muse simulado** que se equivoca a propósito en 12 términos;
  - fase A: 100 ejecuciones; detectó los 12 términos y ningún otro;
  - ranking: 12 elegibles, solo la variante de 10 posible y las de 25, 50 y 100 omitidas;
  - fase B: 336 ejecuciones y la regla aplicada;
  - no dice nada sobre Muse real.

## 2026-11-02 · Contenido de plantillas de demo
Cambio de contenido, no de motores: cinco informes sintéticos completos, versión demo-completa-v2. Verificación reproducible: pnpm check y pnpm test (prueba de empaquetado y contenido en tests/demo.test.mjs). Pendiente prueba humana en Render: aplicar cada plantilla, sustituir una frase mediante dictado, deshacer y copiar conservando saltos. No hay nuevas mediciones de latencia ni resultados clínicos; valores no medidos permanecen ausentes. Las medidas y hallazgos del contenido son ficción de demostración.

## 2026-11-02 · Revisión al margen (propuestas Stitch)

Diseños y versiones: [STITCH_REVISION_MARGEN.md](design/STITCH_REVISION_MARGEN.md). No es un experimento ejecutado ni un cambio funcional. Hipótesis: A facilita relacionar texto y explicación por proximidad; B permite recuperar ancho al cerrar la revisión. Antes de comparar: mismo texto sintético, viewport 1280×900, zoom 100 %, tamaño tipográfico y tema iguales; alternar orden A/B. Medir tiempo en ms desde seleccionar una duda hasta localizar su explicación, clics para volver al texto y ancho útil del editor en px con panel abierto/cerrado. Aceptación funcional: dos correspondencias correctas, informe sin modificaciones al navegar, estado inicial vacío y ausencia de desbordamiento; el umbral de preferencia humana debe acordarse antes de medir.

Ejecuciones de comparación: 0; tiempos, clics, área, luminancia, precisión temporal y sobrecosto de instrumentación: null. Revisión visual directa en Chrome/Windows; versión del navegador, hardware y red: null. Sin fuente de audio ni dictado. Preferencias sobre brillo son información comunicada, no medición. Pendiente instrumentar un prototipo funcional y registrar ambos resultados, favorables y desfavorables, antes de decidir implementación. Ningún servicio externo de analítica añadido.

### A · Inicio y dictado interactivo: criterio de comprobación

Revisión puntual solicitada, sin comparación de variantes. Antes de verificar: aceptar si Preview inicia vacío, permite escribir, Plantilla actúa solo a demanda, el botón de conexión abre un diálogo rotulado como simulación, el dictado simulado activa barras/estado/tiempo y Pausar los detiene. Comprobar además Deshacer, avisos y copia o mensaje honesto de fallo. Fuente: texto sintético, sin micrófono. Registrar resultados observados y fallos en design/STITCH_REVISION_MARGEN.md. No se mide descubribilidad, latencia ni amplitud real del audio: null; la simulación no puede acreditar esas propiedades. La respuesta real al volumen requiere integrar la aplicación y medir después con audio controlado.

### A · Edición compacta: comprobación prevista

El responsable pide ajustar primero Stitch. Hipótesis de diseño: mover controles de edición a una franja fina y reducir el margen izquierdo deja más espacio útil sin saturar la toolbar. No se realizará comparación cuantitativa en esta revisión; ancho útil, tiempo de tarea, tasa de descubrimiento y comodidad: null. Antes de medir una mejora de espacio se requieren capturas de ambas versiones al mismo viewport, zoom, tamaño de letra y estado de avisos. Criterios funcionales de esta revisión: inicio vacío; Deshacer/Rehacer restauran el texto sintético; una edición nueva invalida Rehacer; A−/A+ cambian el valor visible y el tamaño del informe; Revisar con IA abre información explícita de simulación/Meta como integración prevista. Registrar resultado y versión en el documento de diseño, sin atribuir ejecución de IA real.

## Rediseño final v1 · 02-11-2026
Hipótesis funcional: el cambio de disposición conserva texto plano, aceptación explícita, deshacer e invalidación de revisiones. Criterio: pruebas de integración de acciones desde tarjeta/letrero, confirmación sensible, Escape/clic fuera, edición posterior, copia limpia y cancelación con respuesta tardía pasan. Reproducción: pnpm test; prueba visual aislada: DICTA_UI_PORT=8797 y DICTA_UI_DELAY_MS=6000, node scripts/preview-desktop-b.mjs. La demora es artificial y no es medición ASR/Meta.

Instrumentación: layoutMetrics.version propuesta-b-rev3+rediseno-v1; eventos review-note-open/close con id numérico de aviso, origen y motivo, sin texto adicional. Se mantienen report-suggestion-accepted, report-warning-acknowledged y report-review-shown. Reloj visual desde performance.now, actualizado a 1 s; no representa porcentaje ni tiempo estimado restante. Precisión física y sobrecosto agregado null: pendiente medir en dispositivo con protocolo pareado antes de afirmar mejora de rapidez/usabilidad. Condiciones de verificación: Windows, Node 24.22.1, navegador integrado (versión no registrada), loopback, sin fuente de audio; una pasada final de suite, fixtures sintéticas. 221/221 Node, 5/5 Python; primeras pasadas encontraron mocks DOM obsoletos, actualizados a DOM real happy-dom sin retirar las aserciones funcionales.

## Accesos rápidos a plantillas · 02-11-2026
Hipótesis funcional: un acceso en hoja vacía inserta exactamente la plantilla seleccionada y su contexto, admite deshacer y no reemplaza texto existente ni una toma pendiente. Criterio: integración con catálogo sintético de siete entradas (máximo cinco, favorita primera), catálogo pequeño y cambio de favoritas; guardas de texto/dictado; suite 223/223 y sintaxis aprobadas. Reproducción: pnpm test. Windows/Node 24.22.1, una pasada final, sin audio/red externa/modelos; árbol sobre 3ba414f, no atribuir a commit limpio anterior. Navegador integrado: inserción de plantilla TC sintética desde fixture 8796 y desaparición de guía comprobadas; no prueba física de productividad.
Evento template-quick-applied guarda posición, si era favorita y elapsedMs (performance.now desde clic hasta inserción DOM/foco, excluye ajuste asíncrono de fuente y pintado). No agrega nombre/texto de plantilla a métricas. Precisión física y sobrecosto null; medir comparación de tiempo hasta informe listo antes de afirmar ahorro.

## Plantillas generales v3 · 02-11-2026
Cambio de contenido, sin hipótesis de rendimiento. Criterio reproducible: cinco nombres simples y texto exactamente igual a título de estudio + tres encabezados vacíos, fuentes externas vacías; pnpm test (223/223) y pnpm check aprobados. Árbol sobre d81e725, Windows/Node 24.22.1, una pasada; sin audio/modelos. Eventos template-loaded y template-quick-applied existentes conservados. No medir ahorro de tiempo ni precisión a partir de esta modificación: valores null, pendiente evaluación de uso si se pretende afirmar beneficio. Navegador integrado sobre demo aislada 8898 verifica inserción y deshacer; no validación clínica.

## Informes normales básicos v4 · 02-11-2026
Criterios de contenido acordados: cinco nombres simples, secciones con texto general breve por estudio, sin medidas ni texto copiado de otras plantillas. Prueba del catálogo verifica tres secciones no vacías, ausencia de dígitos/unidades de longitud y máximo 100 palabras por informe. pnpm check y 223/223 pruebas aprobadas; una pasada en Windows/Node 24.22.1, árbol sobre dbfaabd, no ejecución atribuida al commit limpio previo. No se usaron audio, modelo ni navegador en este bloque. Eventos existentes template-loaded/quick-applied conservados; sin afirmación de rendimiento. Medidas de productividad, precisión y sobrecosto adicional null/no evaluadas; no hay instrumentación nueva. Pendiente aceptación del contenido por el responsable; son plantillas de demostración editables, no resultados clínicos comprobados.

## 2026-11-02 · Quince plantillas y favoritas iniciales v5
Catálogo público demo-informes-basicos-v5: quince informes normales breves, originales para esta demo; cada uno añade ANTECEDENTES con marcador explícito para completar, Técnica, Hallazgos y Conclusión. Sin medidas ni importación de biblioteca privada. Se conservan los cinco estudios anteriores y se añaden RX tórax, PieloTC, UroTC, ecografía abdominal, TC cerebro sin contraste, TC senos paranasales, ecografía renal/vesical, RX lumbar, RX rodilla y RX pelvis. Cinco favoritas iniciales: RX tórax, TC tórax, TC abdomen/pelvis, PieloTC y ecografía abdominal. Selección editorial para inicio, no ranking de frecuencia medido. Se respetan preferencias existentes, incluso una lista vacía, y cambios efectuados antes de terminar la carga.

Criterio funcional: quince IDs únicos, cinco favoritas, cuatro secciones, antecedentes no inventados, menos de cien palabras por plantilla y sin medidas; inserción exacta/deshacer; preferencias persistidas y carrera carga/selección protegidas. Reproducción: pnpm check y pnpm test. Resultado: sintaxis OK y 226/226 pruebas; primera pasada focalizada 34/34, una pasada completa sobre árbol basado en da986eb (no atribuir al commit limpio anterior). Windows, Node 24.22.1, DOM happy-dom; hardware y navegador físico null, sin audio/modelo. API real de demo local aislada en loopback 8898: HTTP 200, JSON idéntico al archivo, quince entradas y cinco favoritas; evidencia local .runtime/templates-v5-api.json. Sin validación clínica ni medición de uso.

Instrumentación: template-library-loaded añade defaultFavoritesApplied (conteo de favoritas inicializadas) a count/version/elapsedMs existentes; sin nombres ni texto. Tiempo existente desde petición hasta actualización del DOM, performance.now en ms, excluye pintado; precisión física y sobrecosto adicional null. Productividad y frecuencia de estudios null: pendiente observación de uso antes de atribuir mejora o popularidad. Referencias técnicas consultadas solo para distinguir protocolos, sin copiar textos de informes: [ACR, sospecha de litiasis](https://acsearch.acr.org/docs/69362/narrative/) y [RadiologyInfo, urografía](https://www.radiologyinfo.org/en/info/urography). Los textos son bases editables que requieren adecuar técnica y hallazgos al examen realizado.

## 2026-11-02 · Seleccionar campos de plantilla con un clic
Solicitud: al pulsar [Completar antecedentes clínicos.] se selecciona el marcador completo, incluidos corchetes, para sustituirlo al escribir. Se aplica también a [indicar lado], los dos marcadores explícitos del catálogo público; corchetes de texto ordinario no se convierten en controles. Enter/Espacio sobre el campo enfocado seleccionan su contenido y devuelven foco al editor. No cambia texto al seleccionar; conserva inserción, pegado, dictado anclado y deshacer existentes. No selecciona campos durante composición IME ni dictado pendiente.

Criterio reproducible: selección exacta sin encabezados/saltos, reemplazo limitado al campo, deshacer íntegro, lateralidad por teclado y dictado, guardas de toma pendiente y texto libre intacto. pnpm check aprobado y pnpm test 228/228; 25/25 pruebas focalizadas antes de la suite completa. Una pasada final en Windows/Node 24.22.1 sobre árbol basado en 97bcd45 (no atribuida al commit limpio previo). Navegador integrado, versión/hardware null, red loopback, demo aislada 8898: clic selecciona marcador completo, escritura nativa «Control de prueba.» reemplaza exactamente y un Deshacer restaura texto íntegro. Captura local .runtime/campo-seleccionado.png. Sin fuente de audio ni llamadas a modelos; dictado cubierto por fixture de integración.

Evento template-field-selected: characters (longitud seleccionada) y elapsedMs desde handler hasta selección DOM/foco mediante performance.now. Sin contenido ni nombres; no mide latencia física de clic/pintado. Precisión y sobrecosto null; productividad null, no comparación de variantes ni afirmación de ahorro cuantificado. Pendiente medir uso humano antes de afirmar mejora de tiempos.

## 2026-11-02 · Diez dictados simultáneos
Solicitud del responsable: permitir y probar diez personas simultáneas. Alcance implementado: diez sesiones ASR solapadas, una por visitante; hasta 30 parejas relay conectadas; sockets ASR acotados a 2*cupos+2 para permitir respuesta de rechazo durante negociación/cierre. DEMO_MAX_CONCURRENT_STREAMS predeterminado 10, rango 1–10; no cambio de plan/precio. Presupuesto diario compartido se cobra por bloque aceptado antes de resample/envío; incluye cancelados/fallidos y evita que diez tomas excedan el presupuesto al terminar. No persistencia de cuotas en reinicios, no garantía monetaria de consumo Meta. Laboratorio conserva callback opcional sin cuota nueva; no se reinicia.

Hipótesis y criterio previos en scripts/test-demo-concurrency.mjs y protocol.json de cada corrida: diez activas a la vez, diez finales, hashes PCM correctos, palabra exclusiva por sesión, ningún acceso a resultados ni cancelación ajena, cero cupos residuales. Fuente simulado: diez tonos de frecuencia diferente, 48 kHz, dos segundos cada uno; proveedor determina el resultado por hash del audio resampleado. Fuente real: diez frases no clínicas TTS de Microsoft Helena Desktop, español es-ES, 48 kHz, voz única, referencias generadas (no escuchadas/validadas como corpus clínico). Diez parejas WebSocket teléfono/PC con emparejamiento QR y envío a ritmo de audio; el driver espera las diez conexiones Muse antes de iniciar audio. No son diez personas, navegadores ni teléfonos físicos.

Instrumentación nueva: concurrency.limit/active/peak/started/rejectedCapacity/rejectedVisitor/rejectedBudget en /api/state autenticado, conteos de proceso sin IDs/texto de terceros. Audio contabilizado en ms desde bytes PCM/rate; resolución un sample, coste adicional por bloque no medido (null). Driver guarda tiempos monotónicos de start→ready y end del emisor→done recibido; incluye red/relay/ASR y excluye pintado/editor/micrófono. Precisión del reloj y sobrecosto null; red física/hardware/browser null. Windows/Node 24.22.1. Coste monetario null. No comparación de variantes ni promesa de latencia general.

Resultados previos a publicación, árbol basado en 402bad0 (con cambios, no atribuible al commit limpio; hashes de fuentes en protocolos): suite focalizada 15/15 demo y suite completa 232/232, pnpm check OK. Tres rondas mock: 30/30 completas, diez activas y diez conexiones al proveedor, cero mezclas y cero cupos residuales. Primera corrida Muse real: 10/10 completas con hashes íntegros, 8/10 marcadores coincidentes; se detectó texto mal codificado en el generador PowerShell (UTF-8 sin BOM leído por Windows PowerShell). Conservada evidencia desfavorable. Generador corregido a UTF-8 con BOM, corpus nuevo: 10/10 coincidencias, sin marcadores ajenos; end→done 252–370 ms en este driver local (media 281 ms), no latencia humana de producción. La primera corrida mock reportó base Git en build pese a árbol sucio; interpretar solo como base observada; driver corregido para build null en árbol sucio. Fuentes completas en data/local/concurrency-mock-20261102-v1, concurrency-meta-20261102-v1 y v2; WAV y transcripciones sintéticas permanecen locales. Prueba Render pendiente tras despliegue.

Cobertura de guardas: tres rondas de diez, undécima rechazada, segundo dictado del mismo visitante rechazado, API ajena 404, cancelación/desconexión/error proveedor liberan cupo, presupuesto compartido en vuelo y rollover UTC, límites inválidos rechazados. No acreditado: concurrencia prolongada, varias redes/dispositivos, carga simultánea de Spark ni cuotas persistentes. Reproducción y comandos en RUNNING.md.

Prueba pública completada: Render 2d8aaa80f4b0074d79c93900ce34455aa9635122, deployment 7506671636 success el 03-11-2026 00:05:58 UTC (02-11 21:05:58 America/Santiago). Primer intento remoto devolvió HTTP 401 consultando estado, antes de dictar; causa no establecida, fallo conservado. Tras comprobar acceso y esperar ventana de login: diez parejas simultáneas, diez finales Muse reales, diez hashes relay/ASR verificados, diez marcadores exclusivos, diez accesos de cancelación ajena rechazados y cero cupos residuales. Una ronda, una máquina, frases TTS 48 kHz de 7,81–8,28 s; 80,885 s de audio agregado. End del emisor→done recibido: 4.708–5.187 ms, media 4.886 ms, mediana 4.826 ms. Esta espera bajo carga es un resultado directo, no objetivo de rendimiento ya satisfecho ni comparación causal con la ejecución local. CPU/RAM y causa del retardo null/no determinadas. No carga prolongada ni Spark simultáneo. Resumen público sin audio, texto ni secretos: experiments/results/2026-11-02-ten-concurrent/README.md y summary.json. Evidencia local íntegra en data/local/concurrency-render-20261102-v1 y v2.

## 2026-11-02 · Configuración de evaluación 600/10
Cambio de configuración autorizado, sin comparación de rendimiento. Criterio: Blueprint y entorno activo Render DEMO_MAX_AUDIO_MINUTES_PER_DAY=600 y DEMO_MAX_CONCURRENT_STREAMS=10; despliegue saludable. Instrumentación de consumo por bloques y concurrency existente conservada; no nuevas inferencias ni prueba consumiendo el cupo completo. Presupuesto monetario real, precisión/sobrecosto adicional y productividad null; ampliar cupo no implica cobro anticipado ni límite de factura. Audio consumido se suma entre usuarios; contador sigue en memoria y Spark tiene su cuota separada. Verificación/despliegue se registran en HACKATHON_LOG.md.
## 2026-11-02 · MVP bilingüe (protocolo antes de pruebas específicas)

Hipótesis funcional: elegir inglés cambia interfaz, catálogo y configuración de Muse sin traducir el borrador; español sigue seleccionable. Criterio: todos los controles del recorrido principal en el idioma elegido, 15 plantillas/5 favoritas por idioma, reemplazo exacto de marcador, configuración English/Spanish enviada al proveedor y aislamiento del formato. No se compara precisión de ASR entre idiomas.

Medidas directas: pruebas deterministas aprobadas/total; DOM y selección nativa; idioma del handshake y del snapshot de revisión. Intervalo de formato: entrada/salida de formatEnglishDictation con performance.now (ms); el resultado conserva eventos, avisos y elapsedMs sin audio. Editor y disposición registran language junto a las métricas existentes. Resolución real del reloj y sobrecosto de instrumentación: null (pendiente de medir). Prueba real prevista: una toma TTS en inglés, sin datos de pacientes, en servidor demo local contra Muse; verificar entrega y texto, sin atribuir exactitud clínica. Revisión Spark: caso sintético inglés con contradicción explícita, verificar idioma de reason y citas sin traducción.

Configuración prevista: árbol de trabajo posterior a a3a91ea (sin atribuir ejecuciones a un commit futuro), Muse Voice Transcribe 1.0 manual con sesgo English; Spark 1.3 medium. Dispositivo Windows del responsable, navegador IAB para UI; red física y hardware específico null. Audio TTS y resultados detallados solo en data/local. Publicación de resultados agregados después de ejecutar. Prueba física de pronunciación inglesa/iPhone pendiente.

Resultado del protocolo bilingüe: 239/239 pruebas aprobadas y comprobación de sintaxis. Navegador IAB verificó flujo English → plantilla → clic de campo → escritura → Español, con borrador íntegro; vista teléfono en inglés. Resolución visual del viewport 1686 × 948 en captura, dispositivo físico específico null. No comparación de variantes ni ahorro de tiempo demostrado.

Prueba real `data/local/english-smoke-1793667225125`: 1 toma TTS Microsoft Zira Desktop/en-US, 8194,5 ms, íntegra, estado completed y marcador pineapple reconocido. Fin recibido en servidor → final del proveedor: 415,14 ms (medida de servidor, no latencia física de usuario). 1 revisión global completada, 1 contradicción explícita, reason comprobado manualmente en inglés y 2 citas literales. Referencia de código: checkout a3a91ea con cambios sin commit; hash de fuentes del protocolo 82f296ffb28e9dbcc5852695a8a5a19e11e1412a3a1492ed55fd3dabeefc143e. El registro de versiones de formato y la guarda de contracciones se ajustaron después de esta toma y se cubrieron con la suite; no se atribuye esa toma al futuro commit. Red física, hardware y latencia teléfono→texto null. Sin precisión clínica o generalización a acentos humanos.

Reproducción opcional con Meta real: `powershell -NoProfile -File scripts/build-english-fixture.ps1 -OutputDirectory data/local/english-fixture-N` y `node scripts/test-english-demo.mjs data/local/english-fixture-N/manifest.json`; requiere voz inglesa de Windows y clave local ya configurada. Consume una toma sintética y una revisión; guarda protocolo, resultado y fallos en carpeta nueva ignorada. Confirmación humana del idioma del reason se registra aparte (null hasta revisión). Pruebas sin proveedor: `node --test tests/language.test.mjs tests/clinical-ui.test.mjs tests/demo.test.mjs`.

Fuente técnica verificada: https://dev.meta.ai/docs/speech-to-text y /docs/api-reference/voice/schemas, consultadas 02-11-2026: languageBias recibe nombres English/Spanish; es preferencia, no garantía de idioma ni exactitud. Sobrecosto de traducción y precisión del reloj permanecen null; tarea pendiente medir arranque bilingüe y dictado humano en ambos idiomas antes de afirmar equivalencia.


## Piloto Chatterbox Colab · 03-11-2026

Protocolo de factibilidad de 12 guiones, intervalos, métricas y aceptación en [docs/CHATTERBOX_COLAB_PILOT.md](docs/CHATTERBOX_COLAB_PILOT.md). Resultados y revisión auditiva pendientes; no es una comparación ASR.

Actualización 03-11-2026: piloto original técnicamente 12/12, pero revisión cualitativa del responsable desfavorable por pronunciación y tropiezos. Comparación correctiva predefinida en docs/CHATTERBOX_COLAB_PILOT.md, 3 guiones por 2 condiciones, 1 repetición. No se declara mejora hasta evaluación auditiva.


Preferencia humana A/B (03-11-2026): responsable prefiere A en las tres frases p02/p03/p09. Resultado comunicado: 3/3 preferencias por A; puntuaciones y errores null. A seleccionada como base de siguiente prueba; criterio absoluto pendiente. Evidencia detallada privada en human_preference.json junto a los WAV extraídos.


Lote A completo (03-11-2026): run_20261103T040001Z, 12/12 WAV técnicamente correctos, 64,52 s de audio. Recuperación local verificada por hashes individuales y de pista concatenada (75,52 s con pausas). Aprobación humana completa null. Protocolo, entorno y límites en docs/CHATTERBOX_COLAB_PILOT.md.
# Aclaración de derechos del laboratorio · 03-11-2026

## Prueba autorizada de cuatro voces, cinco guiones por voz

Extensión autorizada 03-11-2026: Joe y Kathleen también deben leer p01-p05 en español para comparar cuatro voces con textos idénticos. Mantener referencias originales, modelo, parámetros y semillas; cambiar language_id de en a es. Hipótesis: referencias inglesas pueden producir español aceptable; escuchar también el acento. Una toma por caso/voz, 10 salidas nuevas. Aceptación técnica 10/10 finitas, no silenciosas y legibles; humana naturalidad >=4/5, cero errores de términos/cifras/negaciones/comandos y cero tropiezos, tras escuchar WAV completo. Mismas métricas/intervalos y límites del protocolo anterior. Preferencia comunicada por usuario: A anterior mejor que Aldo mexicano; puntuaciones y errores null. Archivo adjunto coincide por SHA256 con p01 PCM16 de A. No se reutiliza A como referencia de generación ni se modifica su estado de permisos.

03-11-2026: el responsable solicita Colab, Aldo, Dave, Joe y Kathleen y cinco audios de cada uno. Protocolo escrito en Colab antes de generar: p01-p05 del piloto; Aldo/Dave en español, Joe/Kathleen con traducciones inglesas equivalentes. Una toma por caso y voz, limpio, mismos parámetros de A y misma semilla por caso, V3 general fijado a la revisión anterior. Comparar voces dentro de cada idioma, sin atribuir diferencias entre idiomas exclusivamente a la voz. Hipótesis: las cuatro referencias permiten dictados íntegros y pronunciación aceptable. Aceptación técnica: 20/20 WAV finitos, no silenciosos y legibles. Humana: naturalidad >=4/5, cero errores en términos/cifras/negaciones/comandos y cero cortes/repeticiones, tras escuchar cada WAV completo; resultados null hasta revisión. Tiempo directo entre sincronizaciones CUDA, duración muestras/frecuencia, RTF derivado; sobrecosto sin caracterizar, sin benchmark causal. Conservar configuración, entorno, referencias y hashes, intentos favorables y fallidos. Sin entrenamiento Whisper ni validación clínica. Resultado de ejecución se registra al finalizar.

Chatterbox V3 tiene licencia MIT y admite uso comercial del motor sin regalías. No confundirlo con derechos de la referencia: para es_mx_f1.wav, usada en A/B y el lote A aprobado, no se localizó permiso específico de generación comercial ni entrenamiento de ASR comercial. Estado pendiente, no prohibición demostrada. Antes de usar A como corpus comercial, documentar el permiso o regenerar con fuente autorizada. Detalle, identificación de lotes y fuentes: [Piloto Chatterbox](docs/CHATTERBOX_COLAB_PILOT.md#licencias-y-alcance-de-uso--revisión-03-11-2026). No se entrenó Whisper. Revisión documental, sin nuevas ejecuciones ni métricas de rendimiento. El usuario aprobó cualitativamente el lote A; medidas humanas cuantitativas siguen en null.


## Acceso directo a la demo — 2026-11-03
Hipótesis: GET /live inicia una sesión individual sin formulario ni redirección adicional. Criterio: HTTP 200 con editor y cookie, recarga conserva sesión, dos visitantes no comparten tomas, API sin sesión devuelve 401, origen ajeno 403 y capacidad agotada 503. Prueba reproducible: `node --test tests/demo.test.mjs`, proveedor simulado y PCM sintético en memoria; sin audio clínico ni llamadas externas. Unidad: aserciones aprobadas; intervalo: solicitud HTTP hasta respuesta. Latencia, navegador, red real y sobrecosto: null (no medidos). Versión: commit que incorpora esta sección; ejecución sobre árbol de trabajo, no atribuida previamente a un commit. No se mide precisión ASR. El arranque público activa acceso directo; DEMO_REQUIRE_ACCESS_CODE=true conserva modo por código. No se inicia micrófono ni inferencia al visitar.

Resultado acceso directo: 241/241 pruebas y pnpm check aprobados; Node v24.22.1, Windows x64. Despliegue 06f7a5f verificado por /api/state el 2026-11-03T11:35:03Z: criterios HTTP/sesión aprobados en una repetición con dos visitantes nuevos; navegador Chrome comprueba editor montado. No se evaluó audio remoto. Condiciones de red local, latencia y sobrecosto: null. Evidencia local .runtime/direct-access-deployment.json, sin cookies ni contenido de informes.


## Inicio sin intersticial — 2026-11-03
Hipótesis: mostrar la hoja inicial desde el HTML elimina la pantalla centrada de espera, manteniendo ocultos los controles heredados hasta el montaje. Criterio: estado loading muestra hoja, oculta reintento y no contiene Preparing; error/timeout muestra aviso y reintento; dicta-ready revela editor y registra dicta-startup. Prueba reproducible tests/startup.test.mjs con DOM simulado, sin audio; pnpm check y pnpm test. Consulta de conexión e importación del editor en paralelo, módulos precargados. No se promete carga instantánea: la hoja inicial no es editable hasta montar. Medición local existente performance.measure dicta-startup: inicio de startup.js → evento de montaje, milisegundos, sin analítica externa. Antes/después de latencia real, precisión y sobrecosto: null; pendiente comparación con red controlada. Configuración Node/Windows del ensayo se registra en bitácora; no inferencia ni validación clínica.


## Inicio estable — 2026-11-03
Hipótesis: compartir logo, ancho y alturas de cabecera/hoja y reservar 226 px para emparejamiento evita el salto observado al llegar el QR. Criterio: hoja inicial y final vacía mantienen geometría a mismo viewport; ocultar QR no reduce hoja; logo usa idéntico SVG; aviso dicta-ready ocurre después de montar pie y conexión. Transición solo opacidad 180 ms, anulada con prefers-reduced-motion. Pruebas DOM reproducibles con pnpm test; comprobar rectángulos en Chrome antes/después a igual viewport. Latencia, CLS global y sobrecosto: null, no inferir aceleración. Sin audio ni datos clínicos.


2026-11-03 · Recargas de inicio con red emulada: protocolo, condiciones y resultados en experiments/results/2026-11-03-startup-network/README.md. Seis cargas completas con delta de hoja 0 px; un error de arranque sin causa establecida. No aprobar globalmente todas las cargas ni descartar el fallo. Scripts de reproducción en scripts/test-startup-server.mjs y scripts/startup-observer.js.


## Diagnóstico del arranque lento — 2026-11-03
Hipótesis antes de comparar: el temporizador de 20 s declara error mientras el recurso sigue pendiente. Reproducción: servidor de prueba con STARTUP_DELAY_LIVE_MS=24000 y emulación Chrome 300 ms/200000 B/s. Antes: mensaje de error conservado aun después de carga correcta, QR a 26551 ms; la causa exacta del fallo original sigue sin determinar. Corrección: a los 20 s estado slow, continúa carga; error real conserva estado error y reintento. Criterio posterior: ensayo de demora forzada cruza slow, nunca error, finaliza con QR sin intervención; cinco recargas lentas completan con delta de hoja/logo <=1 px. Caché desactivada; observar estados y errores con scripts/startup-observer.js, sin datos de informes. Plazo observación 35 s, muestreo rAF más respaldo 250 ms para pestañas inactivas, costo de muestreo medido en sampleCostMs; no incluye todo el sobrecosto ni mide CLS. Conservar resultados fallidos.


2026-11-03 · Verificación en web pública real, cinco recargas con red Chrome 300 ms/1,6 Mbps y caché desactivada: 5/5 completadas, QR observado a 3114–3368 ms, delta máximo de hoja/logo 0 px. Sondeo DOM tras reload, no CLS ni medición de cada pintura. Protocolo, alcance y evidencia en experiments/results/2026-11-03-public-startup/README.md.


2026-11-03 · Flujo público y clics dirigidos: conexión de teléfono y toma sintética observadas, plantilla/editor/ajustes/revisión ejercitados. Sin caída, pero separación dictado-título pendiente y copia no confirmada fuera del navegador integrado. Detalles y límites: experiments/results/2026-11-03-public-flow/README.md.


## Separación y copia — 2026-11-03
Hipótesis: dictar antes de título ya no concatena palabras; copia rechazada o discordante recupera vía selección nativa y no informa éxito si ambas fallan. Criterio: separación conservada en provisional/final/revisión/cancelación/deshacer; selección reemplazada sin alterar texto vecino; lectura de clipboard solo con permiso ya concedido; pegado sintético coincide en navegador real. Pruebas reproducibles report-model.test.mjs y clinical-ui.test.mjs. Instrumentación copy registra método, verified true/false/null y elapsedMs, sin texto; null si no hay permiso de verificación. No se garantiza portapapeles universal. Entorno/dispositivo/red y resultados se registran tras la prueba.

## 2026-11-03 · Contexto opcional al revisar
Hipótesis: preguntar junto a Revisar con IA elimina el control permanente sin perder contexto explícito. Criterios: cero peticiones antes de elegir; una por elección; female/male/other/null llega al contexto validado; omitir elimina una selección previa; texto intacto; Escape no envía; informe nuevo cierra y reinicia. Pruebas reproducibles: tests/clinical-ui.test.mjs y tests/report-review.test.mjs. Eventos review-context-open y review-context-confirmed (solo specified boolean, sin elección ni texto) se suman a report-review-request; intervalo posible desde apertura hasta confirmación, ms performance.now; latencia humana/eficacia clínica/sobrecosto: null, pendientes de medición. Chrome local con proveedor simulado confirmó inicio tras elegir; no es una evaluación del modelo.


2026-11-03 · Reprueba pública separación/copia: separación observada y confirmada por usuario. Botón de copia no aprobado: pegó texto antiguo (47 caracteres), control manual Ctrl+C/Ctrl+V pegó informe completo (426). No ocultar regresión con éxito local previo. Evidencia y límites en experiments/results/2026-11-03-public-copy-followup/README.md.


## Copia síncrona — 2026-11-03
Hipótesis: ejecutar copia nativa dentro del clic y establecer text/plain explícito evita conservar contenido anterior. Lectura autorizada y fallback asíncrono solo después. Criterio: dos informes distintos copiados y pegados desde Render deben coincidir íntegramente, y el segundo debe sustituir al primero. Sin audio ni datos clínicos. Test reproducible tests/clipboard-activation.test.mjs comprueba orden y contenido, sin permisos nuevos. Métrica directa: igualdad del texto; latencia y sobrecosto null. Conservar fallo público previo.

## 2026-11-03 · Tres temas adicionales
Hipótesis: las paletas suministradas pueden añadirse sin perder preferencias ni legibilidad de controles. Criterios: seis opciones, restauración por clave, migración antigua sala→ambar conservada, texto principal/secundario y CTA >=4.5:1 en pares de tokens. Contraste calculado desde sRGB en tests/theme-palette.test.mjs (sin unidades, no brillo físico ni validación clínica); pruebas de restauración en clinical-ui. Chrome local: selección de Sala/Negatoscopio/Contraste y comprobación visual de barras, hoja y Apariencia. Latencia de elección, lux, dispositivo/monitor y confort: null. No se implementan simuladores ni sugerencias clínicas de la maqueta.

## 2026-11-03 · Integración visual del micrófono v3
Hipótesis: cambiar presentación y ajustes sin alterar captura/transporte. Criterio: mismos nodos/IDs/eventos, estado GRABANDO solo con clase recording real, emparejamiento y recepción de tono íntegra, preferencias válidas persistentes. Prueba reproducible: `node --test tests/mobile-look.test.mjs`, luego demo aislada, conectar QR, Ajustes > tono sintético, Inicio/parada, grabar/detener. Resultado: 4/4 nuevas y 264/264 suite; una toma manual sintética (temporizador 3 s, no cronometraje independiente), confirmación PC íntegra. Windows/Chrome local, configuración penumbra/punto/rec; versión navegador y dispositivo móvil null. No prueba de ASR ni compatibilidad física.
Instrumentación local: `window.dictaLook.metrics()` expone frames,totalPaintMs,maxPaintMs con performance.now por pintado, sin audio/texto/identificadores ni envío externo. Intervalo desde carga, solo pintados de grabación; precisión depende del navegador, sobrecosto dos consultas de reloj por frame. Latencia de usuario, batería y rendimiento en Samsung/iPhone null, pendientes. No se compara causalmente con versión anterior. La animación respeta prefers-reduced-motion y document.hidden.

2026-11-03 · Simplificación: criterio de aceptación = tres opciones visibles con miniatura, ningún selector de micrófono/color adicional, enlace de inicio abre plantillas sin modificar el informe. Reproducción: pnpm test (264/264), Chrome local /live > Usar teclado > insertar plantilla; /mobile > Ajustes. Conteos automatizados actualizados. Tiempo de elección y reducción de errores de usuario null, pendientes de prueba física; no se afirma mejora medida. Instrumentación existente template-entry/panel-toggle conserva origen y apertura, sin texto.

## 2026-11-03 · Panel lateral y formato de encabezados
Criterio previo: seleccionar/filtrar no cambia model.text, borrador ni historial; insertar exige acción explícita, reemplazo confirma y deshacer restaura. Encabezados agregan dos puntos sin alterar contenido ni consumir saltos vacíos; transformación idempotente, informe libre vacío. Reproducir `node --test tests/clinical-ui.test.mjs`: nuevas pruebas de preview/normalización más suite completa (266 aprobadas). Chrome Windows local, catálogo sintético, una selección tiroidea, sin audio. Instrumentación template-entry/template-filter/template-loaded conserva conteos/tiempos sin texto. Tiempo de comprensión y teléfono físico null; no se afirma mejora medida de productividad. La vista previa no es texto dictado ni se incluye en copia/revisión.

2026-11-03 · Panel no superpuesto: aceptación = rectángulos de canvas y picker sin intersección; 24 px horizontales escritorio / 16 px verticales estrecho. Reproducir abriendo plantillas y leyendo getBoundingClientRect en Chrome, emulación 600x900. Medidas locales: ancho1600 gap23,997 px; ancho600 gap16 px; sin intersección. Intento820 produjo viewport1025 y se registra como tal. Audio=null, teléfono físico=null, una lectura por ancho. Tests de montaje comprueban padre grid y filtros ocultos. No mide comprensión humana.

## 2026-11-03 · Ajustes: apariencia e idioma
Cambio acotado, sin comparación A/B. Criterio reproducible: cada apertura muestra Apariencia; Idioma contiene exactamente Español/English fuera de la cabecera; Cómo usar conserva cuatro pasos sin acciones duplicadas. Prueba clinical-ui con Happy DOM, una ejecución de suite (266/266). Se mantienen guardas de grabación y persistencia de idioma/borrador existentes. Instrumentación settings-page existente, versión appearance-language-v2, sin texto del informe. Latencia y mejora de comprensión: null; pendiente observación con usuarios. Dispositivo/red/audio: null; sin llamadas IA ni audio. No se atribuye validación física a esta prueba.

## 03-11-2026 · Voz artificial chilena: dos rutas

Protocolo previo y criterios en [piloto chileno](docs/CHILEAN_VOICE_PILOT.md). Chatterbox prioritario por preferencia comunicada del responsable; no conclusión causal frente a Qwen. Dos referencias candidatas artificiales y veinte salidas Chatterbox propuestas; revisión por un oyente, acento/naturalidad ≥4 de media y cero errores; estabilidad posterior de cinco frases. Tiempos sincronizados CUDA, hashes/configuración/entorno y salidas desfavorables conservados. Coste de reposición estimado separado de gasto directo. Auditoría documental LoRA/SLR71 no equivale a entrenamiento ni corpus aprobado. Estado real de ejecución en bitácora; métricas perceptuales null hasta escucha.

### Resultado piloto chileno, 03-11-2026
Inferencia completada: 2 referencias Qwen y 20 muestras Chatterbox con dos semillas por perfil. 20/20 controles técnicos positivos; revisión humana completa pendiente. Responsable declara «ninguna chilena» respecto de las referencias: resultado desfavorable de acento conservado, puntuaciones numéricas null. Chatterbox: audio108,44s, generación163,158542s, RTF agregado1,504597; carga24,260841s incluye descarga auxiliar de tokenizador. No comparación controlada entre motores. Instalación duplicada fallida preservada y entorno limpio exitoso. Coste de reposición estimado0,053946USD, factura null, GPU desconectada. Sin estabilidad/corpus/Whisper. Protocolo y límites en docs/CHILEAN_VOICE_PILOT.md; manifiestos y audio privados, fuentes reales identificadas por hash.

## 2026-11-03 · Marco estable de Ajustes
Hipótesis: fijar altura y scroll interno elimina desplazamiento al cambiar pestaña. Métrica: variación de x/y/ancho/alto en píxeles CSS entre Apariencia, Idioma, Dictado y Cómo usar, misma ventana. Criterio <=1 px. Chrome local /live?lang=es, viewport1600x777, una ronda de cuatro pestañas: todas x320,y48.75,w960,h680; variación0 px. DOM getBoundingClientRect, sin audio/IA; red localhost, dispositivo null, sobrecosto null. Reproducir abriendo Ajustes y midiendo el rectángulo .settings-body tras cada clic. pnpm check y 266/266 tests OK. No prueba física móvil.

## 2026-11-03 · Acciones tras vista previa
La barra live reubica los botones fuera de controls: el listener de cierre de preview no recibía sus clics. Se delega en document para conservar el cierre inmediato con Nuevo, Deshacer, Rehacer, Copiar y Revisar. Prueba reproducible clinical-ui abre preview y ejecuta undo/redo/new con barra reubicada; exige preview oculto y editor visible. Una ejecución Happy DOM, 266/266 y check OK. Audio/red/dispositivo: null; no validación física ni garantía de todas las combinaciones. Despliegue pendiente.

### Revisión ciega y permisos, fase local 03-11-2026
Hipótesis: referencias percibidas como chilenas y síntesis fiel deben evaluarse por separado. Lote basal conservado: 20 muestras Chatterbox, 108,44 segundos; no inferencia nueva. Tres órdenes de presentación con semillas 20261104/5/6; misma señal sin normalizar. Nombres de motor/perfil/semilla ocultos al oyente y clave fuera de la carpeta compartible. Usuarios que ya escucharon el lote no se consideran ciegos retrospectivamente.
Medidas: medias por oyente, rango de desacuerdo por muestra, número de revisiones completas, errores por 100 revisiones completas en nueve categorías; sin IC inferencial en este piloto. Puntuaciones ausentes null. Criterio exploratorio por muestra: >=3 oyentes, media acento/naturalidad >=4 y cero errores en todas las revisiones; contenido literal separado del informe formateado. No confundir voces o semillas con oyentes independientes. Coste facturado y coste por minuto aprobado null mientras falte evidencia. Sobrecosto de instrumentación no calibrado; la preparación no mide latencia TTS ni consume GPU.
Rights Gate enlaza manifest/protocol por SHA256 y exige evidencia de permiso comercial, entrenamiento ASR y redistribución antes de exportar. Estado pendiente no equivale a prohibición. Pruebas de bloqueo, alteración de binding, clave/evaluador incorrectos, anonimización y error de lateralidad. Siguiente medición humana pendiente de tres revisores reales; no fabricar opiniones. Diez guiones adicionales preparados, no sintetizados ni validados clínicamente. Fuentes en docs/CHILEAN_REFERENCE_SOURCES.md.

### Prueba mecánica de adaptación Chatterbox V3 — 03-11-2026
Hipótesis técnica previa: un adaptador LoRA q/v rango8 puede actualizar T3 congelando el resto, guardar/recargar sus valores y predecir el siguiente token. Criterio: pérdida/gradientes finitos y no nulos, base congelada, parámetros LoRA distintos del inicio, logits equivalentes tras recarga (atol/rtol1e-4 en modelo completo). Solo prueba de mecanismo, no demostración de acento ni identidad nueva. Etapa GPU limitada a20 pasos/batch1; memoria y tiempo por paso registrados solo cuando se ejecute. Pérdida T3 propia desplazada y aplanada, pues revisión estática de función upstream detectó ejes y objetivos incompatibles con este entrenamiento.
Ejecutado núcleo LoRA con PyTorch2.6.0+cpu en entorno aislado Windows, Python3.11: dos pruebas (actualización/base congelada/recarga y alineación del siguiente token), correctas. Tensores artificiales, sin voz; no usar estos tiempos como estimación GPU. Dos pruebas adicionales de manifiesto/permisos/particiones correctas. Inventario real desde índices ya descargados:4374 registros/31 hablantes, train2564, validation275, excluidos1535 por texto compartido. Duración verificada por audio pendiente. Preflight real detenido por training_rights_unverified:tts_adaptation; no se importó torch ni cargó GPU en ese intento. Calidad/acento, VRAM, coste de entrenamiento y RTF posterior null. Fuente ejecutada identificada por SHA256 en status privado, no commit inventado.

Auditoría de audio posterior: bloque femenino SLR71 descargado y decodificado localmente, 1738 WAV/10211,498667s (2,8365h), todos finitos/no silencio total/no recorte según regla del piloto. Segunda auditoría local sin red12,438657s; tiempo combinado de descarga no concluido y no usado como benchmark. Bloque masculino no recuperado; revisión auditiva/transcripción y permisos siguen pendientes. Evidencia privada en slr71_female_verified_20261103/audit.json.
