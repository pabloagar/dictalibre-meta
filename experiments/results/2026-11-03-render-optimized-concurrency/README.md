# Concurrencia optimizada verificada en Render

03-11-2026. Despliegue 7532136400, success 22:19:16 UTC. Build servido y observado en las 30 tomas: `f6d3c18074f2a25e8aa05a4aa25f6a4d6e7739be`. Comprobación previa: pnpm check y 277/277 pruebas. Publicación autorizada después de terminar el dictado del responsable.

| Métrica, diez sesiones simultáneas | Antes | Después |
|---|---:|---:|
| Tomas, tres rondas | 30 | 30 |
| Finales recibidos e integridad audio | 30/30 | 30/30 |
| Mediana detener→resultado | 4,686 s | 0,502 s |
| Máximo detener→resultado | 6,039 s | 0,684 s |
| Mínimo detener→resultado | 3,947 s | 0,401 s |
| Secuencia completa de palabras exacta, ignorando signos/mayúsculas | 26/30 | 27/30 |
| Marcadores de otra sesión | 0 | 0 |
| Cupos activos al terminar | 0 | 0 |

Reducción de mediana: **89,28 %**, 4,183 segundos menos. No se perdieron tomas ni bytes PCM: hashes relay y ASR coincidentes. Todas las cancelaciones de tomas ajenas rechazadas con 404. Sin repetición extra de palabras en la corrida nueva; persiste «es pera»→«espera» en las tres rondas de esa frase. No se atribuye mejora de exactitud al kernel: el audio es byte a byte idéntico en benchmark y referencias; ASR tiene variabilidad.

Con el candidato: máximo audio pendiente observado 0,320 s (mediana de máximos por toma 0,200 s), frente a 5,71–6,40 s en la corrida diagnóstica original separada. Mediana resampleMs 124 ms por toma, frente a 939 ms en ese diagnóstico. La comparación antes/después sostiene que el procesamiento síncrono de audio contribuía sustancialmente al atasco; no aísla todos los factores de red/proveedor/host. Cierre enviado a Meta→final mediana 76 ms.

Método: mismo corpus sintético Microsoft Helena es-ES de aproximadamente ocho segundos, 48 kHz, diez parejas WebSocket con cookies independientes, tres rondas por variante, mismo PC Windows y proveedor real Meta. Sin teléfonos físicos ni navegador; no incluye permisos, captura física, editor o revisión Spark concurrente. Sin cambio de cuota/modelo/plan. Versión anterior eb0b37cb17927e8c56ac164c03794bc1d6bf11fc. Medidas performance.now, sondeo 10 ms, precisión efectiva/sobrecosto/coste monetario/red física null. Resultados cortos de una conexión: no SLA ni garantía de carga prolongada. Audio y credenciales no publicados; summary.json contiene métricas y frases sintéticas.

Reproducción: scripts/test-demo-concurrency.mjs --mode=remote --open-access=true --count=10 --repetitions=3 --manifest=data/local/concurrency-tts-20261102-v2/manifest.json --origin=https://dictalibre-demo.onrender.com --output=NUEVA_CARPETA. Requiere corpus local, no dictado humano activo. Evidencia local de esta ejecución: data/local/concurrency-render-optimized-20261103.

Código en GitHub, mejora activa en Render. Registro documental posterior con [skip render] para evitar otro reinicio.
