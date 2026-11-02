# Vocabulario radiológico y glosarios de Muse · TC de tórax

Estado: **revisión profesional pendiente**. Nada de esto es validación clínica ni demuestra mejora del reconocimiento hasta medirlo.

## Dos capas

- **Vocabulario candidato** (`candidatos-tc-torax.v1.json`): lista amplia y versionada (334 términos: 318 del archivo del responsable y 16 de una lista base del equipo). **Nunca se envía completa a Muse.**
- **Glosario**: subconjunto corto elegido por medición, por tipo de examen. El máximo de 100 términos es un tope, no una meta. Los glosarios aprobados se publican en `glosarios/` y aparecen en `/live` como configuraciones de Muse **de solo lectura**, con su versión y su hash. La elección es manual: no cambia la configuración por defecto. Whisper queda fuera.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `candidatos-tc-torax.v1.json` | Vocabulario candidato. Lo genera `scripts/vocab-candidatos.mjs` a partir de `Vocabulario_por_TAC_y_patologia.txt` (responsable, 2-nov-2026). Es determinista y guarda el SHA-256 de la fuente. |
| `candidatos-tc-torax.v1.csv` | Planilla para el responsable (separador `;`, UTF-8). Columnas a completar: `seleccionado (si/no)` y `impacto_clinico (1-3)`. Columna `propuesta_medicion`: propuesta editorial de 60 términos, a confirmar o cambiar. |
| `frases-tc-torax.v1.json` | Frases sintéticas con referencia. Fase A: 50 frases; cada candidato propuesto aparece en al menos 3 frases. Fase B: 29 frases objetivo distintas de las de la fase A y 13 controles con palabras que suenan parecido. |

## Reglas del vocabulario candidato

- Fuentes:
  - las secciones «TAC de tórax y TAC de alta resolución» y «AngioTAC de tórax: tromboembolismo pulmonar»;
  - los grupos transversales de densidad, realce y forma;
  - Lung-RADS y Fleischner.
- Se agrupan las variantes de género y número y se conserva la primera forma de la fuente. Las omitidas quedan en `variantes_omitidas`.
- Se excluyen la lateralidad, las negaciones y las unidades, y también las expresiones que contienen una palabra que ya es candidata por sí sola.
- Se excluyen las fases de contraste de abdomen (nefrográfica, corticomedular, excretora). «no» dentro de un nombre de entidad (neumonía intersticial no específica) no se trata como negación.
- Se agrega una lista base de 16 términos frecuentes de tórax escrita por el equipo (neumotórax, derrame pleural, nódulo, adenopatía, tromboembolismo pulmonar, aorta, tráquea, pericardio, etc.), con origen «lista base del equipo». Coinciden con palabras genéricas de la lista PUC; el responsable aprobó incluirlas el 2-nov-2026. No participan en la regla de compuestos. Si se seleccionan para medir, hay que agregarlas a las frases y revisar los controles (algunos contienen esas palabras).
- Se omiten los términos de la lista PUC original, porque sus permisos de redistribución están pendientes. Solo se registra cuántos son (1).
- La prioridad A/B es un **juicio editorial por grupo, no una frecuencia medida**.
- `apariciones_plantillas`, `tasa_error_sin_glosario` e `impacto_clinico` quedan en `null` hasta que se midan o se asignen. **Los conteos en plantillas no se suben al repositorio**: se calculan en el PC del responsable.

## Selección del glosario

- **Fórmula:** prioridad = frecuencia (1–3) × tasa de error sin glosario (medida) × impacto clínico (1–3, lo asigna el responsable).
- **Frecuencia:**
  - 3 si el término aparece 5 o más veces en las plantillas;
  - 2 si aparece de 1 a 4 veces, o si no aparece y es prioridad A;
  - 1 si es prioridad B y no aparece.

  La fuente queda visible en cada caso («plantillas» o «editorial A/B»).
- **Qué queda fuera:** un término sin medir, uno que Muse ya reconoce (0 errores) o uno sin impacto asignado.
- **Variantes de tamaño:** se prueban 10, 25, 50 y 100 términos. Una variante sin suficientes términos elegibles se omite y queda registrada; no se rellena.

## Pasos (TC de tórax)

