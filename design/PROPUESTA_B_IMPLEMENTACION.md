# Propuesta B rev. 3 — implementación y comprobaciones

02-11-2026. Implementación inicial en **codex/ui-propuesta-b**, creada desde codex/capture-transport, con inventario y funciones aprobadas. Se mantuvo inicialmente separada por instrucción del responsable. Posteriormente autorizó publicar la versión guardada: integrada sin conflictos y activa en Render con `8f89952c827e44623ff1ae46bb0da3e9dbae563f`. Trazabilidad en HACKATHON_LOG.md.

## Alcance implementado

| Fase | Cambios y archivos | Commit | Comprobación automatizada al cerrar |
|---|---|---|---|
| 1 | Tokens exactos, Día/Penumbra/Ámbar, migración Sala y tarjetas. live.js, style.css | 44f1ef3 | Sintaxis y 131/131 |
| 2 | Barras y etiqueta Plantilla persistente. report-editor.js, style.css | f692ad3 | Sintaxis y 131/131 |
| 3 | Sexo único en cabecera fija y documento. live.js, style.css | ba6a372 | Sintaxis y 131/131 |
| 4 | Paleta, favoritas por fila, guardar informe, Ajustes y Cómo usar. live.js, report-editor.js, style.css | e0bc0db | Sintaxis y 132/132 |
| 5 | Nuevo informe con confirmación, Deshacer de texto/sexo/contexto/revisión; margen de avisos. report-editor.js, report-review.js, live.js, style.css | 427960c | Sintaxis y 133/133 |
| 6 | Ancho reducido, agrupación de acciones, cierres robustos, contraste y fixture aislado. UI y tests | 3bb8e6b | Sintaxis y 137/137 tras correcciones |
| Instrumentación | layoutVersion del editor identifica propuesta-b-rev3 | ed5ec14 | Sintaxis y 137/137 |

No se modifican backend/, apps/mobile/, motores, transporte ni el modelo compartido del informe. El CSS nuevo está limitado al escritorio clinical-workspace. El estado visual de sexo se conserva en el historial del editor; no añade validación anatómica ni cambia el contexto enviado al motor.

## Funciones y límites

- Informe inicialmente vacío, sin insertar el placeholder. Plantilla explícita y confirmación antes de reemplazar.
- Búsqueda y favoritas existentes conservadas; lista agrupada y vista previa. Guardar el informe actual prellena el formulario, exige nombre y guarda localmente en el navegador, como las plantillas propias existentes.
- Nuevo informe conserva conexión, tema, tamaño y configuración. No reinicia la sesión del teléfono. Deshabilitado durante toma pendiente y cuando no hay texto ni sexo. Deshacer recupera texto, sexo, ficha de plantilla y revisión ya completada; una revisión en curso cancelada no se reenvía automáticamente.
- Revisión usa las API existentes y conserva la aprobación humana. En la demo pública continúa mostrando su indisponibilidad: no se habilita un revisor inexistente en ese entorno.
- Segmentación automática conserva su significado real: puede consolidar segmentos, no apaga el micrófono por una pausa. Motor y glosario se construyen con opciones reales de cada entorno.
- Ajustes: Dictado, Apariencia y Cómo usar; herramientas técnicas existentes quedan en un apartado secundario. Cierre con botón, fuera y Escape; foco contenido en el diálogo y recuperación al cerrar.
- Una capa flotante a la vez para teléfono, Plantilla, Ajustes y confirmación de nuevo informe. La revisión es un margen del documento, no una capa flotante.
- Copia real al portapapeles sin marcas de revisión; su lógica y mensajes de error permanecen.

## Fuentes

Sin peticiones a Google Fonts. Public Sans 400/600/700, Source Serif 4 400 y Atkinson Hyperlegible Mono 400, ya disponibles localmente con OFL. Para los pesos de la maqueta se usan los disponibles más próximos (500 → 400; 650 → 600; mono 500 → 400). La cursiva de la serif se sintetiza en el navegador; no se añadió un archivo cursivo ni Source Serif 600.

## Verificación visual y método

Criterios adoptados antes de editar: los indicados en el encargo y su README (tres temas exactos, informe vacío, cabecera con sexo, paleta a dos columnas, una columna a ≤900 px, capas coordinadas y contraste ≥4,5:1). La revisión visual se hizo sobre la integración de las fases, no una captura independiente en cada commit intermedio.

