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

Versión posterior publicada por autorización del responsable: **dicta / Propuesta B**, commit `8f89952`, Live en Render el 02-11-2026. Código integrado en codex/capture-transport, 137/137 pruebas y comprobación del QR automático y recursos servidos. El registro documental posterior usa `[skip render]` para conservar ese despliegue sin reiniciarlo; no hay cambios adicionales de aplicación en ese registro. La demo mantiene sus funciones y límites de backend anteriores.

## Bases del evento y licencia

Actualización del 04-11-2026: por instrucción del responsable se adopta **Apache License 2.0**, licencia open source aprobada por la OSI, para el código propio. El responsable aportó una comunicación de Cerebral Valley que exige que el repositorio sea open source. La revisión de las bases públicas del 02-11-2026 que no había localizado ese requisito queda superada por esta comunicación; no debe utilizarse para justificar PolyForm en la entrega. Procedencia y límites en [LICENSING.md](LICENSING.md). El resto de las instrucciones autenticadas de entrega sigue pendiente de comprobación.

Las secciones Hackathon Submission y Release of Information conceden derechos amplios a los organizadores y entidades indicadas, sin regalías y con carácter irrevocable. La licencia pública no elimina permisos concedidos válidamente por ese contrato. Elegibilidad, categoría, condiciones de modelos y formato final de entrega siguen pendientes de verificación específica.

**Licencia vigente del código propio: Apache License 2.0**, desde el 04-11-2026. LICENSE contiene el texto oficial y package.json declara `Apache-2.0`; atribuciones en NOTICE. Permite uso comercial conforme a sus condiciones. Bilateral conserva MIT; dependencias y materiales externos mantienen sus condiciones independientes descritas en THIRD_PARTY.md. No se publican audios, corpus, pesos, plantillas privadas ni secretos. La antigua adopción de PolyForm se conserva como hecho histórico en Git y la bitácora. La confirmación de publicación remota y la licencia detectada en GitHub se registran en HACKATHON_LOG.md. Este cambio documental no modifica la aplicación ni requiere reiniciar la demo; se publica con `[skip render]`.

02-11-2026 · Cambio preparado para publicación: la demo incorpora el revisor global Muse Spark con envío explícito, aislamiento de visitantes y retención temporal en memoria. La afirmación histórica «solo en laboratorio» describe la versión anterior. Activación en Render pendiente de coordinación para no interrumpir las pruebas del responsable; consultar HACKATHON_LOG.md para el estado verificado.

Activado y verificado tras coordinación: Render ecf0da79ba76dac272eadf721bf01adeed316999, 02-11-2026, con revisor global Muse Spark disponible. Una revisión sintética real completada desde la web pública, texto original intacto; sin validación clínica. Código 95f4c5d y registro ecf0da7 en GitHub; detalles en HACKATHON_LOG.md. Auto-Deploy restaurado a On Commit; registros usan skip render.


2026-11-03 · Por solicitud del responsable, el arranque de la demo pública abre /live con sesión individual automática, sin código inicial. DEMO_REQUIRE_ACCESS_CODE=true restaura el acceso por código. Se mantienen aislamiento, límites y exclusión del laboratorio. Estado de activación y pruebas en HACKATHON_LOG.md.
