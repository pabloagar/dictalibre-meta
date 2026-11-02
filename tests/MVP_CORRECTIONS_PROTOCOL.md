# Correcciones del MVP: protocolo previo a la comparación

Fecha: 02-11-2026. iPhone lo prueba el responsable. No hay cambio de glosario ni entrenamiento con los audios.

Hipótesis 1: reconocer «dos punto» solo tras un encabezado y antes de salto/final elimina la cifra espuria sin alterar decimales o cantidades. Comparación causal: pasar exactamente los 15 textos ASR de la línea base por el formateador nuevo, además de repetir los 15 WAV una vez. Aceptación: se corrige el encabezado fallido, no se cambian medidas/lados/negaciones ni se degradan los otros 14 textos. La nueva inferencia ASR es estocástica; una diferencia en neumotórax no se atribuirá al formateador.

Hipótesis 2: limitar Spark a contradicciones explícitas, términos ambiguos y formato reduce avisos de completitud sin perder problemas reales. Comparar el prompt anterior y el nuevo sobre textos iguales. Aceptación en línea base: detectar los tres términos deformados; corregido el encabezado, ningún aviso que exija información no dictada. Conservar todos los errores y respuestas inválidas. No calcular sensibilidad clínica.

Controles nuevos fijados antes de ejecutar: hallazgo aislado sin lado/tamaño; hallazgo presente solo en impresión; medidas distintas de lóbulos distintos; ausencia de hepatomegalia con esteatosis; medida actual frente a previa identificada; contradicción de lado de la misma lesión; negación frente a derrame en conclusión; medida 5 frente a 50 de la misma lesión; término deformado nuevo; normalidad heredada junto a lesión explícita en el mismo órgano. Los cinco primeros no deberían generar aviso, los otros cinco sí. Mismos textos/prompt/modelo salvo variante; una repetición por variante, orden alternado. Adjudicación del agente pendiente de revisión profesional.

Plantillas reales: aplicar las 285 localmente al modelo del editor; reemplazar una selección con contenido sintético, comprobar provisional/confirmado, resto intacto, deshacer/rehacer, nuevo informe y contexto sin texto base. No enviar el catálogo privado a Meta. Las pruebas semánticas remotas usan textos nuevos sintéticos con estructura de hallazgos/impresión de las plantillas, sin copiar su contenido. No confundir prueba del modelo del editor con comprobación física ni afirmar revisión clínica de las 285 plantillas.

Métricas: coincidencias finales ignorando mayúsculas/espacios exteriores; conteos y etapa de cada cambio; avisos útiles/de completitud por caso y solicitudes únicas (deduplicación explícita); requestMs/validationMs/totalMs del revisor y endToFinalMs/endStreamToFinalMs del ASR. Intervalos definidos en METRICS.md. Registrar commit real, hashes del código/script/corpus/prompt, configuración y resultado completo local. Red, dispositivo físico, navegador, precisión y sobrecosto se mantienen null cuando no observados. Resultados favorables y desfavorables se conservan.

Publicación: scripts, pruebas y resumen seleccionado sin secretos ni textos privados en GitHub; datos completos locales. Despliegue solo después de las verificaciones y coordinación para no interrumpir dictado. No activar cambios a mitad de la comparación.

## Resultados de la candidata 72f25f0

Ejecución real 02-11-2026; resumen con hashes en `experiments/results/2026-11-02-mvp-corrections/summary.json`. Comparación local `mvp-corrections-1793645039871`; nueva pasada `mvp-evaluation-1793645039975`. Una repetición de cada audio. Se conservaron respuestas y resultados desfavorables.

| Comprobación | Antes | Después |
| --- | --- | --- |
| Mismos 15 textos ASR, coincidencia de formato | 11/15 | 12/15 |
| Avisos de completitud adicionales en textos idénticos | 4 | 0 |
| Términos deformados de la línea base señalados | 3/3 | 3/3 |
| Cinco controles compatibles sin avisos | 3/5 | 5/5 |
| Cinco controles problemáticos con aviso | 5/5 | 5/5 |
| Nueva inferencia de los 15 audios, coincidencia final | 11/15 histórico | 13/15 |

El cambio determinista solo afecta al encabezado «Hallazgos 2.»: ahora es «Hallazgos:». Los otros 14 resultados permanecen idénticos; decimales, cantidades, lados y negaciones no se alteraron. Los controles reales de Spark preservaron el texto y devolvieron avisos con citas; esto no estima sensibilidad clínica.

Resultado desfavorable: con el texto antiguo, el prompt nuevo no señaló «Hallazgos 2.»; el formateador lo previene en el caso reproducido, pero el revisor no garantiza detectar residuos de formato. En la nueva inferencia apareció «No se observa hemotórax.» para el guion «No se observa neumotórax.» y Spark no lo señaló. El otro desacuerdo fue «neumotorax» sin tilde. No modificar automáticamente hemotórax por plausibilidad: ambos son términos médicos distintos. La mejora entre inferencias no se atribuye al formateador ni permite cerrar la puerta de calidad del MVP.

Plantillas: 285/285 pasaron aplicación, reemplazo selectivo, preservación exacta del resto, provisional frente a confirmado, deshacer/rehacer y nuevo informe en el modelo. En navegador local se verificó además una plantilla real de ecografía tiroidea con reemplazo selectivo, deshacer y rehacer exactos. No se enviaron las plantillas a Meta; los diez controles semánticos son sintéticos. No se revisó clínicamente el catálogo.

Latencias descriptivas de nueva pasada: mediana fin recibido→final 795,5 ms; endStream→final 229,1 ms; revisión 1811,6 ms (7 solicitudes únicas, 8 reusos). Las dos evaluaciones corrieron concurrentemente; no comparar rendimiento causal con la línea base. Sin medición de latencia de teléfono ni de sobrecosto/precisión del reloj. Los guiones TTS todavía requieren escucha humana. iPhone queda a cargo del responsable.
