# dicta · identidad actual

Adoptada por el responsable el 02-11-2026. Nombre del producto: **dicta**; marca visual: **dicta.**, serif con punto final. Antes: Dicta Libre. La adopción no renombra el repositorio, las rutas técnicas ni las claves de almacenamiento existentes.

## Fuente y archivos

Kit v1 proporcionado por el responsable, conservado íntegro en [dicta-v1](dicta-v1/LEEME.md), 90 archivos (2.275.773 bytes sin comprimir). SHA-256 del ZIP original: `3d1747694a79b8f6efda9348f91baacc878d55f77ffa1c4dac50862eaa9b31cc`. Los archivos importados se compararon byte por byte con el ZIP. Guía incluida en `dicta-v1/05-guia/dicta-guia-de-marca.pdf`.

## Integración en el escritorio

- Logotipo principal trazado, sin recrearlo mediante texto ni otra fuente. Ancho 80 px, alto proporcional aproximado 28,57 px; supera el mínimo de 72 px y no requiere la versión para alturas menores de 24 px. El margen de la cabecera y la separación al siguiente control dejan el espacio de protección.
- Día: versión original tinta #2b2823 + rojo #b3261e. Penumbra/Ámbar: versión original hueso #ebe7dd + coral #e08a7e.
- Título y nombre de aplicación: dicta. Favicon SVG original del kit, con adaptación al esquema del navegador incluida por su autor.
- Los tres SVG se embeben como data URI en el HTML, iguales byte por byte a los originales. Así se usan las rutas ya servidas, sin modificar backend ni añadir solicitudes de fuentes o archivos. live.js conserva el nodo gráfico al montar la cabecera.
- El punto del logotipo es parte de la identidad. Los estados reales de grabación siguen en sus controles existentes; no se añadió una señal de captura simulada ni un easter egg.

Archivos de interfaz: apps/desktop/index.html, apps/desktop/live.js y apps/shared/style.css. README adopta el nombre actual. Los documentos históricos mantienen su denominación de entonces.

## Archivos disponibles para la hackathon

`04-redes/dicta-github-1280x640.png` para la imagen social del repositorio; `dicta-avatar-400.png` para avatar; imágenes OG y banners. Están guardados, pero no se cambiaron perfiles ni ajustes externos de GitHub o redes. El snippet original incluye una URL de ejemplo: no se activó esa URL, el manifiesto PWA ni los iconos que necesitarían nuevas rutas del servidor.

La guía atribuye el trazado a Source Serif 4 Semibold bajo OFL. La licencia de esa familia ya se conserva en apps/shared/fonts/sourceserif4-OFL.txt. No se descargaron fuentes nuevas.

## Comprobaciones

Sintaxis JavaScript y 137/137 pruebas aprobadas (Windows, Node v24.22.1). Vista aislada de escritorio en Chrome, fuente de datos sintética; se comprobaron el logo cargado, la versión clara/oscura según los tres temas, título, enlace de favicon y continuidad del informe vacío. Navegador/dispositivo en versión exacta null, audio null, red loopback. Una comprobación por tema. Medidas del logo obtenidas del DOM; precisión reportada a dos decimales. Sin comparación de rendimiento, comodidad ni recuerdo de marca.

Captura local: dicta-marca-integrada.png, carpeta de visualizaciones de esta sesión; no está en Git. Código y kit se publican en codex/ui-propuesta-b. Sin merge ni despliegue en Render. Móvil y laboratorio mantienen sus etiquetas anteriores hasta una integración de marca fuera del alcance de esta rama de escritorio.
