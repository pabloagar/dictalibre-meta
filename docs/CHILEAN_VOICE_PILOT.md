# Voces chilenas: piloto y factibilidad

## Objetivo y cambio de prioridad — 03-11-2026

Crear identidades vocales artificiales con acento chileno para dictados ficticios, con posible corpus ASR posterior. No se entrena Whisper ni se utiliza la voz del responsable. Tras revisar el plan inicial, el responsable priorizó Chatterbox por su preferencia de escucha y pidió estudiar ambas rutas. Esta preferencia no es una comparación controlada de motores.

1. **Referencia artificial → Chatterbox V3:** Qwen VoiceDesign crea solo dos referencias candidatas, una femenina y una masculina. Chatterbox genera p01–p05, dos semillas por perfil: 20 muestras. Referencias y resultados se escuchan por separado. Una referencia sintética no demuestra identidad exclusiva ni acento chileno, y el motor puede alterar ambos.
2. **Adaptación de Chatterbox con corpus chileno:** auditoría documental y de código antes de gastar en entrenamiento. No ejecutar una receta comunitaria sin verificar compatibilidad con V3 y separación por hablante.

Código reproducible: [scripts/voices-chile](../scripts/voices-chile/README.md). Ejecución y datos privados en el laboratorio separado; sin cambios en Studio, web o backend.

## Protocolo previo

Hipótesis: Chatterbox condicionado por una referencia artificial conserva un acento percibido como chileno y lee íntegramente los guiones. Condición limpia, mismos cinco guiones y semillas 20261103/20261104 por perfil. No comparar causalmente con lotes anteriores de distinto entorno. p01 aparece tanto en la referencia como en la prueba: informar aparte su posible ventaja; p02–p05 son textos nuevos para la referencia.

Éxito técnico: WAV mono legible, muestras finitas, no silencio total y pico menor que 1. Guardar originales FLOAT y arrays incluso ante fallos; no normalizar para esconder recorte. Éxito humano: diez muestras por perfil, medias de acento y naturalidad ≥4/5, cero errores de términos, cantidades/unidades, negaciones, comandos, otras palabras, cortes o repeticiones. Escucha completa y transcripción literal explícitas. Un oyente, evaluación exploratoria, no ciega. Los fallos también quedan en manifiestos.

Tras aprobación humana, cinco frases nuevas prueban estabilidad usando una salida aprobada como referencia en el mismo motor. Exigir identidad estable en las cinco, además de los criterios anteriores. Exportación solo con revisión vinculada por hashes; referencias candidatas no son un corpus. La exportación Chatterbox exige además revisar las referencias artificiales. Los derivados 16 kHz se comprueban después de remuestrear. Todas las variantes de una frase conservan partición desarrollo. No hay evaluación humana independiente ni prueba final de Whisper en estos datos.

Tiempos: descarga por separado; carga entre sincronizaciones CUDA; generación entre sincronizaciones, excluye escritura; duración = muestras/frecuencia; RTF = generación/duración. Guardar resolución de perf_counter, GPU, Python, CUDA, dtype, configuración, revisión, hash del generador y pip freeze. Versiones transitivas se conservan por ejecución; requirements fija dependencias directas. Red, navegador, sobrecosto, puntuaciones y errores desconocidos permanecen null. Semillas no garantizan reproducción bit a bit entre dispositivos.

## Presupuesto y cómputo

Tope autorizado US$10, sin suscripciones nuevas. Colab mostró saldo 148,5 unidades, T4 de 15.360 MiB y tasa aproximada 1,15 unidades/h. Tarifa de reposición consultada: 100 unidades por US$9,99. Una hora equivaldría aproximadamente a US$0,114885; es una estimación de reposición, no factura ni gasto directo. El saldo incluye beneficios del plan existente; no se asume gratuidad del consumo.

Notebook con watchdog de una hora mediante `google.colab.runtime.unassign`, separado del proceso de instalación/inferencia. Comprobar saldo y tasa antes/después y finalizar sesión tras recuperar resultados. El watchdog no es un límite de facturación del proveedor: conservar esa limitación, no prometer garantía absoluta si falla el servicio de desconexión. No comprar ni renovar unidades automáticamente.

## Ruta de corpus: evidencia y límites