1. **Frecuencias, en el PC del responsable.** `node scripts/vocab-frecuencias.mjs` muestra en consola qué plantillas consideró, para revisarlas, y guarda solo los totales en `data/local/vocabulario/`. Excluye la carpeta 28.10.26 por ruta e informa los textos únicos exactos y normalizados.
2. **Selección e impacto.** Completar `candidatos-tc-torax.v1.csv` (entre 60 y 80 seleccionados, con impacto de 1 a 3) y verificar la cobertura de las frases con `node scripts/vocab-frases.mjs --verificar --planilla <csv>`.
3. **Grabaciones.** Leer las frases con al menos dos voces humanas y guardarlas como `<fase>_<frase>_<voz>.wav` (por ejemplo `A_A01_v1.wav`). Cargarlas en el laboratorio.
4. **Fase A.** `node scripts/vocab-preparar-corrida.mjs --fase A --planilla <csv>` muestra el plan; con `--ejecutar` la lanza. Después, exportar el JSON del laboratorio y ejecutar `node scripts/vocab-planilla-errores.mjs --corrida <corrida-A.json> --export <export.json>`.
5. **Ranking.** `node scripts/vocab-ranking.mjs --mediciones <mediciones-fase-a.json> --planilla <csv> [--frecuencias <json>]`.
6. **Fase B.** `node scripts/vocab-preparar-corrida.mjs --fase B --actual <id config de 20 términos> --ranking <ranking.json> --ejecutar`, y luego la planilla de errores con la nueva corrida. El resumen aplica la regla de decisión registrada en `EXPERIMENTS.md`.

Las salidas quedan en `data/local/vocabulario/`, fuera de Git. Al repositorio solo llegan el glosario aprobado y los totales agregados que el responsable autorice.

## Glosarios de demostración (10 exámenes de TC) · sin medir

En `glosarios-demo/` hay un JSON por examen con 20 términos, más `revision.csv` para la revisión del responsable (columnas `mantener (si/no)` y `reemplazo`). Los genera `scripts/vocab-glosarios-demo.mjs` a partir de la misma fuente, de forma determinista.

- **Exámenes:** cerebro, angioTC de cerebro y cuello, cavidades paranasales, órbitas y oídos, cuello, columna, tórax, angioTC de tórax por tromboembolismo, abdomen y pelvis, PieloTC/UroTC y angioTC de aorta. Salen de las secciones del archivo; no están ordenados por volumen real de exámenes.
- **Regla:**
  - términos de la sección del examen, sin lateralidad, negaciones, unidades ni lista PUC;
  - dentro de cada grupo, primero la prioridad A, luego los técnicos (palabra de 10 o más letras, sigla o epónimo), con el conteo en plantillas como apoyo;
  - los grupos se intercalan;
  - se omite una sigla junto a su forma completa y una expresión contenida en otra; queda la primera en el orden y la otra se registra.
- **Estado:** **glosario de demostración, sin medir**. No se afirma que mejoren el reconocimiento. Pueden quedar sinónimos que la regla no detecta.
- **Orden de la demo** (`orden_demo` y `evidencia_orden` en cada JSON): abdomen y pelvis, cerebro, tórax, angioTC por tromboembolismo, columna, cuello, cavidades paranasales, órbitas y oídos, PieloTC/UroTC, angioTC de cerebro y cuello, y angioTC de aorta. Los puestos 1–3 tienen respaldo directo en publicaciones; del 4 en adelante los datos son parciales o indirectos. Reemplazar por el volumen real del servicio cuando exista.
- **En `/live`:** aparecen en el selector «Configuración de Muse» como `Demo · <examen> · 20 términos (sin medir)`, de solo lectura y sin escribirse en el catálogo.
  - Al aplicar una plantilla cuyo nombre corresponde a uno de estos exámenes (`examForTemplate`, en `apps/shared/report-model.js`), se **propone** su glosario con una nota visible; el médico puede cambiarlo.
  - Si después se aplica una plantilla sin examen reconocido, se vuelve a la selección anterior, salvo que el médico haya elegido otra a mano.
  - La configuración por defecto sigue siendo «Sin glosario».
  - El examen reconocido queda en el evento `template-loaded` del editor, y el glosario usado en cada toma queda en su configuración (`demo:<examen>:<hash>`).
