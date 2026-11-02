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
