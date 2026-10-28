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
