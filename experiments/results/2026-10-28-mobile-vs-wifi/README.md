# Comparación exploratoria: red móvil frente a Wi-Fi
Datos aportados por el usuario el 28-10-2026: primer archivo red celular 4G/5G, segundo Wi-Fi. No se distingue generación de radio ni se acredita red hospitalaria. PC por Wi-Fi según contexto previo, sin detección automática. Dispositivo de referencia S25 Ultra; versiones/hardware exactos, señal, build y textos pronunciados no registrados.

Originales: mobile.json y wifi.json. Hashes, resultados derivados y comprobaciones en validation.json. Se recalcularon percentiles de cada toma y del lote; se comprobaron secuencias y suma de bytes. Todo consistente.

| Condición | Tomas íntegras | Audio total | Bloques | Mediana parada → verificación | Rango parada → verificación |
| --- | --- | --- | --- | --- | --- |
| Móvil 4G/5G declarado | 5/5 | 36,229 s | 365 | 1309,3 ms | 343,9–4726 ms |
| Wi-Fi declarado | 5/5 | 32,365 s | 326 | 281,3 ms | 280–290,6 ms |

Todas: micrófono, mantener pulsado, 48 kHz; cero duplicados/errores de secuencia/telemetría omitida registrados. No se escuchó WAV; hash no prueba ausencia de recorte acústico ni exactitud clínica. Duraciones móvil 5,56–10,019 s y Wi-Fi 3,032–9,837 s; 19 ms sobre diez segundos no invalida caso de uso.

Parada → confirmación por orden de toma:
- Móvil: 343,9; 382,6; 1309,3; 3145,1; 4726 ms.
- Wi-Fi: 290,6; 280,4; 281,3; 284,6; 280 ms.

La mediana de medianas por toma de confirmación de bloques es 482,8 ms móvil frente a 282,4 ms Wi-Fi: no es el P50 de todos los bloques combinados. Con cinco tomas el P95 por rango más cercano coincide con el máximo; no presentarlo como estimación robusta de cola.

La red móvil muestra retraso creciente dentro del lote, también en ACK medido con un solo reloj. No se explica únicamente por incertidumbre de sincronización. Los hashes y vaciado de captura registrados duran milisegundos, pero esto no localiza el cuello de botella: faltan métricas de TCP, túnel, sistema y tramo de red. No adjudicar causalidad definitiva a señal móvil, operador o transición 4G/5G. Las colas muestreadas del navegador no miden todas las colas de red.

Llegada unidireccional estimada: mediana de medianas 337,7 ms móvil y 145,6 ms Wi-Fi. Resolución orientativa por toma ~147–156 ms y ~134–143 ms respectivamente; priorizar medición directa de parada/ACK para decisiones.
Emparejamiento: conexión del celular 1375,3 ms móvil y 820,9 ms Wi-Fi. Crear sesión → autorización incluye tiempo humano (8,22 y 15,89 s), no sirve para concluir que Wi-Fi fue más lento. QR directo correcto en ambos.

Decisión propuesta, coherente con preferencia del usuario: Wi-Fi como escenario principal de demostración por estabilidad en esta muestra; conservar móvil como capacidad probada con latencia variable. No afirmar que todo Wi-Fi supera a toda red móvil. Un lote por condición, secuencial, diferente audio/duración, sin controles suficientes para inferencia causal.

La arquitectura actual sigue pasando por Internet/túnel/relay incluso con ambos dispositivos en Wi-Fi. No equivale a conexión directa LAN ni modo offline. Antes de presentar en otra red, comprobar el enlace, QR y varias tomas allí. La compatibilidad con Wi-Fi hospitalario específico y con sus reglas no fue evaluada.

Fases: queda documentada repetibilidad de transporte para cinco tomas mantener por condición, sin cerrar valoración auditiva, modo inicio/parada ni pruebas de interrupción. ASR no integrado, estos tiempos no son de transcripción.
