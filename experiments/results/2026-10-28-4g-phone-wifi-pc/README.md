# Prueba comunicada: celular 4G, PC Wi-Fi
Fecha de toma: 2026-10-28T19:22:35.471Z. Redes declaradas por el usuario; no detectadas automáticamente. Dispositivo de referencia: S25 Ultra. Versiones de navegador, señal móvil, operador, configuración Wi-Fi y build no registrados. Una sola toma; no constituye benchmark ni aceptación de todos los casos.

Se conservaron los dos JSON originales y sus hashes en manifest.json. Comprobaciones: secuencias continuas 0..85, suma de bytes, percentiles recalculados y coincidencia exacta entre métricas de emparejamiento de ambos archivos: PASS.

Audio de micrófono, mantener pulsado, 48 kHz: 8,504 s, 86 bloques, integridad verified, 0 duplicados y errores de secuencia registrados. No se recibió audio para evaluación auditiva.

QR: paired sin espera de confirmación manual (null). Crear sesión → autorización: 8,427 s, incluye tiempo humano; iniciar conexión WebSocket en celular → paired: 939,1 ms. Autorización interna en relay: 0,0108 ms, no representa latencia de red.

Transporte: confirmación PC ida/vuelta P50 426,4 ms, P95 579,3 ms, máximo 698,5 ms. Parada → entrega verificada: 446,6 ms. Llegada unidireccional estimada P50 252,5 ms, P95 392,9 ms; resolución orientativa P50 155,4 ms. Intervalo de llegada P95 223,4 ms para bloques mayormente de 100 ms; entregas variables. Cola máxima observada del celular: 181 bytes. La cola es una muestra por bloque, no una observación continua.

Frente a la toma previa de red desconocida: confirmación P50 280,3 → 426,4 ms y P95 336,4 → 579,3 ms; parada → entrega 281,2 → 446,6 ms. Comparación descriptiva, no causal: distinta duración, momento y condiciones sin controlar. No atribuir automáticamente el aumento a 4G.

Conclusión: evidencia de conexión QR y transporte íntegro en la combinación de redes indicada. Pendiente repetir tomas de 30 s con ambos controles, revisar inicio/final audible y probar interrupciones. ASR y métricas de texto siguen sin integrar.
