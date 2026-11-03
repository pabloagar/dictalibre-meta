# Recuperación de carga lenta — 2026-11-03

Se reprodujo un mecanismo de falso error, sin atribuir certeza al incidente anterior que no dejó trazas: startup.js llamaba a fail a los 20 s aunque los recursos siguieran descargándose. Con demora deliberada de live.js de 24 s y red Chrome 300 ms / 200000 B/s, el mensaje de error apareció pero la carga terminó con QR a 26551 ms. Las solicitudes del servidor de prueba terminaron sin errores HTTP (trazas privadas .runtime/startup-delay-before.jsonl).

Corrección: el vencimiento de 20 s mantiene la hoja y pasa a slow, con mensaje de demora; al completar, ready retira automáticamente el aviso. Los errores reales conservan error y reintento. No se introduce recarga automática ni se borra el borrador.

## Resultados

- Demora forzada posterior: loading → slow a 20778 ms → ready a 25528 ms → QR a 26027 ms; cero errores observados.
- Cinco recargas posteriores a 300 ms/1,6 Mbps, caché desactivada: 5/5 completas, QR 3769–4070 ms, sin estados error ni errores JS/recurso capturados. Hoja: delta máximo 0 CSS px. Rectángulos de logo también disponibles en runs.json.
- Chrome, Windows x64, viewport 1600 × 847 CSS px (ver cada resultado), Node v24.22.1, servidor aislado local sin audio ni claves. No es benchmark de Render ni garantía para todas las redes.
- Muestreo rAF y respaldo de 250 ms; sampleCostMs mide costo del muestreo, no todo el sobrecosto. La precisión del reloj no fue calibrada; no se mide CLS global. El observador anterior dependía solo de rAF: se mejoró para registrar estados y finalizar aun cuando faltan cuadros. No se atribuye el fallo anterior a esto sin prueba.
- pnpm check y 243/243 pruebas aprobadas. Una primera ejecución del test de recuperación falló en la lectura CSS cacheada de happy-dom tras cambiar un atributo; Chrome comprobó display:none real. El test conserva transición/medición y el ocultamiento se verificó en navegador. No se borró este resultado desfavorable.

## Reproducir

Desde PowerShell: establecer STARTUP_DELAY_LIVE_MS=24000 y opcional STARTUP_TRACE_FILE a una ruta local, y ejecutar node scripts/test-startup-server.mjs. En Chrome abrir http://127.0.0.1:18976/live, desactivar caché, emular latencia 300 ms, descarga 200000 B/s y subida 93750 B/s. Leer #startup-test-result al terminar; límite 35 s. Repetir sin demora forzada cinco veces. Restaurar red/caché y detener servidor. No ejecutar simultáneamente varias instancias en el puerto 18976. Las trazas guardan solo rutas/estados/duración del servidor de prueba.
