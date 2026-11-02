# Evidencia técnica · ampliación del laboratorio

- `node-tests.txt`: 86 pruebas aprobadas de la versión de trabajo, no de un commit limpio.
- `corpus-verification.json`: 42 WAV, seis frases base, hashes, metadatos y una medición directa del verificador. Los audios permanecen en data/local, excluidos de publicación.
- `ui-synthetic.png`: cuatro registros creados por automatización en un servidor fixture aislado. Los juicios y porcentajes ilustran el funcionamiento del panel; no son evaluación profesional ni inferencias de Muse/Whisper. Los tiempos son de interacción automatizada, no productividad humana.

Validaciones adicionales observadas: cinco pruebas Python aprobadas y sintaxis JavaScript correcta. UI: guardar anotación, editar/aprobar, evaluar propuesta, finalizar tarea UX, consultar registros tras recarga y comparar un par con tiempos ausentes. Verificaciones de viewport CSS: 1440×900 y 389×844; zoom del navegador 0,75 compensado mediante dimensiones de emulación. Sin desbordamiento del documento, tablas con desplazamiento interno. Captura final sin emulación de tamaño.

Versionado: HEAD observado 654bed86c05046546db7691103f1f248c13e57d2 con cambios sin commit. Los hashes del reporte identifican fuentes al verificar el corpus, no acreditan que el servidor principal las hubiera cargado. Posteriormente se añadió un mensaje de compatibilidad con backend antiguo en el cliente; sintaxis comprobada. Las ejecuciones unitarias levantan el backend desde las fuentes de trabajo en procesos aislados.

Despliegue principal pendiente: reinicio autorizado por el responsable pero rechazado por revisión automática de permisos antes de ejecutarse. Respaldo privado verificado: .runtime/lab-extension-backup-2026-11-02.json. No se copiaron datos del catálogo real a esta evidencia pública. El servidor fixture se cerró tras las pruebas.
