# Cierre técnico del laboratorio · 2 de noviembre de 2026

Ampliación técnica aceptada y activa. Se realizaron seis transcripciones reales (tres frases sintéticas, Muse/Whisper, una repetición por motor/audio), tres comparaciones pareadas y una revisión real Meta. Todas completadas; originales de las seis ejecuciones preservados. No se declara validación clínica ni cierre de la evaluación global de fase 10.

| Guion TTS provisional | Muse WER / CER | Whisper WER / CER | Petición Muse / Whisper |
| --- | --- | --- | --- |
| No se observa neumotórax. | 50% / 54,17% | 0% / 0% | 2,03 s / 49,05 s (fría) |
| Nódulo pulmonar derecho. | 0% / 0% | 0% / 0% | 1,27 s / 1,49 s (caliente) |
| Lesión de tres milímetros. | 0% / 0% | 25% / 16% | 0,82 s / 1,47 s (caliente) |

Muse produjo «No se observa observa neuromotor» en el primer caso. Revisor Meta propuso quitar la repetición «observa observa» y no propuso cambiar «neuromotor»; petición 8,576 s, propuesta pendiente sin aplicar. Conservar el resultado desfavorable. No se infiere que omitió un error clínico validado: referencias son guiones TTS no revisados por escucha humana.

El 25% de WER de Whisper en medidas se debe a «tres»→«3»: diferencia léxica, no evidencia de cantidad equivocada. La primera petición Whisper incluye 43,63 s de carga del modelo; no mezclarla con las dos calientes. Una voz y tres frases no acreditan superioridad general. Los tiempos hasta primer/final texto en vivo son ausentes en este ensayo por archivos y se conservaron como tales.

## Evidencia y método

Protocolo guardado antes de inferencias, configuración congelada, orden alternado por audio y referencias versionadas. Metadatos en summary.json; red desconocida, navegador y dispositivo de captura no usados. Build y hash corresponden al servidor activo; HEAD observado con cambios no confirmados no equivale a commit limpio.

Evidencia completa local: data/local/lab/reports/lab-acceptance-1793595194080/ contiene protocol.json, mapping.json, enqueue.json, runs.json, runs.csv, pairs.json, review-protocol.json, review.json, summary.json, export-protocol.json, export-checks.json y study-export-checks.json. smoke-source.mjs conserva exactamente el script usado y su hash. La referencia provisional está identificada en los sidecars y nombres de audio; el esquema de referencia actual no contiene procedencia humana: conservarlos juntos y no presentar estos resultados como referencias humanas.

Comprobación independiente Python de distancias por palabra/carácter coincide en 6/6. Exportaciones HTTP JSON/CSV conservan IDs, originales, S/D/I, WER/CER y celdas ausentes en 6/6. Exportación de estudios de producción tiene cero registros, ambos formatos coherentes; estudios rellenos/persistencia ya verificados con fixtures aisladas. No se introdujeron tiempos ni juicios humanos ficticios en el catálogo principal.

La suite previa de la ampliación aprobó 86 pruebas Node y cinco Python. Esta aceptación añadió inferencias reales y verificación HTTP independiente; no se repitió toda esa suite porque no se modificó la aplicación. Scripts nuevos ejecutados y sintaxis Node verificada. El script reutilizable se endureció después para exigir revisión completed; el original ejecutado se conserva. Ninguna comparación adicional pagada fue necesaria.

## Macroproyecto: siguiente fase

Cerrar ampliación del laboratorio y congelar capacidades. Siguiente prioridad: ensayo integral S25 de 10–15 minutos (QR, cinco tomas, destino seleccionado, reemplazo, revisar/deshacer/copiar, interrupción y recuperación). Después congelar versión de demo, auditar cambios, instalación limpia y material de entrega. Mantener pendientes explícitos de referencias/juicio clínico, licencia y condiciones de entrega. Multilingüismo, fusión automática, fine-tuning e integración directa RIS quedan diferidos.
