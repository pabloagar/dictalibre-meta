# Stitch · Revisión al margen · 02-11-2026

**Dos propuestas visuales; no implementadas en Dicta Libre.** [Proyecto nuevo de Stitch](https://stitch.withgoogle.com/projects/11339747648494305787). El proyecto anterior permanece separado.

- **A · Margen editorial:** explicaciones numeradas al margen derecho, próximas a la altura del fragmento subrayado.
- **B · Revisión enfocada:** explicaciones en un panel derecho que propone cerrarse para recuperar ancho de escritura.

El [prompt exacto enviado](STITCH_REVISION_PROMPT.txt) usa una lista cerrada de funciones existentes y prohíbe añadir navegación, dashboards, estadísticas, pacientes, chat y automatismos clínicos. Las únicas mejoras propuestas son enlazar el subrayado con su explicación y volver desde la nota al fragmento. Cada aviso muestra «Ir al texto» y «Es correcto»; nunca corrección automática. Se pide informe inicial vacío y Plantilla a demanda.

Se aplicaron los principios pertinentes de Sites: tarea principal única, alcance limitado, jerarquía legible y respeto por el diseño existente. No se creó ni publicó un Site.

## Versiones conservadas

Artboards originales (1280×1024 según Stitch): A `5125f470203b4c289741e4658cc112de`; B `c618ec3f34494b43abfaaabdad61ede8`. Paleta inicial: mesa #c8c2b7, hoja #d8d1c4, tinta #34302a, aviso #855c22. El brief solicitó uso en 1280×900; esa adaptación no está comprobada.

Durante la revisión apareció un mensaje enviado directamente en Stitch que calificó los tonos de demasiado apagados. Stitch creó revisiones de color: A `bdae61fe020840a7bf7199bef68cc01a`; B `f1026e98e79f4f58a7336066b6cfadc3`. La hoja pasó a #fdfdfc, según su respuesta, y se ve cercana al blanco: no se considera selección final ni cumple todavía el equilibrio de hueso y contraste solicitado. Se conservan los resultados desfavorables; no se atribuye comodidad visual medida.

## Verificación y límites

Comprobación visual y árbol accesible en Chrome sobre Windows: dos fragmentos subrayados («lado izquierdo» y «21 mm»), numeración 1/2 y dos explicaciones a la derecha en ambas composiciones; una barra principal y sin navegación izquierda. Solo texto sintético. Stitch añadió una frase provisional de ejemplo no incluida literalmente en el brief: «estudio completado sin incidencias inmediatas». No procede de un informe real.

Las primeras URLs construidas con identificadores de pantalla quedaron sin contenido: Stitch utiliza otro identificador para el nodo de prototipo. Se resolvió creando la demostración desde el control Preview del proyecto y abriendo su enlace real: [demostración navegable](https://stitch.withgoogle.com/preview/11339747648494305787?node-id=65746a30b9b64b5897a81a754db812be). Para comparar todas las versiones, usar el selector de pantallas del proyecto.

Verificación manual de una secuencia: A pasa a «Informe vacío», sin encabezados ni avisos, y vuelve a «Con avisos»; en B el cierre del panel deja los subrayados y amplía el área del informe. Se guardaron capturas de A y B en el directorio local de visualizaciones de esta sesión. No se verificaron reconocimiento de avisos, conexión, copia ni todas las interacciones entre fragmentos y notas. No es una medición de rendimiento ni una prueba clínica.

No hay cambios en el código de la aplicación ni despliegue como parte de estas propuestas. Metodología de evaluación pendiente en EXPERIMENTS.md, sección «Revisión al margen».
