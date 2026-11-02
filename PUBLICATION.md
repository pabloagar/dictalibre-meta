# Publicación y trazabilidad

Revisión del 1 de noviembre de 2026 (America/Santiago).

Repositorio publicado: https://github.com/pabloagar/dictalibre-meta. Primera publicación del código: commit `b906676`, 2026-11-01 21:37:58 -03:00, conservando el historial previo.

Una copia limpia de ese commit instaló las dependencias mediante `pnpm install --frozen-lockfile`: 70/70 pruebas Node y comprobación de sintaxis aprobadas. La auditoría posterior al commit examinó 257 blobs históricos y 119 archivos candidatos, sin hallazgos. No se ejecutaron llamadas a Meta ni inferencias GPU para esta comprobación.

## Alcance público

Se publica el código del prototipo, documentación, pruebas automatizadas y resultados históricos seleccionados de pruebas sintéticas. No se distribuyen credenciales, audios, corpus aportados, plantillas privadas, modelos descargados ni datos del laboratorio. Una instalación nueva no incluye la biblioteca privada de 285 plantillas.

El laboratorio permanece en localhost; publicar código en GitHub no publica el servidor ni sus datos. `.env.local` almacena la clave solo en el equipo y está excluido de Git. Las exportaciones del laboratorio pueden contener transcripciones: no deben añadirse automáticamente al repositorio.

## Comprobaciones de publicación

Se revisaron los archivos candidatos y el historial alcanzable de Git: rutas de archivos privados, patrones de credenciales, coincidencia exacta con la clave local sin imprimirla y coincidencias de contenido completo con las 285 plantillas locales. La primera pasada examinó 246 blobs históricos sin hallazgos. Los registros detallados permanecen en `data/local/publication/`, fuera de Git. Estas comprobaciones no garantizan ausencia de cualquier secreto o fragmento; se complementan con revisión de los resultados públicos.

Se conservan los 19 commits anteriores y sus fechas originales. Los cambios acumulados posteriores se registran en un commit nuevo con la fecha efectiva de publicación; las entradas de bitácora no se convierten artificialmente en commits retroactivos. Las mediciones anteriores no se atribuyen al nuevo commit.

Revisión adicional de 16 JSON públicos: controles sintéticos y métricas; sin valores de credenciales detectados. Validación del árbol candidato: 70 pruebas Node y 5 pruebas Python del importador aprobadas; comprobación de sintaxis JavaScript aprobada. No son pruebas de precisión clínica ni validación visual de la última interfaz.

## Dónde queda publicado cada cambio

Un cambio tiene dos destinos independientes. GitHub guarda el código, en la rama principal `codex/capture-transport`. La web real corre en el PC del responsable: laboratorio y dictado en `127.0.0.1:8789`, enlace del teléfono en `127.0.0.1:8788`, accesible desde fuera por un túnel de Cloudflare. **Subir a GitHub no actualiza esa web:** no hay despliegue automático al PC. El procedimiento obligatorio está en AGENTS.md, «Publicar los cambios grandes», y el enlace fijo en RUNNING.md.

La demostración pública (`backend/demo.mjs`) es un tercer destino, separado del laboratorio y sin sus datos. Desde el 02-11-2026 está activa en https://dictalibre-demo.onrender.com/live, protegida con el código de acceso existente. Render despliega automáticamente desde `codex/capture-transport` en cada push. La activación de A compacta se comprobó con el commit `5fa3ab9`; evidencia y límites en HACKATHON_LOG.md. La demo permite dictado con Muse; el revisor global de informes continúa disponible solo en el laboratorio.

## Bases del evento y licencia

Actualización del 2 de noviembre de 2026: leídas las bases completas del [reglamento/waiver oficial](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver) en navegador y contrastadas con [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0). No se encontró obligación de adoptar una licencia abierta específica. No se identifica conflicto en las bases públicas entre PolyForm para el público y los permisos contractuales separados del concurso, sujetos a disponer de los derechos necesarios; no es aprobación del organizador. El formulario de entrega no fue accesible en la sesión sin autenticar: sus instrucciones y posibles actualizaciones siguen pendientes de comprobación.

Las secciones Hackathon Submission y Release of Information conceden derechos amplios a los organizadores y entidades indicadas, sin regalías y con carácter irrevocable. La licencia pública no elimina permisos concedidos válidamente por ese contrato. Elegibilidad, categoría, condiciones de modelos y formato final de entrega siguen pendientes de verificación específica.

**Licencia del código propio: PolyForm Noncommercial 1.0.0**, elegida por el responsable el 02-11-2026 y añadida localmente en LICENSE. Los usos comerciales fuera de sus fines permitidos requieren autorización previa y expresa por escrito del titular. Se mantienen las excepciones de PolyForm, los derechos legales y los permisos contractuales independientes. Alcance, evidencia y límites en [LICENSING.md](LICENSING.md). Las dependencias conservan sus licencias independientes, descritas en THIRD_PARTY.md. Este cambio local no acredita publicación en GitHub.
