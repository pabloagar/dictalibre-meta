# Comandos de dictado · prototipo básico

El 28-10-2026 se incorporó un módulo independiente de formato, común a Muse y Whisper. No es una implementación completa de Dragon ni utiliza su código. Muse permite toma completa o streaming con borrador durante el habla. Los comandos se aplican solo al resultado final; Whisper permanece por toma.

## Comportamiento

| Frase | Resultado |
|---|---|
| punto | `.` y mayúscula en la siguiente oración |
| coma | `,` |
| dos puntos | `:`; también se reconoce «2 puntos» generado por ASR |
| punto y coma | `;` |
| nueva línea | un salto de línea |
| nuevo párrafo | dos saltos y mayúscula siguiente |

Se admiten línea/párrafo sin tilde en la salida del motor. Se evita duplicar signos contiguos que el ASR haya añadido alrededor de un comando. No se convierten números a palabras ni se modifican negaciones, medidas o lateralidad mediante reglas clínicas. La puntuación ya producida por el ASR no permite inferir qué comando se pronunció.

Las heurísticas conservan posibles decimales («3 punto cinco») y ciertos usos literales («punto de sutura», «en coma», «nueva línea de fractura»), con una advertencia y offsets del original. No resuelven todas las ambigüedades del lenguaje: el usuario puede desactivar los comandos o consultar el original. No hay órdenes de borrado, selección, deshacer, plantillas ni control de aplicaciones en esta etapa.

## Prueba desde el teléfono

1. Abrir http://127.0.0.1:8789/live en el PC, crear sesión y escanear el QR desde el S25 Ultra.
2. Elegir motor y mantener «Aplicar comandos de dictado» activo. Dictar tomas cortas. Se procesa al terminar cada toma y se añade texto al informe en orden de recepción; los saltos finales se conservan entre tomas.
3. Revisar original, texto formateado y dudas. El informe es editable, pero sus ediciones manuales no se guardan: solo viven en esa página. Las tomas, salidas y métricas sí se guardan automáticamente en el laboratorio.
4. Usar «Toma guardada · comparar después con ambos motores». Abre el laboratorio en otra pestaña para conservar el informe; selecciona esa grabación y las configuraciones base de ambos motores. No ejecuta ni envía audio automáticamente al abrir el enlace.
5. Escribir la referencia hablada, incluidos los comandos; pulsar «Ejecutar selección». También pueden seleccionarse varias tomas. Revisar separadamente el formato esperado: el WER literal no mide acierto de comandos y puede penalizar puntuación ya interpretada por el ASR.
6. Exportar JSON para el detalle completo o CSV para el resumen. Comparar condiciones de carga equivalentes: una ejecución Whisper con `cold=true` incluye carga y no equivale al uso posterior.

## Trazabilidad y medición

Por ejecución se conserva `text` original sin sustituirlo, `commandsEnabled`, versión del módulo, `formatting.text`, comandos con offsets UTF-16 del original, sustitución aplicada, advertencias y duración `commandMs` (también en `formatting.elapsedMs`). Las ejecuciones históricas no se reformatean automáticamente. JSON contiene toda la auditoría; CSV añade texto formateado, versión, cantidad de comandos, dudas, cold y tiempo de formato.

`commandMs` usa reloj monotónico alrededor de la transformación; está incluido en `totalMs`. No sumarlo de nuevo. Incluye construcción de eventos y avisos, no escritura a disco ni renderizado. No se ha calibrado el sobrecosto del reloj. Las métricas en vivo fin recibido→texto y parada→texto incluyen el formato y actualización del DOM, no una medida física de pantalla. El laboratorio conserva tiempos de preparación, cola, carga/generación local y petición al motor. Una comparación posterior no recibe métricas ficticias de transporte del celular.

Aceptación: originales inmutables, saltos/puntuación esperados en casos de control, protección de casos ambiguos ensayados, modo desactivado sin transformación, persistencia y exportación, y acceso a la misma toma para ambos motores. La precisión del reconocimiento de comandos hablados se valida aparte con grabaciones del responsable. No se declara equivalencia con Dragon.

## Referencias consultadas

- [Nuance, comandos de dictado en español](https://www.nuance.com/products/help/dragon154/dragon-for-pc/esp/dpg-vla/Content/Commands/commands_dictation.htm): líneas, párrafos y órdenes de formato. Documentación pública indexada consultada el 28-10-2026.
- [Nuance, conceptos básicos sobre dictado](https://www.nuance.com/products/help/dragon/dragon-for-pc/esp/professionalindividual/main/content/Dictation/basic_dictation.htm): puntuación y mayúscula tras nuevo párrafo. Consultado mediante índice de búsqueda; apertura directa no disponible en esta sesión.
- [Philips SpeechExec, guía rápida en español](https://www.speechmike.com/fileadmin/Products/pse4400/qsg/pse4400_qsg_es.pdf): tabla de comandos Dragon, incluidos dos puntos y punto y coma. Fuente del integrador; la guía distingue comandos en vivo y grabaciones.

Referencias de comportamiento, sin código ni recursos de Dragon incorporados.

## Cantidades en cifras (28-10-2026)
Nueva etapa independiente es-cardinals-v1: ASR original → números → comandos. Convierte cardinales españoles de 0 a 999 y decimales compatibles: tres → 3, dos coma cinco → 2,5, doce por ocho → 12 por 8. Conserva unidades, artículos un/una, expresiones numéricas no soportadas y ambigüedades; no resuelve errores del reconocimiento. «Dos coma seis cinco» se conserva y señala como dudoso. No convierte escalas ni cambia medidas mediante reglas clínicas.

El laboratorio permite desactivar esta etapa; en dictado en vivo está activada. Se guardan original, texto numérico intermedio, resultado de comandos, versión, eventos, dudas y duración. Los offsets numéricos corresponden al original; los offsets de comandos corresponden a su entrada, identificada por formatting.input. Los históricos no cambian. Las pruebas automatizadas verifican originales, decimales, ambigüedades, comandos, persistencia y exportación.
