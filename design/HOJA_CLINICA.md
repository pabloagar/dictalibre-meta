# Hoja clínica · implementación v4

Referencia: HTML «Hoja clínica v3» y «propuesta-b-v3» entregados por el responsable el 02-11-2026. El enlace de Claude no fue accesible. Las capturas adjuntas son ejemplos a evitar, no la referencia visual.

Corrección explícita del responsable: siempre abrir con informe vacío; el selector aparece solo al pulsar Plantilla. No precargar una estructura ni recuperar automáticamente el informe anterior.

## Configuración versionada

Sala: mesa #131211, hoja #1c1b19, barra #181715, línea #33312d, tinta #c8c4bb, secundaria #99948a, grabación #d9705f. Día: mesa #e6e2da, hoja #f6f4ef, barra #eeebe4, línea #cfc9be, tinta #24221e, secundaria #59544b. Copiar usa gris, no verde. Tipografías locales: Public Sans para controles, Source Serif 4 para informe y Atkinson Hyperlegible Mono para reloj. Licencias en apps/shared/fonts.

Barra: identidad, Plantilla, sexo, conexión/estado, Deshacer, Revisar, Copiar para RIS, Ajustes. Hoja con encabezado discreto, márgenes interiores, texto serif y encabezados pequeños sans. Notas de conexión, glosario y cifras al margen. Revisión global oculta hasta solicitarla o copiar sin revisión vigente. Ajustes contiene motor, glosario, comandos, segmentación, tamaño, tema, tomas y diagnóstico.

Implementación: apps/desktop/live.js, report-editor.js, report-review.js y bloque clinical-workspace de apps/shared/style.css. Conserva el modelo de texto y los anclajes de dictado. Cambiar plantilla pide confirmación si hay texto y permite deshacer. Los estilos de encabezados no cambian el texto copiado. Escape cierra paneles; la búsqueda recibe foco. Bajo 760 px, notas debajo de la hoja.

## Límites pendientes

No se afirma fidelidad visual verificada: el control de navegador rechazó localhost y el control nativo se detuvo al no poder verificar su URL. Falta captura comparativa real en sala/día, 1440×900, 1180×800 y 390×844. Las pruebas DOM no miden layout ni garantizan apariencia. El selector conserva búsqueda/categorías/favoritas con lista nativa; no reproduce el ranking de diez exámenes de la maqueta. El sexo es una referencia visual del estudio: no añade detección de anatomía ni validación clínica. El teléfono conserva su interfaz existente; esta entrega rediseña /live.

No se publican las plantillas privadas ni preferencias clínicas del navegador. GitHub guarda los valores de diseño y código; tema y plantillas propias siguen locales. Metodología y pendientes en METRICS.md.
