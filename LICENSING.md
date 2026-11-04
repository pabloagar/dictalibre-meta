# Licencia open source y alcance

Desde el **4 de noviembre de 2026**, por decisión del responsable, el código original de Dicta Libre sobre el que puede conceder permisos se publica bajo **Apache License 2.0** (`Apache-2.0`). El texto oficial completo está en [LICENSE](LICENSE) y el aviso de atribución en [NOTICE](NOTICE). Apache 2.0 es una [licencia open source aprobada por la OSI](https://opensource.org/license/apache-2-0).

## Uso, modificación y comercialización

Apache 2.0 permite usar, modificar y redistribuir el código, incluso comercialmente. El responsable puede vender Dicta Libre como servicio y terceros también pueden usar comercialmente el código publicado, cumpliendo la licencia. No se exige autorización comercial adicional para los derechos concedidos por Apache 2.0.

Al redistribuir, se debe incluir la licencia, conservar los avisos aplicables, señalar los archivos modificados y reproducir los avisos de NOTICE cuando corresponda según la sección 4. La licencia incluye una concesión de patentes limitada a las reivindicaciones cubiertas por su sección 3 y sus condiciones; no concede derechos sobre marcas ni garantiza exclusividad, ingresos o validación clínica. LICENSE prevalece sobre este resumen.

## Alcance y licencias independientes

- La licencia raíz cubre el código y la documentación originales del proyecto cuyos derechos puede licenciar el responsable, salvo indicación expresa de otra licencia.
- El módulo independiente [apps/bilateral](apps/bilateral/README.md) conserva su [licencia MIT](apps/bilateral/LICENSE). Sus audios procedurales conservan el [permiso separado](apps/bilateral/OUTPUT-LICENSE.txt), cuyo alcance no incluye los audios de modelos externos.
- Bibliotecas, modelos, APIs, datasets y otros materiales ajenos mantienen sus condiciones y avisos. Inventario en [THIRD_PARTY.md](THIRD_PARTY.md). Sus licencias no se sustituyen por Apache 2.0.
- No se publican ni se conceden aquí derechos sobre plantillas privadas, datos clínicos, corpus, grabaciones, voces de referencia, audios del laboratorio o pesos excluidos del repositorio. La licencia de un motor no acredita permisos sobre las voces ni sobre sus salidas. Los permisos pendientes del piloto Chatterbox siguen documentados en [docs/CHATTERBOX_COLAB_PILOT.md](docs/CHATTERBOX_COLAB_PILOT.md).
- Las marcas, logotipos e identidad visual no reciben una licencia de marca por este cambio. La titularidad de aportaciones ajenas no se transfiere al responsable por recibirlas.

Las nuevas contribuciones enviadas intencionadamente para incluirse en el código Apache se rigen por la sección 5 de Apache 2.0, salvo declaración expresa o acuerdo independiente. Los avisos y licencias preexistentes de terceros se conservan.

## Concurso y corrección de la revisión anterior

El 04-11-2026 el responsable comunicó una instrucción de Cerebral Valley, organizador del evento: el repositorio debe ser open source y este detalle técnico es obligatorio para todos los proyectos. La comunicación fue aportada por el responsable en el chat; no se dispone aquí de una URL pública de ese aviso específico. Se adopta Apache 2.0 para atender ese requisito de licencia.

La revisión del 02-11-2026 de las [bases públicas](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver) no había localizado esa exigencia. Su conclusión sobre la suficiencia de PolyForm queda **superada por la instrucción posterior**. No debe usarse para justificar la licencia anterior en la entrega. Apache 2.0 es open source; esto no constituye aprobación del organizador ni garantiza por sí solo elegibilidad, inscripción o aceptación final de la entrega.

La licencia pública no revoca los permisos contractuales concedidos válidamente al concurso. Este documento no constituye un envío ni una nueva aceptación contractual. Los demás requisitos del evento y las instrucciones autenticadas de entrega requieren su propia comprobación.

## Procedencia y verificación

- Texto oficial: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt), descargado sin modificaciones el 04-11-2026 (America/Santiago).
- SHA-256 de LICENSE: `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`.
- Identificador SPDX en package.json: `Apache-2.0`.
- El historial conserva la adopción de PolyForm Noncommercial 1.0.0 del 02-11-2026. La licencia vigente para esta publicación es Apache 2.0; este cambio no borra los avisos ni reescribe commits anteriores.
- La comprobación de publicación y detección de licencia en GitHub se registra en [HACKATHON_LOG.md](HACKATHON_LOG.md). GitHub y el despliegue web se verifican por separado.
