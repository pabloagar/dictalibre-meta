# Sondas de la revisión técnica del 2 de noviembre de 2026

Scripts de solo lectura usados como evidencia en `docs/REVISION_TECNICA.md` y sus anexos.

- Importan el código real del repositorio con rutas relativas y no lo modifican.
- No llaman a Meta, no usan micrófono y no requieren GPU.
- Usan solo datos sintéticos.
- Se ejecutan desde la raíz del repo, después de `pnpm install --frozen-lockfile`.

| Script | Qué muestra | Hallazgo |
| --- | --- | --- |
| `node docs/revision/sondas/fmt-cases.mjs [frases…]` | Pasa frases por `formatNumbers` y `formatDictation` (el mismo orden que el laboratorio) | C1, M12, B (reconocimiento) |
| `node docs/revision/sondas/guard-cases.mjs` | Propuestas sintéticas a través de `validateReview` | A3 |
| `node docs/revision/sondas/stream-probe.mjs` | Escenarios de Muse-streaming con un proveedor WebSocket falso local. **Termina con `ECONNRESET`** en el escenario de la segunda toma: esa es la manifestación del hallazgo A6, no un fallo de la sonda | A6, M (reconocimiento) |
| `node docs/revision/sondas/worker-probe.mjs docs/revision/sondas/fakepy.sh` | `LocalWorker` con un intérprete falso: cae, se reinicia, se cuelga y recibe llamadas concurrentes | M9 |
| `node docs/revision/sondas/save-bench.mjs` | Costo de guardar catálogos sintéticos de distintos tamaños (escribe en un directorio temporal del sistema) | M8 |
| `node docs/revision/sondas/mobile-probes.mjs` | Arnés `vm` del teléfono (igual al de `tests/mobile-lifecycle.test.mjs`) | A2, M1 |
| `node docs/revision/sondas/relay-probes.mjs` | Origin, rutas, límites y emparejamiento contra `createRelay()` en loopback | M2, M3 |
| `node docs/revision/sondas/relay-probes2.mjs` | Toma 101 y ráfaga tras un corte | M1, M4 |
| `node docs/revision/sondas/relay-probes3.mjs` | Barrido de cortes de 2 a 4,5 s y abort en cascada | M4, A2 |
| `node docs/revision/sondas/perf.mjs` | Microbenchmarks: hash, codificación de bloques, métricas y resampler | §3 |

**Límites:** se ejecutaron una vez en un contenedor Linux con Node v22.23.4, sin S25 Ultra, sin túnel y sin red móvil. Los tiempos no representan al PC de referencia ni al teléfono. Las sondas de reconocimiento no prueban Muse ni Whisper reales.
