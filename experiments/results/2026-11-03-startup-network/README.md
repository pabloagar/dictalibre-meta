# Recargas y red lenta — 2026-11-03

Tres recargas normales y tres lentas planificadas; una repetición lenta adicional tras un fallo. Chrome real, Windows x64, viewport 1600 × 777 CSS px. Servidor local aislado con código del checkout; no prueba de la red real de Render. Node v24.22.1. Caché desactivada. Red lenta emulada: 300 ms, descarga 200000 B/s (1,6 Mbps), subida 93750 B/s. Sin audio ni acceso a informes reales.

Criterio definido: todas las cargas completan y cambio máximo <=1 CSS px en rectángulos de hoja/logo entre estados observados de hoja inicial, editor montado y QR. requestAnimationFrame observa rectángulos; no es medición de CLS ni garantiza detectar cada pintura. Reloj performance.now; precisión y sobrecosto no medidos. El script de instrumentación añade una petición; tiempos son de este ensayo, no un benchmark del sitio sin instrumentación.

## Resultados

- Normal: 3/3 completadas; QR 232–307 ms desde inicio de navegación.
- Lenta: 2/3 completadas; QR 4406–4475 ms. Una muestra terminó con data-boot=error, sin QR ni salida de observador. No se conoce causa; no se elimina ni atribuye al servidor o navegador.
- Repetición diagnóstica lenta: completada, QR 4466 ms.
- Seis cargas completadas: cambio máximo observado de hoja 0 CSS px. Los rectángulos del logo quedan en runs.json.
- No se cumple el criterio global de todas las cargas correctas: queda pendiente diagnosticar la carga fallida. No hay evidencia de salto de hoja en las cargas completadas.

## Reproducir

Ejecutar `node scripts/test-startup-server.mjs` en un puerto libre 18976. Abrir http://127.0.0.1:18976/live en Chrome. Desactivar caché y aplicar las condiciones anteriores con DevTools/CDP; recargar tres veces por condición. Leer el JSON DOM de `#startup-test-result` tras cada carga (se produce 600 ms después del QR; límite de observación 30 s). Registrar también errores y muestras sin resultado. El observador no modifica el contenido de los informes ni usa servicios externos. Restaurar red/caché y detener el servidor al finalizar. Los hashes en runs.json identifican fuentes observadas, sin atribuirlas a un commit de ejecución no verificado.
