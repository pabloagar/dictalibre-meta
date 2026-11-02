# Puerta de viabilidad: puntuación literal

Estado: protocolo preparado, no motor literal validado, no cambio de producción.
Fecha: 02-11-2026. Base inspeccionada: de0d08b.

Hallazgo: Muse documenta limpieza final con puntuación y no ofrece transcript reformatting ni procedencia acústica por signo. El adaptador Whisper local usa transcribe estándar, no un modo literal validado. Por tanto cambiar a Whisper no constituye una solución demostrada ni está disponible en Render como sustituto directo de la GPU local.

Fuente: https://dev.meta.ai/docs/speech-to-text
No usar keywords como instrucciones ni tomar la ausencia de comandos en el parcial como prueba de que no se dijeron.

## Experimento propuesto antes de ejecutar
Hipótesis: una alternativa que conserve comandos hablados permite separar transcripción de formato sin eliminar puntuación dictada.
Primero identificar opción soportada y runnable; si no existe, detener esa variante y conservar el fallo de viabilidad. No gastar grabaciones humanas para una variante inexistente.
Comparación: mismo PCM por variante, sistema actual con Glosario MVP frente a candidata identificada; dos repeticiones por archivo, orden alternado. Sin Spark ni corrección de términos automática.
Guiones sintéticos iniciales (referencias provisionales hasta escucharlos):
1. Pulmones bien expandidos
2. Pulmones bien expandidos punto
3. Sin derrame pleural ni neumotórax
4. Sin derrame pleural coma ni neumotórax punto
5. Hallazgos lesión de uno coma ocho centímetros
6. Hallazgos dos puntos nueva línea lesión de uno coma ocho centímetros punto
Controles adicionales: silencio, en coma inducido, punto de sutura, número decimal ya emitido como 1,8.
Mantener 1,8 en ambas frases de medida, no contarlo como puntuación espontánea.

Métricas: signos espontáneos por toma (conteo), comandos explícitos preservados/total, exactitud de palabras y medidas por caso. Latencia extra en ms: diferencia pareada de recepción de audio completo a texto final, separar carga fría; no equivale a latencia del teléfono. Conservar original, salida y eventos de formato.
Aceptación: cero signos espontáneos en controles sin comandos; todos los explícitos conservados; palabras, negaciones, lados y medidas intactos; silencio vacío. Resultado que falle cualquier protección no se activa. Latencia se reporta, no se inventa umbral después.
Metadata: commit y hashes de fuentes/audio/configuración, modelo/revisión, repeticiones, fuente, voz, referencia escuchada. Dispositivo físico, navegador, red, precisión y sobrecosto no medidos: null. Evidencia completa privada, agregado público.
Estado de ejecución: 0 inferencias nuevas; resultados pendientes.
Alternativa segura si falla viabilidad: mantener original y edición/aceptación manual. No afirmar que una IA textual sabe qué signo se pronunció.

## Ensayo real de keywords de comandos, 02-11-2026
Se probó una opción soportada de vocabulary biasing (no modo literal garantizado): MVP frente a MVP + punto/coma/dos puntos/nueva línea/nuevo párrafo/punto y coma.
32 inferencias reales Muse: 7 guiones sintéticos Microsoft Laura y silencio por 2 variantes y 2 repeticiones; orden alternado, mismo PCM por par. Evidencia privada punctuation-pair-1793656574783, protocolo/hashes/resultados completos y puntuación recalculada. Referencias TTS provisionales, no escuchadas independientemente.
Resultado formateado exacto: base 10/16, candidata 11/16 (incluyen 2 silencios por variante). Sin silencios: 8/14 y 9/14. Los 6 casos sin comandos (3 guiones x2) fallan en base; 5/6 en candidata. Todos los 8 casos con comandos o coma literal pasan en ambas tras formateo. Decimal 1,8 conservado. Candidata añadió dos puntos no dichos en ambas repeticiones del guion 5 y coma final en una: regresión conservada. Mejora del guion 1 solo en primera repetición, no estable. No pasa puerta de adopción; NO habilitada.
El evaluador reutiliza protocolo de pares: termMatch solo comprueba términos torácicos, NO es métrica de puntuación; consultar punctuation-scored.json generado por score-punctuation-pair.mjs. Exactitud ignora mayúsculas y espacios horizontales, preserva signos/saltos. El protocolo previo hablaba de opción literal: esta ejecución es exploratoria de keywords, no certificación de literalidad. Scripts reproducibles build-punctuation-pair.ps1 (usar pwsh), evaluate-punctuation-pair.mjs y score-punctuation-pair.mjs. Intento inicial Windows PowerShell sin voz Laura falló antes de inferencias; pwsh sí dispone de ella. No audio humano ni cambios a Render.
