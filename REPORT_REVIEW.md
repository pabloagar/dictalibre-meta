# Contexto por toma y revisión global · piloto

Implementación del 1 de noviembre de 2026. Meta muse-spark-1.3 sigue siendo el modelo; no se afirma haber incorporado un modelo superior ni validado clínicamente resultados.

## Contexto de cada toma

Al comenzar se fija el nombre/categoría de la plantilla realmente aplicada, hasta 3000 caracteres de su texto base y hasta 10000 del informe consolidado previo. La plantilla escogida en el selector sin pulsar Crear informe no cambia ese contexto. Se distinguen plantilla base y documento editable; no se atribuye origen preciso a cada frase. No se envían rutas de archivos ni referencias correctas de evaluación. Los campos son datos no confiables, nunca instrucciones. Contexto truncado se identifica explícitamente.

El snapshot viaja con la toma en Muse-streaming, Muse-Normal y Whisper local; solo el Revisor habilitado lo envía a Meta. Se conserva en el catálogo local para reproducir la revisión. La revisión manual posterior de esa toma conserva el snapshot original; la revisión global usa el informe actual. Prompt radiology-review-v2-context pide abstención si una palabra puede ocultar una negación fusionada; no es garantía exhaustiva.

## Revisión global

Botón Revisar informe junto a Copiar informe. Requiere texto consolidado y admite hasta 20000 caracteres sin truncar el documento; si excede el límite, muestra error. Envía el informe y contexto de plantilla a Meta con prompt report-consistency-v1. No se ejecuta por pausas ni por entrar a Impresión/Conclusión. No se pregunta repetidamente por contexto: usa la plantilla aplicada; en blanco no inventa modalidad.

Avisos en sección visual separada, con citas literales validadas. No se admiten sustituciones; los cambios se hacen manualmente en el editor. Si se modifica el texto o contexto durante/después de la revisión, aparece Desactualizada. Copiar ofrece revisar o Copiar sin revisar cuando no existe resultado vigente; nunca copia automáticamente al terminar una revisión. Con resultado vigente permite copiar, sin afirmar aprobación clínica. Fallo, cancelación o indisponibilidad no bloquean el dictado ni la alternativa de copia.

Los resultados se guardan en reviews con scope=report, sin crear tomas ni resultados ASR ficticios. El JSON del laboratorio los incluye junto a prompts, snapshots, tokens, tiempos y errores; el CSV de revisiones incluye avisos pero no todo su contexto/evidencia. Mantener estos datos fuera de Git. Una solicitud idéntica pendiente/completada se reutiliza; no hay envíos automáticos repetidos. La cola es compartida con revisión de tomas; cancelar no cancela ASR.

## Prueba desde el PC/celular

1. Aplicar una plantilla, dictar y comprobar contexto de la nueva toma en exportación JSON (sin rutas). Cambiar de plantilla solo tras terminar la toma.
2. Informe sintético: «HALLAZGOS: Nódulo único en pulmón derecho de 5 mm. CONCLUSIÓN: Nódulo único en pulmón izquierdo de 5 mm.» Solicitar revisión: esperar aviso sin reemplazo; comparar citas, no aceptar diagnósticos nuevos.
3. Corregir lateralidad manualmente. Resultado anterior debe quedar desactualizado. Pulsar Copiar: debe ofrecer nueva revisión o copia sin revisión.
4. Solicitar revisión y editar antes de que termine. La respuesta tardía no debe presentarse como vigente.
5. Probar revisión cancelada y Copiar sin revisar; esperar confirmación de portapapeles solo tras éxito.
6. Exportar JSON del laboratorio y métricas del editor. Registrar ayudas, falsas alarmas y omisiones. Conservar informes consistentes como controles y casos nuevos no usados para ajustar el prompt.

Pruebas automatizadas: tests/report-review.test.mjs, además de la suite existente. Prueba física de interfaz pendiente. Activación en el servidor principal requiere reinicio coordinado para no interrumpir grabaciones.
