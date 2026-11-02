# Publicación y trazabilidad

Revisión del 1 de noviembre de 2026 (America/Santiago).

## Alcance público

Se publica el código del prototipo, documentación, pruebas automatizadas y resultados históricos seleccionados de pruebas sintéticas. No se distribuyen credenciales, audios, corpus aportados, plantillas privadas, modelos descargados ni datos del laboratorio. Una instalación nueva no incluye la biblioteca privada de 285 plantillas.

El laboratorio permanece en localhost; publicar código en GitHub no publica el servidor ni sus datos. `.env.local` almacena la clave solo en el equipo y está excluido de Git. Las exportaciones del laboratorio pueden contener transcripciones: no deben añadirse automáticamente al repositorio.

## Comprobaciones de publicación

Se revisaron los archivos candidatos y el historial alcanzable de Git: rutas de archivos privados, patrones de credenciales, coincidencia exacta con la clave local sin imprimirla y coincidencias de contenido completo con las 285 plantillas locales. La primera pasada examinó 246 blobs históricos sin hallazgos. Los registros detallados permanecen en `data/local/publication/`, fuera de Git. Estas comprobaciones no garantizan ausencia de cualquier secreto o fragmento; se complementan con revisión de los resultados públicos.

Se conservan los 19 commits anteriores y sus fechas originales. Los cambios acumulados posteriores se registran en un commit nuevo con la fecha efectiva de publicación; las entradas de bitácora no se convierten artificialmente en commits retroactivos. Las mediciones anteriores no se atribuyen al nuevo commit.

Revisión adicional de 16 JSON públicos: controles sintéticos y métricas; sin valores de credenciales detectados. Validación del árbol candidato: 70 pruebas Node y 5 pruebas Python del importador aprobadas; comprobación de sintaxis JavaScript aprobada. No son pruebas de precisión clínica ni validación visual de la última interfaz.

## Bases del evento y licencia

La [página oficial de Meta](https://dev.meta.ai/events/global-hackathon), consultada el 1 de noviembre, indica inicio el 26 de octubre y cierre el 4 de noviembre a las 21:00 ET; las fechas pueden cambiar. No especifica una licencia obligatoria para el código en el contenido accesible. El [enlace a reglas/waiver](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver) no pudo consultarse mediante la herramienta disponible.

Se sigue la instrucción del responsable de publicar el repositorio. No se afirma que todas las bases hayan sido verificadas. Queda pendiente contrastar las reglas aceptadas por el participante: elegibilidad, categoría, licencia exigida, condiciones de modelos y formato de entrega.

**Licencia del código propio pendiente:** no se añade MIT ni otra licencia de reutilización hasta resolver esa elección. Repositorio público no equivale a otorgar una licencia abierta. Las dependencias conservan sus licencias independientes, descritas en THIRD_PARTY.md.
