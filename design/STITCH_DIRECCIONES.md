# Direcciones de Stitch · Hoja clínica · 02-11-2026

**Propuestas visuales, no implementadas.** No cambian /live ni el despliegue. Proyecto real creado y revisado en Stitch: https://stitch.withgoogle.com/projects/15414574200694645001

## Demostraciones corregidas

- [Hoja continua](https://stitch.withgoogle.com/preview/15414574200694645001?node-id=bb92a355f3a346d7815d35b0d17fe679): barra superior única y editor sin columna permanente; prioriza ancho de escritura.
- [Mesa compacta](https://stitch.withgoogle.com/preview/15414574200694645001?node-id=253bb2df306346f3918779e32c8e4f3d): una columna izquierda de controles, objetivo 160px, y editor a la derecha; prioriza acceso permanente.

Contexto enviado: funciones y composición existentes de Hoja clínica v4, referencia HTML v3, inicio siempre vacío, Plantilla a demanda, controles reales y eliminación de una columna derecha de notas permanente. No se transmitió código privado, plantillas clínicas ni datos de pacientes. Se proporcionó un brief textual detallado; el intento de adjuntar el HTML no abrió selector de archivos.

Nueva preferencia del responsable: hueso cálido atenuado, evitando blanco puro en sala oscura. Paleta propuesta compartida: mesa #c8c2b7, hoja #d8d1c4, barra #cec7bb, línea #b4ab9d, tinta #34302a, secundaria #655e53, Copiar #49433b. Public Sans UI, Source Serif 4 informe, Atkinson Hyperlegible Mono reloj. La comodidad y el deslumbramiento no están medidos.

El primer conector no conectó. El conector privado listaba proyectos pero generación/galería no devolvían vistas previas. Se resolvió usando la sesión web de Stitch. Después de generar por navegador, get_screen sí recuperó las dos vistas corregidas. Los primeros diseños añadían barras duplicadas y datos ficticios; se pidió retirarlos. Se comprobaron visualmente las versiones enlazadas con informe vacío y paleta hueso. Stitch conserva las primeras versiones en el lienzo: usar los enlaces de arriba, no las revisiones iniciales.

## Comparación pendiente

Hipótesis: Hoja continua ofrece más superficie útil; Mesa compacta reduce aperturas para acceder a controles. Antes de decidir: mismo viewport/zoom/tema/tamaño de texto, mismo informe sintético; medir ancho/alto útil del editor en px, clics para plantilla y conexión, tiempo desde abrir selector hasta aplicarlo en ms, y valoración comunicada por el responsable de brillo/lectura. Criterio funcional: inicio vacío, plantilla solo a demanda, sin controles ocultos por desbordamiento. Umbral de preferencia humana pendiente. Medidas actuales de área, latencia, luminancia física y sobrecosto: null; ejecuciones de comparación: 0. Las capturas son evidencia de diseño, no prueba de mejora ni de comodidad visual.

Los artboards resultantes son 1280×1024 según Stitch (se solicitaron idealmente 1440×900). Falta evaluar adaptación a las pantallas reales y verificar cada interacción antes de integrar. Estas propuestas no heredan automáticamente las garantías del editor funcional.
