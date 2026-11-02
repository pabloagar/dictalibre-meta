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

## A compacta · implementación del 02-11-2026

Sustituye la composición v4 por la dirección [A compacta aprobada en Stitch](https://stitch.withgoogle.com/preview/11339747648494305787?node-id=ba13eb772ad045a6b0410d08948f7034). La maqueta sigue siendo una referencia; esta sección describe código real. Barra principal: Plantilla, sexo, conexión destacada, estado/reloj/nivel, Revisar con IA y Copiar. Franja de edición: Deshacer, Rehacer, tamaño 14–28 px (pasos de 1) y Ajustes. Hoja de ancho disponible con 28 px de margen interior; columna de 260 px solo cuando hay avisos o revisión abierta. En ancho pequeño las notas pasan debajo. No hay sidebar izquierdo.

Día hueso por defecto en instalaciones sin preferencia: mesa #eeece6, hoja #f7f5ef, barra #efede7, tinta #302d28, secundarios #696359, línea #d4cec3 y acento #855c22. Se conserva Sala oscura en Ajustes y se respeta la preferencia guardada. Tipografías locales previas. Conexión abre el emparejamiento real; las nueve barras reflejan el nivel calculado sobre PCM recibido y se apagan en silencio/parada. No son una animación de grabación simulada.

Rehacer guarda texto y contexto de plantilla, invalida su futuro tras una edición nueva y se bloquea durante tomas pendientes. Escritura manual agrupada en pausas de 750 ms. El informe sigue arrancando vacío; reemplazar mediante plantilla requiere confirmación y copiar conserva únicamente texto del modelo.

Revisión global: botón «Revisar con IA», panel derecho «Revisión con IA · Meta» y acción explícita «Enviar a Meta y revisar». Solo las citas exactas, únicas y no solapadas reciben subrayado/enlace; las demás permanecen como notas. Las ediciones invalidan enlaces y acciones sobre el resultado anterior. «Es correcto» reconoce un aviso sin cambiar la prosa. La demo pública **no incluye todavía el backend de revisión**: muestra su indisponibilidad, permite seguir dictando/copiar y nunca inventa resultados. El laboratorio conserva el revisor real.

Validación: check y 129/129 tests; navegador real sobre demo local aislada con datos sintéticos, escritura/deshacer/rehacer/tamaño y panel. Viewports CSS observados: 1280×900 y 390×844, sin overflow horizontal. Sin voz real, S25 físico ni inferencia Meta en esta entrega. Los archivos del laboratorio y las 285 plantillas privadas no se publican. La activación exacta se registra en HACKATHON_LOG.md.

### Ajustes de uso · a-compacta-v2

Plantillas abre un panel compacto de 360 px a la derecha, con botón estable en cabecera y Cerrar visible. Se cierra al aplicar, pulsar fuera o Escape. Biblioteca/procedencia/guardado permanecen plegados. Al insertar se mide el informe real después de cargar fuentes y se elige la mayor letra entre 14 y 19 px que cabe; si no cabe a 14, conserva desplazamiento y lo indica. Los controles manuales siguen disponibles; no hay reajustes mientras se escribe. Conexión y QR se anclan debajo de su botón, limitados al viewport, con cierre exterior y explícito. Pruebas y dimensiones en METRICS.md; activación en HACKATHON_LOG.md.
