# Amplitud de precisión del dictado — protocolo previo

02-11-2026. Solicitud: probar frases variadas mientras el responsable evalúa Samsung, sin actualizar Render. Solo contenido ficticio; no usar plantillas ni audios privados. No cambiar motor, glosario ni código de producción durante esta serie.

Hipótesis: la configuración actual sin glosario conserva términos, negaciones, lateralidad, cifras/unidades y comandos en frases nuevas de distintas regiones. Se fijan antes de ejecutar 24 guiones en fixtures/dictation-breadth.json: tórax, abdomen, neurología, huesos, números y comandos. Incluye afirmación/negación, hipo/hiperdenso, varias dimensiones, comparación temporal, decimal, coma literal y autocorrección verbal. Esta última debe conservarse literalmente: no se está implementando un comando «corrijo». No se usan las frases reservadas para evaluación humana del piloto de términos.

Dos voces locales es-ES (Laura y Helena), 48 WAV, una inferencia por archivo y un silencio digital de cinco segundos: 49 solicitudes secuenciales, ninguna en paralelo. Sin Spark: un revisor que solo ve texto no permite probar fidelidad al audio. Adaptador en servidor loopback independiente; no reiniciar laboratorio, teléfono o Render. Se usa la misma credencial de proveedor en llamadas secuenciales; no se interpreta la latencia como rendimiento de la prueba del teléfono.

Antes de llamar se guardan protocolo, commit observado, hashes de las fuentes comprobadas contra Git, evaluador, manifiesto y audio, configuración y voces. Navegador, dispositivo físico, red, precisión y sobrecosto del reloj: null. Referencias TTS provisionales, pendientes de escucha humana. La síntesis no valida acento chileno ni precisión clínica.

Métricas por resultado: estado terminal; coincidencia de texto final normalizando mayúsculas/espacios horizontales (no unidades ni puntuación); secuencia de términos del vocabulario combinado del corpus; marcadores no/sin/ni y lateralidad; cifras y unidades después del formato; texto ASR original y salidas de cada etapa. Estas comprobaciones mecánicas NO prueban todas las relaciones semánticas: la revisión de diferencias completas sigue siendo necesaria. Cualquier fallo terminal cuenta como fallo, nunca como texto vacío correcto. Silencio correcto requiere estado completo y texto vacío. Intervalos endToFinalMs y endStreamToFinalMs son los del adaptador, no teléfono→pantalla.

Aceptación exploratoria: 49 resultados terminales, ninguna sustitución/omisión/inserción de datos protegidos y silencio sin palabras. Conservar todos los fallos; no ajustar expectativas después de observarlos. No hay comparación causal con estudios anteriores de otras frases/voces. No activar glosario ni reescribir un término médico plausible por otro. Un fallo genera una tarea o prueba de regresión; pasar el corpus no cierra la validación humana.

Reproducción: `pwsh -File scripts/build-dictation-breadth.ps1 -OutputDirectory data/local/dictation-breadth-v1`, luego `node scripts/evaluate-dictation-breadth.mjs data/local/dictation-breadth-v1`. Evidencia completa y WAV locales excluidos; publicar solo guiones ficticios, scripts y resumen revisado. No desplegar; commits de esta evaluación llevan `[skip render]`.

## Control del evaluador

Los 48 WAV se verificaron independientemente con Python wave/hashlib: mono PCM 16 kHz, 16 bits, muestras no vacías y hashes coincidentes; duración calculada total 209,2 s. No es validación de pronunciación. Las 24 referencias textuales pasan el formateador determinista con original intacto. Primera ejecución de esa prueba marcó una diferencia de mayúsculas tras encabezado; se ajustó la comparación al criterio previamente fijado (ignorar mayúsculas), sin cambiar guiones ni aplicación.

El contador inicial de términos incluía «coma» globalmente, confundiendo el comando hablado con el término médico cuando ASR emitía una coma ortográfica. El resumen recalcula ese contador excluyendo «coma» salvo el caso literal «en coma inducido». Se conservan resultados y contadores originales completos: no se cambia ninguna transcripción ni referencia. Los demás ejes conservan el criterio inicial. El resumen es una medición derivada, no una nueva inferencia.

## Resultado: 49 inferencias completas, precisión aún pendiente

Código de aplicación comprobado contra `3c576f21b696afbfe9c5260a6094e4e4711af7c2`; evaluador y guiones nuevos identificados por hashes, no atribuidos a ese commit. Configuración: Muse Voice Transcribe 1.0, Spanish, streaming manual, keywords vacíos; formato de números/términos/comandos activo, sin Spark. Evidencia local: `data/local/lab/reports/dictation-breadth-1793647270653`. Resumen público revisado: `experiments/results/2026-11-02-dictation-breadth/summary.json`.

| Comprobación | Resultado |
| --- | --- |
| Solicitudes completadas | 49/49 |
| Textos con voz coincidentes tras formato | 39/48 |
| Secuencia de términos del vocabulario conservada | 40/48 |
| Secuencia de marcadores de negación/lado conservada | 48/48 |
| Cifras/unidades posteriores al formato conservadas | 48/48 |
| Silencio digital | Completo, sin palabras |
| Referencias textuales directas por formateador | 24/24 |

No sumar el silencio a la exactitud de frases habladas. Los marcadores/cifras vacíos cuentan como secuencia conservada, no como oportunidad clínica adicional. Estas métricas son filtros mecánicos, no una revisión semántica completa.

Nueve diferencias completas: neumotórax→hemotórax en ambas voces (una también basal→vasal y ambas identifica→identifican), hemotórax→emotorax en Helena, esteatosis→Este atosis en ambas, aorta→horta en ambas; además lithiasis por litiasis y hemitórax sin tilde en Laura. Las dos últimas se distinguen como ortografía, no se equiparan a una sustitución por otra entidad médica. Todos esos desacuerdos ya están en el ASR; no los introduce el formato. No se observaron pérdidas de los marcadores de negación/lado ni cambios de cantidades en esta muestra. Los encabezados, saltos, dimensiones, decimales, coma literal y conservación de «corrijo» funcionaron en los ejemplos.

**Decisión:** no pasa el criterio exploratorio de contenido intacto. No se activa glosario ni se implementan sustituciones posteriores. Esta serie amplía el diagnóstico; no es una corrección de precisión publicada. Próximo paso: escuchar las referencias de los casos con diferencias y comparar, con voz humana y frases nuevas, configuración congelada sin/con glosario equilibrado. Mantener casos correctos de otras regiones como control de regresión; no optimizar solo la palabra fallida. Ruido ambiental, distintos ritmos y voces chilenas siguen pendientes.

Regresiones: `pnpm check` y 185/185 pruebas aprobadas (24 nuevas de formato). Audios, resultados completos y credenciales quedan fuera de Git. Render y laboratorio no se reiniciaron; no se cambiaron configuración ni archivos de aplicación. El resumen documental se publica con skip render mientras Pablo realiza sus pruebas.