Entorno: Windows, Chrome mediante extensión; versión de navegador y dispositivo físico null. Node v24.22.1. Red de comprobación: loopback; fuente de audio null; sin captura ni inferencias. Una pasada completa de nueve combinaciones: 1440×900, 1280×800 y 760×900 CSS × Día/Penumbra/Ámbar. Dimensiones verificadas leyendo innerWidth/innerHeight. El zoom existente exigió compensar el tamaño solicitado a la herramienta; las cifras reportadas son CSS medidas, no dimensiones supuestas. No se observó desbordamiento horizontal en esas nueve combinaciones.

Colores de hoja/texto principal/secundario comprobados en estilos calculados del navegador; coincidieron con tokens.css. Pruebas automatizadas comprueban las 13 variables de color por tema, texto principal y secundario sobre hoja/mesa/barra/selección y colores de acción/revisión. El contraste es cálculo WCAG, no medida de comodidad visual. Precisión reportada a dos decimales; sobrecosto de inspección no medido (null).

Comprobaciones interactivas en fixture sintético: abrir paleta, seleccionar y aplicar una plantilla; revisión con una respuesta de prueba; navegar al fragmento; Nuevo informe y recuperación de texto/avisos con Deshacer; selección de temas y diálogo a 760 px. Tests DOM cubren también migración persistida sala → ambar, Día por defecto, copia limpia, favoritas de fila, guardar informe y bloqueo de Nuevo informe durante una toma pendiente.

## Evidencia y resultados desfavorables

Capturas locales (fuera de Git): carpeta de visualizaciones de esta sesión, subdirectorio propuesta-b; nueve capturas de inicio y dia-760-ajustes.png. Algunas capturas se obtuvieron antes del ajuste final de agrupación de botones en ancho reducido; no se presentan como capturas exactas de ed5ec14. Los registros de prueba quedan en .runtime/propuesta-b-*.txt, excluidos de Git.

- La apertura file:// de la maqueta fue bloqueada por la política del navegador. Se revisaron README, HTML/CSS y capturas suministradas.
- El acceso automatizado al laboratorio 8789 devolvió «Acceso solo desde el laboratorio local». Se usó una alternativa de prueba sin acceso a datos protegidos: scripts/preview-desktop-b.mjs, catálogo sintético y sin credenciales, audio ni llamadas externas.
- La primera revisión de paleta descubrió que seleccionar una fila redibujada podía cerrar el panel. Corregido mediante detección de clic exterior en captura y prueba de regresión.
- La prueba nueva de favorita detectó que el botón auxiliar seguía deshabilitado al pasar desde Informe en blanco. Corregido al sincronizar la selección antes de alternar favorita.
- Hubo capturas y llamadas del control del navegador que agotaron el tiempo de espera. No se atribuye ese fallo al dictado ni se afirma una inspección visual exhaustiva de cada estado en los nueve tamaños/temas. Una repetición de mediciones finales se interrumpió; se conserva la pasada completa anterior.

## Cómo reproducir

1. `node scripts/check.mjs` y `pnpm test` (última suite: 137/137).
2. `node scripts/preview-desktop-b.mjs` abre un servidor exclusivamente local en http://127.0.0.1:8796/live. Sirve los archivos de UI reales con un catálogo y revisión sintéticos. El pie lo identifica; no existe transporte de audio en ese fixture.
3. Probar inicio, temas, Plantilla, edición, Nuevo informe/Deshacer, revisión y copia. No confundir el fixture con el laboratorio ni con Render.

## Ajuste posterior: cabecera y Dictado

Estado, reloj y audio centrados en la cabecera; en ancho reducido ocupan una fila propia. Ajustes → Dictado agrupa motor y sus opciones, comandos/revisión al terminar la toma y herramientas del laboratorio plegadas. Ayudas junto a cada control, interruptores alineados y Ayuda del editor en Cómo usar. Se conserva la paleta de la propuesta. Metodología y límites de comprobación en METRICS.md, apartado «Estado centrado y Dictado agrupado».

## Pendiente de aceptación

Dictado físico desde S25, recorrido completo con audio real y comodidad en una sala de informes. No hay validación clínica ni con usuarios. Render y la integración en codex/capture-transport están comprobados; también acceso, QR automático y controles de escritorio en la web real, sin audio. El laboratorio local lee la carpeta de trabajo; no se reinició ni se verificaron de nuevo sus metadatos de arranque.
