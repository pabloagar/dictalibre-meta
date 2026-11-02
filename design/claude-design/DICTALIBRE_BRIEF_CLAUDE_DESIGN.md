# Dicta Libre — Contexto para Claude Design

Fecha: 02-11-2026. Base de código: 9812ce5, interfaz a-compacta-v3. Este paquete es un documento de diseño y una referencia visual explicativa; no es la aplicación ni acredita un despliegue nuevo.

## Encargo
Refinar la interfaz existente de dictado radiológico, aprovechando mejor el espacio sin perder su carácter editorial, sobrio y cálido. Crear una propuesta navegable de escritorio que podamos evaluar antes de integrarla. No rehacer el producto desde cero ni añadir funciones clínicas. El cambio de diseño ocurre en paralelo a la evaluación del modelo y no debe alterar su procesamiento.

## Usuario y contexto
Radiólogo frente a varias pantallas, frecuentemente en una sala con poca luz. El teléfono funciona como micrófono y el computador muestra el informe. La primera visita debe explicar qué hacer sin conocimientos previos. También se puede escribir directamente sin teléfono. Evitar grandes superficies blanco puro, pero conservar legibilidad: el confort visual todavía no está medido.

## Reglas acordadas que deben conservarse
- Cada apertura empieza con el informe vacío, sin encabezados ni texto clínico insertados. El placeholder no es contenido del informe.
- Las plantillas se aplican solo por acción explícita. El botón se llama ahora **Planilla**, por solicitud del responsable; permanece visible y con ese nombre al elegir una plantilla.
- Planilla está en la segunda barra, inmediatamente antes de Ajustes. No trasladarlo al menú Ajustes ni reemplazar su etiqueta por el nombre de la plantilla.
- Si existe texto, confirmar antes de reemplazarlo con una plantilla; Deshacer permite recuperarlo.
- El editor ocupa casi todo el espacio. Sin navegación lateral izquierda ni columna vacía permanente.
- Revisar con IA debe ser fácil de encontrar. Ninguna sugerencia clínica se aplica silenciosamente.
- Copiar para RIS copia solo el informe, sin números de avisos, etiquetas de interfaz ni marcas de borrador. No existe inserción directa al RIS.
- No inventar datos de pacientes, historial, dashboard, chat, DICOM, diagnósticos automáticos ni indicadores de precisión/latencia no medidos.

## Distribución actual
1. Barra principal: Dicta Libre; sexo F/M/sin especificar; conexión visible al teléfono; estado, reloj y barras de audio; Revisar con IA; Copiar para RIS.
2. Barra de edición fina: Deshacer, Rehacer, Texto A− / tamaño en px / A+; a la derecha Planilla y Ajustes.
3. Hoja amplia: cabecera pequeña del documento y sexo; área editable de tipografía serif, márgenes contenidos y alto útil generoso.
4. Revisión al margen derecho solo cuando hay revisión abierta; al cerrar, recuperar espacio para el informe. Avisos vinculados al fragmento correspondiente, explicación y acciones de revisión humana.

## Controles y comportamiento
| Control | Descripción y estados |
|---|---|
| Conecta tu teléfono para empezar | Acción visible y textual; puede reforzarse como «1. Conectar tu teléfono». Abre panel anclado con QR/código e instrucciones. Cerrar con botón, fuera o Escape. Conectado no significa grabando. No ocultar la posibilidad de escribir directamente. |
| Sexo F / M / — | Selector del estudio. No promete validación anatómica automática. |
| Estado / reloj / barras | Distinguir espera, conexión, captura y procesamiento. En la app las barras responden al audio recibido; en un prototipo cualquier animación debe identificarse como simulada. No inventar batería ni latencia. |
| Deshacer / Rehacer | Acciones de edición explícitas; estados deshabilitados cuando no hay operación disponible. |
| A− / px / A+ | Tamaño visible y modificable entre 14 y 28 px. Base 19 px; al insertar plantilla la implementación intenta ajustar hasta 14 px si hace falta. Respetar cambios manuales posteriores. |
| Planilla | Selector compacto con búsqueda, categorías, favoritas y vista previa. Aplicar cierra el panel, no elimina el acceso. No ocupar toda la pantalla ni desplazar el propio botón. |
| Revisar con IA | Revisión opcional con Meta donde esté disponible; presentar espera, avisos, sin observaciones y fallo sin perder el informe. Revisión humana antes de cambios. |
| Copiar para RIS | Disponible con texto consolidado; confirmación visible de éxito y mensaje útil si falla. No simular éxito del portapapeles. |
| Ajustes | Opciones secundarias de tema, motor, glosario, segmentación, comandos y herramientas técnicas según entorno. No poner todo en la barra principal. |

