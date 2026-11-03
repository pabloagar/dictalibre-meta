# Web pública: cinco recargas lentas — 2026-11-03

Destino real: https://dictalibre-demo.onrender.com/live. Build observado después del ensayo por /api/state: 89484c46fea31096a02d189b4485aec176fafb4f a las 2026-11-03T13:00:52Z. Chrome en Windows, viewport observado 1280 × 678 CSS px. No se escribió en el borrador ni se inició dictado.

## Protocolo

Cinco recargas consecutivas, caché desactivada, emulación Chrome/CDP Network.emulateNetworkConditions: offline false, latency 300 ms, downloadThroughput 200000 B/s (1,6 Mbps), uploadThroughput 93750 B/s. Hipótesis/criterio: las cinco completan con editor y QR; hoja y logo conservan rectángulos entre estado inicial, editor montado y aparición del QR (tolerancia 1 CSS px).

Después de cada reload se consultó el DOM cada 150 ms más el tiempo de herramienta. Selectores: data-boot de documentElement; .boot-paper o .clinical-sheet; .boot-header .dicta-wordmark o header .dicta-wordmark; presencia de .scan-home #qr svg. Se guardó una fila cuando cambiaban esos valores. Finalizó 600 ms después de observar QR. Tiempos Date.now del proceso controlador desde antes de reload hasta primera observación: aproximados, incluyen sobrecosto de herramienta. Precisión y sobrecosto no medidos; no representan medición de cada cuadro ni CLS global. No se inyectó código en la página.

## Resultados

| Recarga | Primera observación del QR | Delta máximo de hoja/logo |
| --- | --- | --- |
| 1 | 3368 ms | 0 px |
| 2 | 3337 ms | 0 px |
| 3 | 3114 ms | 0 px |
| 4 | 3297 ms | 0 px |
| 5 | 3231 ms | 0 px |

5/5 completadas con secuencia loading → ready sin QR → ready con QR. Hoja constante x=150, y=112, ancho=980, alto=366 CSS px; logo también sin variación. No se observó estado error. El criterio pasa para estas cinco recargas en estas condiciones, sin garantizar cualquier red/dispositivo. Las pruebas locales anteriores con un fallo se conservan en su carpeta.

Al terminar se restauraron la red sin limitación y la caché. Sin cambios de aplicación, sin reinicio de Render ni del laboratorio. Evidencia numérica completa en runs.json; no contiene cookies, códigos QR ni contenido de informes.
