# Optimización local de conversión de audio

03-11-2026. **Preparada y probada localmente. Render no actualizado.**

## Diagnóstico
Repetición de diez sesiones contra Render `eb0b37cb17927e8c56ac164c03794bc1d6bf11fc`: mediana detener→resultado 4,735 s; máximo audio en cola por sesión 5,71–6,40 s. Tras enviar endStream a Meta, final en 0,092–0,192 s (mediana 0,146). Esto localiza gran parte de la demora antes del final del proveedor. El remuestreo síncrono recalculaba funciones seno/coseno para cada coeficiente de cada muestra; consumió 800–1133 ms por toma en esa corrida. Saturación de CPU/event loop es una hipótesis consistente, no diagnóstico exclusivo: no se obtuvo perfil CPU/RAM del servidor.

## Cambio
En tasas 24/48/72/96 kHz, las posiciones de entrada son enteras y los 65 coeficientes son constantes. Se calculan una sola vez por toma, conservando orden de operaciones y suma. Tasas fraccionarias como 44,1 kHz conservan el camino original. No cambia modelo, glosario, cuotas, calidad ni formato PCM. STREAM_PREPARATION se conserva porque el resultado es idéntico byte a byte.

## Resultados
- Benchmark CPU alternado, cinco pares tras calentamiento, diez audios completos intercalados por bloques: mediana original 3316 ms, candidato 745 ms (**77,55 % menos tiempo**). Diez hashes de audio de salida idénticos en las cinco repeticiones.
- Meta real en servidor local, tres rondas de diez por variante: **30/30 finales íntegros y aislados** antes y después. Mediana resampleMs por toma 325→68 ms. Mediana detener→done 300→290 ms. Máximo 377→433 ms: no mejora acreditada en la cola de latencia del proveedor ni promesa de aceleración global.
- Secuencia completa de palabras (ignorando signos/mayúsculas) 27/30 antes y después; no es validación de precisión clínica ni corrección de errores de transcripción.
- Prueba regresiva con 32 referencias originales, ocho tasas, muestras cortas/bordes/ruido de amplitud completa, tres particiones por caso: salida idéntica. Suite completa **277/277**, pnpm check aprobado.

## Límites y reproducción
CPU en este PC y Render son diferentes: la espera en producción aún NO está corregida ni medida con el candidato. No se extrapolan los 290 ms locales a Render. Pendiente desplegar cuando el responsable lo autorice y repetir diez sesiones en el mismo servidor; aceptar solo si baja demora/cola y se conservan integridad/aislamiento.

Una corrida local exploratoria se solapó con la remota; se conserva en data/local/concurrency-local-before-optimization pero se excluye de la comparación. Comparación aislada en data/local/concurrency-local-before-isolated y concurrency-local-after-optimization. Corpus TTS no clínico Microsoft Helena es-ES, 48 kHz, tres rondas; Windows/Node v26.13.0; red/hardware exactos null, sin navegador ni teléfono físico, coste monetario null. Medidas performance.now, sondeo 10 ms del driver, precisión/sobrecosto no medidos.

CPU: `node scripts/benchmark-resampler.mjs BASELINE.mjs MANIFEST.json OUTPUT_NUEVO.json`. Baseline original y candidato preservados en data/local/resample-optimization; manifiesto data/local/concurrency-tts-20261102-v2/manifest.json. Cinco rondas alternan orden para reducir sesgo de calentamiento; hashes en summary.json.

La sourceHash antigua del driver no incluía stream-audio.mjs, por lo que no distingue las dos variantes; no interpretarla como hash completo del backend. Los hashes separados de baseline/candidato están en cpuBenchmark y corresponden a las copias usadas. Driver corregido para incluir stream-audio en futuras ejecuciones; no se reescribe evidencia histórica. Árbol local sucio, build local null; no atribuir resultados a commit limpio.

Cambios y resultados locales, sin push ni despliegue por instrucción del responsable.


Actualización posterior: desplegado con autorización y probado en Render; ver [validación pública](../2026-11-03-render-optimized-concurrency/README.md). Mediana diez sesiones 4,686→0,502 s; el estado local anterior describe el momento previo al despliegue.