## Lenguaje visual
Paleta Día actual: fondo #eeece6, hoja #f7f5ef, barra #efede7, tinta #302d28, secundario #696359, bordes #d4cec3, acento de revisión #855c22, acción oscura #49433b. Preferencia: hueso cálido de luminosidad contenida, sin blanco puro. Se puede proponer un hueso algo más atenuado, manteniendo contraste y jerarquía; no afirmar beneficios médicos medidos.
Fuentes actuales: Public Sans para controles, Source Serif 4 para el informe, Atkinson Hyperlegible Mono para cifras. Mantener el contraste entre interfaz funcional y documento editorial. Bordes finos, sombras discretas, radios pequeños; sin grandes tarjetas redondeadas, degradados vistosos ni decoración que compita con el texto. Conservar también un modo Sala oscuro cálido, comprobando contraste en ambos.

## Estados que debe demostrar la propuesta
- Inicio completamente vacío y siguiente acción comprensible.
- Panel de conexión abierto y estado conectado claramente diferenciado de grabación.
- Selector Planilla abierto; confirmación al reemplazar texto; botón persistente después de aplicar.
- Escritura y dictado provisional distinguibles del texto consolidado.
- Revisión abierta con dos avisos sintéticos y retorno desde cada aviso al fragmento; cierre recupera ancho.
- Cambio de tamaño, Deshacer/Rehacer y feedback de copia.
- Error de conexión o revisión sin borrar el informe.

## Qué existe y qué no debe darse por hecho
La aplicación implementa editor, plantillas, dictado y controles de edición; la revisión Meta está en el laboratorio. La demo pública de Render tiene un alcance menor: Muse streaming y cinco plantillas sintéticas; no asumir que incluye Whisper local, revisor global ni las 285 plantillas privadas del servidor principal. El último cambio Planilla fue publicado en GitHub y verificado por recursos en localhost; su despliegue remoto seguía pendiente de confirmar al registrar ese cambio. Las maquetas de Stitch son referencias, no prueba de integración.

## Entregable solicitado a Claude Design
Proponer una evolución visual de esta misma pantalla, con interacciones simuladas claramente identificadas y datos exclusivamente sintéticos. Mostrar escritorio 1440×900 y 1280×800, más una adaptación a ancho reducido sin solapamientos. Explicar decisiones de espacio y jerarquía y entregar HTML/CSS o componentes exportables con tokens de color y tipografía. No conectar servicios, no usar audio real y no modificar el backend.

## Cómo evaluar la propuesta
Comprobar que se encuentra la conexión sin ayuda, que Planilla y Ajustes permanecen visibles, que se puede ajustar la letra y localizar Revisar con IA, que los paneles no tapan su acceso y que el editor aprovecha la altura. Estas son comprobaciones propuestas; todavía no hay mediciones de usabilidad. Registrar problemas y preferencias sin presentar la maqueta como clínicamente validada.

## Qué subir
1. Este Markdown, fuente principal de requisitos.
2. dictalibre-referencia-anotada.html, referencia autónoma de distribución y descripciones. No es una réplica exacta ni una app funcional.
3. Las dos capturas recientes de la interfaz, como evidencia del aspecto previo al traslado de Planilla. El Markdown prevalece para la nueva posición.
4. Opcional: los HTML originales Hoja clínica v3.html y propuesta-b-v3.html para su carácter visual; sus flujos no prevalecen sobre estas reglas.
No hace falta subir el repositorio, credenciales, audios, biblioteca privada ni exportaciones del laboratorio.

## Prompt para pegar
Diseña una evolución de Dicta Libre siguiendo el Markdown adjunto. Usa el HTML anotado para entender la estructura, no como límite de calidad visual. Conserva el informe inicialmente vacío, Planilla persistente junto a Ajustes, conexión evidente, controles de letra visibles y revisión IA destacada. Optimiza espacio y legibilidad con fondo hueso cálido para una sala poco iluminada. No añadas funcionalidades ni alteres el flujo clínico. Presenta una propuesta navegable con estados simulados identificados, explica los cambios y entrega el diseño exportable para implementarlo sobre el proyecto actual.
