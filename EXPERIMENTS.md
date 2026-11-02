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