[OpenSLR SLR71](https://openslr.org/71/) publica habla chilena transcrita, con control manual previo que puede contener errores. Descargados solo ficha, licencia y dos índices: 1.738 líneas femeninas y 2.636 masculinas (conteo directo de líneas, no horas ni hablantes verificados). Hashes y fuentes en `procedencia_slr71/audit.json` privado. Audio no descargado ni escuchado; duración, distribución por hablante y calidad propia pendientes.

Licencia [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/): atribución y compartir igual para adaptaciones distribuidas; permite uso comercial bajo sus condiciones. No establece por sí sola que todo modelo entrenado sea una adaptación, que toda app deba abrirse ni que todo producto pueda cerrarse. Permisos sobre identidad vocal y alcance de modelos/corpus derivados siguen pendientes de revisión. No usar SLR71 como clonación o entrenamiento en este piloto inicial.

## Factibilidad de adaptar Chatterbox

El árbol oficial de [Chatterbox](https://github.com/resemble-ai/chatterbox/tree/5de7a54aa4e5e2baadb0182dde554908b48b85c2) no contiene archivos de entrenamiento/LoRA en la revisión examinada. Los paquetes regionales publicados muestran que hay adaptación de modelos, pero no constituyen una receta reproducible para Chile.

Se revisó estáticamente [rohitss/chatterbox-finetuning-multilingual](https://github.com/rohitss/chatterbox-finetuning-multilingual/tree/e9816b4e8292ebf49ae59ce55f07c790764faa96), licencia MIT declarada, sin instalar ni ejecutar. Su guía declara mínimo 16 GB y recomienda 24 GB; son requisitos del autor, no mediciones nuestras. El script configura árabe, guarda pesos con nombre v2 y recomienda datos del mismo hablante. Por ello no demuestra adaptación multihablante de acento chileno ni compatibilidad directa con V3.

Hallazgos de código a resolver antes de entrenar:

- Fijar explícitamente V3 y español, adaptar guardado/carga y verificar round-trip del checkpoint.
- Reemplazar los fallbacks a embeddings, audio o tokens cero por exclusión registrada de muestras inválidas; no entrenar sobre sustitutos silenciosos.
- Verificar qué parámetros reciben gradientes, congelación efectiva y memoria pico, en lugar de asumir que usar un optimizador LoRA evita el resto del cálculo.
- Crear particiones por hablante y deduplicación textual; separar aprendizaje del acento de reproducción de identidad. El ajuste de un solo hablante no satisface por sí solo la identidad nueva solicitada.

**Decisión de factibilidad:** ruta A ejecutable como piloto de inferencia; calidad/acento pendientes de escucha. Ruta B plausible, pero no lista para entrenamiento directo. Siguiente experimento, aún no autorizado como entrenamiento comercial: auditar audio/permisos, portar una receta mínima, medir 20 pasos con batch 1 y clips cortos, pérdida finita, gradientes LoRA, memoria, tiempo y recarga; presupuestar después con medidas reales. No se promete que US$10 alcancen para entrenar una voz.

También se inspeccionaron dos alternativas comunitarias, sin ejecución: [99eren99](https://github.com/99eren99/chatterbox-multilingual-finetuning/tree/bf2017ddc1266acedb23189a4e9c823c91be8586), que se declara WIP y propone ajustar T3 y S3/flow; y [gokhaneraslan](https://github.com/gokhaneraslan/chatterbox-finetuning/tree/fac31c46ec96b37283a363a1a96c2a0e56640e03), con preprocesamiento offline, ajuste completo y LoRA. Sus descripciones no constituyen validación propia de V3 chileno multihablante. No se seleccionó ni ejecutó un entrenador solo por su popularidad o cifras promocionales de memoria.

## Estado

Ejecución real completada el 03-11-2026 en Colab T4. Dos referencias Qwen y veinte muestras Chatterbox recuperadas en el laboratorio privado; todos los WAV pasan lectura, finitud, ausencia de silencio total y pico menor que 1. Hashes del ZIP y de los veinte WAV comprobados tras descargar. No equivale a ausencia de distorsión audible ni a fidelidad al guion.

| Medida directa | Qwen, 2 referencias | Chatterbox, 20 muestras |
|---|---:|---:|
| Audio total (s) | 15,28 | 108,44 |
| Generación total (s) | 173,894 | 163,159 |
| RTF agregado, suma generación / suma duración | 11,380 | 1,505 |
| Carga (s) | 45,183 | 24,261 |
| Descarga snapshot (s) | 63,690 | 31,395 |
| dtype observado | bfloat16 | float32 |
| CUDA | 12.8 | 12.4 |

Python 3.13.16, T4 15.360 MiB. No es una comparación controlada de velocidad o calidad: distintos textos, muestras, modelos y dtype. La carga de Chatterbox incluyó una descarga auxiliar del tokenizador; no representa exclusivamente cómputo local. Sobrecosto de instrumentación no calibrado. Cada corrida conserva entorno, pip freeze y hash del generador; commit de ejecución permanece null. El archivo requirements de la corrida Chatterbox original era el de Qwen por un fallo de archivado: pip freeze y execution_source/requirements-chatterbox.txt preservan las dependencias realmente utilizadas. Corregido para futuras corridas sin modificar la evidencia original.

**Resultado perceptual comunicado por el responsable:** «ninguna chilena», sobre las dos referencias Qwen. No se inventan puntuaciones 1–5, naturalidad ni transcripciones; siguen null. Referencias no aprobadas para el objetivo de acento. Las veinte salidas Chatterbox quedan pendientes de escucha, conservadas como experimento. No se ejecutó estabilidad ni exportación de corpus ni entrenamiento de Whisper. La ruta por descripción utilizada falló la impresión inicial de acento; no demuestra que toda configuración de Qwen sea incapaz de producirlo.

Fallos conservados: primer intento de referencias sin pip; instalación duplicada de Chatterbox sobre un entorno compartido y posterior importación con SIGBUS. Se detuvo el duplicado y se instaló en un entorno nuevo; importación y veinte inferencias completas exitosas. La concurrencia del instalador es una causa sospechada, no demostrada, del SIGBUS.

Saldo mostrado: 148,50 → 147,96 unidades; diferencia aproximada 0,54, equivalente a US$0,053946 a tarifa de reposición. No es factura, precisión limitada por redondeo y actualización del panel; coste facturado null. Sin compras. Tras recuperar archivos, runtime.unassign y panel verificado con **0 sesiones activas**, tasa 0/h, alrededor de 17:13 UTC. ZIP privado SHA256 `28e99ae82f0b3a6ebd713b777e409b8bd6bab4da0db251223930d291738533fa`.

Conclusión: inferencia de Chatterbox con referencias nuevas técnicamente factible, acento chileno aún no logrado/validado. La ruta de adaptación con corpus queda preparada documentalmente, pendiente de auditoría de audio/permisos y prueba mínima V3 multihablante antes de presupuestar entrenamiento. Audios y exportaciones privadas no se publican. Estado GitHub y web en HACKATHON_LOG.md.
