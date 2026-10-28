# Contribuciones y procedencia

## Origen y alcance temporal

La idea, investigación y exploración conceptual anteceden al evento. La nueva implementación concursante inicia el 28-10-2026. Este registro no afirma ausencia de experimentos anteriores ni atribuye a esta implementación trabajo previo.

## Contribuciones efectivamente creadas

| Fecha | Entregable | Evidencia local | Estado |
| --- | --- | --- | --- |
| 28-10-2026 | Alcance, diseño modular, plan por fases y protocolo experimental | README, ARCHITECTURE, ROADMAP, EXPERIMENTS | Documentación creada; funcionalidad no implementada |
| 28-10-2026 | Bitácora, inventario preliminar de terceros y registro de contribuciones | HACKATHON_LOG, THIRD_PARTY, este archivo | Base documental creada |
| 28-10-2026 | Estructura mínima, exclusiones locales y política de fin de línea | Directorios con `.gitkeep`, `.gitignore`, `.gitattributes` | Preparación del repositorio; sin dependencias instaladas |

Al completar la base documental no existían commits ni URL pública. La implementación posterior dispone de una URL temporal de demo; el repositorio público sigue pendiente. El historial Git identifica los commits efectivos, sin fabricar hashes o fechas. La asistencia de IA se utiliza para documentación, implementación y pruebas; la revisión del responsable del proyecto sigue pendiente.

## Implementación de fases 1 y 2 · 28-10-2026

Se implementaron las interfaces móvil/escritorio, captura AudioWorklet, los dos controles táctiles, emparejamiento QR/código y confirmación, relay WebSocket Node, protocolo PCM con secuencias, ACK y verificación SHA-256, reproducción/WAV, límites y tratamiento de interrupciones. Se añadieron pruebas automatizadas, tono de diagnóstico y scripts de inicio/parada del túnel HTTPS temporal.

La prueba sintética pública y ambos controles en navegador se ejecutaron con éxito. No se ha validado aún el teléfono físico ni 4G/5G. Esta contribución es infraestructura de captura/transporte; no constituye todavía la contribución principal de IA ni una transcripción médica funcional. Versiones exactas en `package.json` y `pnpm-lock.yaml`; ejecución en `RUNNING.md`.

## Contribuciones futuras, todavía no construidas

- Infraestructura futura: segmentación ASR, consolidación de texto, editor y portapapeles.
- Integración: adaptadores ASR y Meta, contratos y tratamiento de errores.
- Contribución principal de IA: generación/comparación de hipótesis de términos médicos, abstención, validación de propuestas y evaluación con supervisión humana.
- Evaluación: corpus sintético propio, baseline, comparaciones controladas, métricas y análisis de fallos.

No se reivindican como propios los pesos, entrenamiento ni capacidades generales de modelos externos. La novedad y la eficacia del enfoque se mantienen como preguntas de investigación.

## Dependencias externas

Modelos candidatos y bibliotecas efectivamente usadas se separan en `THIRD_PARTY.md`. Se instalaron `ws` y `qrcode-generator` con versiones fijadas, y un binario oficial de cloudflared para la demo temporal. No se descargaron ni ejecutaron modelos. Registrar también glosarios, audios y corpus externos si se incorporan.

## Evidencia para entrega

Pendiente: commits progresivos, repositorio público comprobado, versiones fijadas, resultados asociados al commit evaluado, tag de demo y relación entre funcionalidades mostradas y pruebas. Conservar comprobante de envío. La demo solo presentará funcionalidades efectivamente construidas en esta implementación y señalará cualquier limitación.

## Revisión de interfaz y telemetría · 2026-10-28
Contribución implementada: interfaz compacta, área principal reservada para transcripción sin simular resultados, diagnóstico desplegable, calibración temporal y mediciones por toma exportables. No se agregaron dependencias externas. Los puntos de medición ASR/Meta son futuros, no funcionales. Metodología en METRICS.md.
# Laboratorio incorporado el 28-10-2026

Extensión posterior del mismo día: puente local seguro al relay, procesamiento automático de tomas verificadas con Whisper, tarjetas de texto asociadas a toma y medición calibrada de parada→texto. Sin modificaciones al modelo externo; sin evidencia nueva de precisión clínica. Incluye prueba de integración sintética por túnel público.

Nueva contribución: interfaz local de experimentos, validación de audio, adaptación a entrada común, cola, referencias/configuraciones inmutables por versión, comparación WER, conservación de fallos, métricas y exportación. Código en apps/lab, backend/lab* y scripts de laboratorio. Whisper, Muse, OpenVINO, NumPy y SciPy son dependencias externas, no modelos entrenados por Dicta Libre. Se probó Whisper en GPU; integración Muse pendiente de credencial. El laboratorio no acredita por sí solo novedad científica ni contribución Meta validada en la demo.

