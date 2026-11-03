# Concurrencia real en Render: 1, 5 y 10 sesiones

Fecha: 03-11-2026. Sin despliegue ni reinicio. Versión observada en todas las tomas: `eb0b37cb17927e8c56ac164c03794bc1d6bf11fc`.

| Sesiones simultáneas | Tomas (3 rondas) | Finales recibidos / audio íntegro | Mediana detener → resultado | Rango | Secuencia de palabras exacta* |
|---|---:|---:|---:|---:|---:|
| 1 | 3 | 3/3 | 0,47 s | 0,45–0,56 s | 3/3 |
| 5 | 15 | 15/15 | 0,45 s | 0,41–0,53 s | 15/15 |
| 10 | 30 | 30/30 | 4,69 s | 3,95–6,04 s | 26/30 |

*Comparación de todas las palabras ignorando mayúsculas y puntuación; no valida puntuación. No faltaron tomas ni bytes de audio (hashes relay y ASR). Ningún marcador de otra sesión. Todos los intentos de cancelar tomas ajenas fueron rechazados (404); no aplica con una sesión. Cero cupos activos al terminar cada nivel.

En diez sesiones: tres transcripciones de la sesión 8 cambiaron «es pera» por «espera»; la sesión 1 de la segunda ronda añadió una repetición de «manzana». No se atribuyen causalmente estos errores a la carga. La sesión pera no estuvo en los niveles 1/5. El criterio inicial por marcadores pasó 48/48, pero la comprobación adicional de secuencia completa pasó 44/48: no confundir ambas medidas.

La mediana con diez aumentó 4,21 segundos (aproximadamente 9,9 veces la individual); con cinco no se observó aumento. Para el mismo audio de manzana en los tres niveles: medianas 0,472 / 0,425 / 4,671 s. La apertura ASR start→ready tuvo medianas 0,467 / 0,499 / 0,439 s; el retraso relevante se observó después de detener, no durante la preparación. Causa CPU/Meta/red no establecida.

Método: tres rondas consecutivas por nivel, diez frases TTS no clínicas de Microsoft Helena Desktop es-ES, 48 kHz PCM mono, aproximadamente ocho segundos cada una. Una máquina Windows, Node v26.13.0, una conexión de red de tipo desconocido. Pares PC/teléfono por WebSocket, cookies independientes, emparejamiento QR y Muse real. El driver espera todos los ready antes de enviar audio a ritmo real. No son navegadores ni micrófonos físicos; no cubre pintado del editor, permisos, precisión clínica, dictados largos o revisión Spark simultánea. No se verificó el funcionamiento del glosario en este ensayo, se conserva config demo-muse/manual del driver.

Medición: performance.now en milisegundos; detener del emisor a mensaje done recibido, incluye red/relay/ASR. Espera de mensajes por sondeo de 10 ms; precisión efectiva y sobrecosto no medidos. Coste monetario null. Rondas cortas: no garantía de latencia sostenida. Protocolos locales guardan hash del driver, hash de PCM, checkout y árbol sucio; la versión servida se distingue del checkout local.

Reproducir (sin dictado humano activo): ejecutar scripts/test-demo-concurrency.mjs con --mode=remote --open-access=true --count=1|5|10 --repetitions=3 --manifest=data/local/concurrency-tts-20261102-v2/manifest.json --origin=https://dictalibre-demo.onrender.com y --output en una carpeta nueva. Requiere corpus local excluido de Git. summarize.py reproduce el resumen de las tres carpetas authorized. JSON público sin audio, cookies ni identificadores de sesión. Evidencia completa y transcripciones sintéticas permanecen en data/local/concurrency-20261103-authorized-{1,5,10}.

Validación del código del driver: pnpm check y 276/276 pruebas. El ensayo no modifica la aplicación ni Render. Archivos nuevos y cambios del driver quedan locales; no push.
