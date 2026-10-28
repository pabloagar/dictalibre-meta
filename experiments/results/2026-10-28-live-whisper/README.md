# Dictado conectado a Whisper: integración sintética

28-10-2026. Emisor Node `scripts/smoke-live.mjs`, WebSocket por túnel público HTTPS, relay, puente loopback, receptor real en navegador y Whisper large-v3 FP16 GPU. No se utilizó el micrófono físico del teléfono. Entrada de voz Windows sintetizada; ritmo de envío ~100 ms/bloque. La etiqueta de protocolo `tone` identifica origen sintético, aunque el fixture es voz sintetizada.

Dos sesiones independientes, cada una con recordingId=1; los UUID de ejecución distinguen sus resultados. Exportación `runs.json` incluye ambas observaciones, sin credenciales ni tokens QR.

| Control | Fin recibido PC→DOM texto | Parada→DOM texto estimada | Resolución orientativa | Motor | Carga local |
| --- | ---: | ---: | ---: | ---: | ---: |
| Primer control | 23,746 s | 23,789 s | 47,9 ms | 22,485 s | 18,146 s |
| Frase corregida, modelo cargado | 2,473 s | 2,519 s | 44,2 ms | 2,301 s | 0 s |

La primera fuente se había regenerado con PowerShell 5 leyendo el script UTF-8 sin BOM, alterando las tildes antes de síntesis. Su salida no se usa para evaluar ASR ni comparar precisión/latencia entre textos. Se corrigió la codificación del script (BOM UTF-8) y regeneró el control; hash WAV correcto `c34ee1f268b746296881fcaf441565195c8d80ae78035c1b39965379441bf130`, igual al control inicial del laboratorio. El primer resultado se conserva con esta limitación explícita.

Segundo control: frase de 5,5425 s, 56 bloques, SHA verificado. Resultado: «No se observa derrame pleural. Nódulo de 3 milímetros en el pulmón derecho.» Diferencia literal respecto al texto de síntesis: tres→3. La fuente está grabada y es reproducible; no acredita calidad de captura del S25 Ultra.

En ambas tomas se verificó texto visible y persistencia de métricas live en catálogo. La estimación usa relojes calibrados; no equivale a precisión de 44 ms garantizada. La medida del PC incluye polling y actualización DOM, no presentación física de píxeles. Ver METRICS.md.

El túnel previo estaba caducado (`Tunnel not found`, DNS inexistente); se renovó antes de la prueba. No se publicó el servidor de inferencia, solo el relay existente. Pruebas automatizadas: 32 aprobadas, con puente/origen, marca de parada, valores ausentes/negativos y persistencia de métricas. Pendiente prueba de experiencia real del usuario, varias tomas consecutivas y comportamiento en su red Wi-Fi.
