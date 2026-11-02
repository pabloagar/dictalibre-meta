# Comparación preparada: voz humana, glosario congelado

Estado 02-11-2026: preparada, audios aún no recibidos, ninguna inferencia ejecutada. No modificar Render ni laboratorio. Lista y 12 guiones fijados en fixtures/human-glossary-plan.json antes de recibir audios. No ajustar keywords según el archivo o el resultado.

Hipótesis: el glosario equilibrado mejora fidelidad sin cambiar términos válidos, negación, lado, cifras/unidades ni insertar vocabulario en controles 11 y 12. Una voz humana, doce tomas originales; no son doce hablantes. Una pasada por variante más silencio digital por variante = 26 llamadas secuenciales. Mismo PCM por par, orden alternado. Variante base sin keywords y candidata con los diez términos del experimento anterior. Muse Voice Transcribe 1.0, Spanish, streaming manual, mismo formateador. Sin Spark ni sustituciones posteriores.

## Recepción y preparación privada

1. Inspeccionar ZIP y extraer en un directorio nuevo bajo data/local; rechazar rutas absolutas, enlaces o traversal. Solo audios 01–12, sin sobreescritura. No ejecutar contenido adjunto. Si faltan archivos, conservar entrega parcial y esperar el resto antes de la comparación completa.
2. `node scripts/prepare-human-glossary.mjs <directorio-extraído> data/local/human-glossary-v1`. Requiere ffmpeg local (disponible al preparar). Preserva copia original y hashes; decodifica a PCM16 mono 16 kHz sin recortar, limpiar, acelerar o normalizar volumen. Conversión de formato no significa identidad binaria con M4A; ambos hashes quedan registrados.
3. Completar condiciones con datos proporcionados, sin inventar los ausentes (null). Confirmar por escucha del responsable la referencia realmente pronunciada; `script` y `expectedFormatted` empiezan null, no se copian automáticamente del guion. Registrar `referenceConfirmation` (fuente de confirmación), y referenceValidated por caso y global solo tras confirmar. Si hubo tropiezo/corrección, anotarlo, conservarlo y no excluir la toma por fallar.
4. `node scripts/evaluate-human-glossary.mjs data/local/human-glossary-v1`. El validador rechaza referencias pendientes, plan cambiado, archivos faltantes/alterados y rutas fuera del directorio antes de cargar clave o abrir conexiones. Guarda protocolo antes de inferir, fuentes verificadas contra commit, hashes, configuración, metadata y evidencia completa privada.
5. `node scripts/summarize-human-glossary.mjs <directorio-resultados>`. No publicar automáticamente resultados ni voz del usuario; revisar y preparar solo un resumen agregado sin datos personales cuando corresponda.

## Medición y decisión

Comparar texto bruto y formateado, coincidencia exacta normalizando mayúsculas/espacios, términos, marcadores de negación/lado, cifras/unidades y todos los desacuerdos completos. Separar ortografía de significado. Las secuencias de palabras no prueban relaciones semánticas: revisar manualmente los 12 pares, especialmente inserciones en controles y palabras próximas. No convertir una discrepancia plausible en corrección automática. Conservar fallos/timeouts; no dar un caso vacío por correcto si falló el proveedor.

Criterio exploratorio: todas las solicitudes terminales, mejora de términos respecto a base, cero regresiones de contenido ni palabras en silencio. Si ambas variantes ya son correctas, resultado sin mejora demostrada; no exigir que la base falle. No adoptar por una sola tanda: revisar evidencia y limitaciones. Si se cambia la lista tras estos resultados, reservar nuevos guiones antes de repetir. No presentar esta muestra como validación clínica.

Intervalos endToFinalMs y endStreamToFinalMs son los del adaptador, no latencia del teléfono. Red de inferencia, precisión y sobrecosto no medidos quedan null; no inferir Wi-Fi del audio. La grabadora no es Chrome. Metadata de grabación permanece separada de condiciones de replay. No estimar ahorro de tiempo ni porcentajes generales con doce tomas.
