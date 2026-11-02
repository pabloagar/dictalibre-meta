# Dicta Libre — contexto general para continuar la conversación

Estado documental al 29 de octubre de 2026, America/Santiago. Leer este archivo primero y luego PHASE_3_DISCUSSION.md. No se ha comprobado en esta revisión que los servidores estén encendidos.

## Cómo ayudarme

Soy médico radiólogo y responsable del proyecto. Quiero discutir decisiones de producto antes de implementarlas con el agente de desarrollo. Mantén las diez fases originales y distingue lo implementado, lo probado y lo propuesto. Haz preguntas concretas, de una en una. No reinicies el diseño desde cero ni propongas sustituir componentes sin justificarlo. Ahora estamos definiendo la fase 3, sin autorización para programarla todavía. Devuelve acuerdos y criterios verificables que pueda llevar al chat de implementación.

## Propósito y origen

Dicta Libre busca permitir dictado médico desde un teléfono usado como micrófono, transmitiendo audio al computador para transcribirlo y facilitar su revisión por el profesional. No es un sistema de diagnóstico ni de recomendaciones a pacientes. La experiencia debe resultar familiar a quienes usan dictáfonos y comandos de Dragon en español.

La idea y exploración conceptual preceden al Meta AI Developer Hackathon 2026. La implementación concursante comenzó desde cero el 28 de octubre de 2026. El período del evento comunicado por el responsable es 26 de octubre–4 de noviembre; las reglas completas, hora exacta de entrega y elegibilidad siguen pendientes de verificación. No afirmar ausencia de experimentos anteriores. Contribuciones nuevas y dependencias deben ser trazables; el repositorio público es un requisito pendiente de comprobar/completar.

## Nombres que debemos usar siempre

| Nombre conversacional | Qué significa | Funcionamiento actual |
|---|---|---|
| **Muse-Normal** | Muse de Meta mediante transcripción de un archivo completo | Al terminar la toma, se envía el audio para obtener el texto; también sirve para audios subidos al laboratorio |
| **Muse-streaming** | Muse de Meta mediante transmisión incremental de audio | Recibe audio mientras se dicta y muestra borradores; actualmente la toma se finaliza con el botón |
| **Whisper local** | Whisper large-v3 mediante OpenVINO en la GPU Intel Arc del computador | Transcribe archivos/tomas completas localmente; no tiene streaming implementado en este proyecto |

Muse-Normal y Muse-streaming son dos formas de usar el mismo modelo de Meta, no dos modelos distintos. Whisper local es el comparador local. Glosario, comandos y números son configuraciones/etapas separadas, no motores adicionales.

Dentro de Muse-streaming distinguiremos «cierre manual» (actual) y «segmentación automática» (propuesta). Esto no crea una cuarta opción de motor ni elimina Muse-Normal o Whisper local.

## Decisiones y restricciones acordadas

- Teléfono de referencia fijo: Samsung S25 Ultra.
- Wi-Fi prioritario para demo; transporte por datos móviles también probado. Esto no acredita funcionamiento en cualquier red hospitalaria.
- Uso principal: tomas de 2–10 segundos. Audios largos son pruebas complementarias, no requisito de duración mínima.
- Navegador móvil visible y pantalla encendida; segundo plano/bloqueo no garantizados.
- QR directo con token temporal de un uso; código manual con confirmación.
- Componentes intercambiables para probar una configuración sin rehacer el sistema.
- Datos sintéticos o autorizados sin información identificable de pacientes. No compartir secretos ni credenciales entre chats.
- Preservar audio/texto original; no cambiar silenciosamente negaciones, lateralidad, medidas o hallazgos.
- Medir cambios: hipótesis previa, intervalos/unidades definidos, versión/configuración, mismas fuentes de audio y resultados favorables/desfavorables. Metadatos desconocidos se mantienen como null.

## Qué funciona

1. Captura del celular, emparejamiento y transmisión al PC con verificación de integridad y métricas.
2. Dictado conectado con las tres opciones nombradas arriba; el usuario probó Muse-streaming y valoró positivamente la experiencia.
3. Laboratorio local: subir/reproducir audio, configurar ejecuciones, conservar resultados, comparar motores y exportar métricas. Hay soporte de referencias y WER cuando existe una referencia válida.
4. Comandos básicos: punto, coma, dos puntos, punto y coma, nueva línea y nuevo párrafo. No están resueltos todos los casos de puntuación/mayúsculas ni «punto aparte».
5. Conversión básica de números españoles a cifras, con original y eventos conservados. No resuelve toda expresión numérica posible.
6. Glosario radiológico versionado y ensayos de Muse-Normal con/sin glosario. No equivale a fine-tuning.
7. Editor web de informe; resultados/tomas persisten, pero la edición humana del informe aún necesita persistencia y deshacer.

La clave Meta se guarda localmente en un archivo excluido de Git. No hace falta su valor para discutir el diseño.

## Evidencia disponible y límites

Se compararon tomas del responsable y nueve audios de distintas voces que leen las páginas 1–2 de una guía. Los nueve se procesaron con Muse-Normal y Whisper local ya cargado, y se reprodujeron a ritmo real con Muse-streaming. Se conservaron resultados, configuración e integridad PCM. No se cambiaron las reglas durante esa comparación.

En esa serie de nueve, la media de tiempo desde el último envío del emisor hasta finalización en Muse-streaming fue aproximadamente 1,34 s; el primer parcial llegó en unos 3,29 s desde inicio del emisor. Son mediciones de reproducción en PC y de esa muestra, no promesas para cualquier teléfono/red. Los tiempos completos de procesamiento de archivos no se comparan directamente con la duración de una sesión streaming, que incluye el tiempo de reproducción.

Hubo resultados favorables y errores de vocabulario/números/comandos. Ejemplo observado: «nueva línea» reconocida como «nueve línea» y convertida a «9 línea». Falta escuchar y validar referencias humanas para puntuar precisión; el guion escrito no garantiza qué pronunció cada lector. No hay ganador clínicamente validado ni evidencia de seguridad para uso asistencial. Voces distintas leyendo el mismo texto no sustituyen diversidad de contenido y dictado espontáneo.

## Las diez fases y su estado

| Fase | Estado | Pendiente principal |
|---|---|---|
| 1. Captura | Operativa | Aceptación de interrupciones, permisos y visibilidad |
| 2. Comunicación | Operativa | Recuperación y alojamiento estable; túnel actual es temporal |
| 3. Segmentación inteligente | Función principal pendiente; discusión actual | Comparar cierre manual y turnos automáticos sin perder contenido |
| 4. Reconocimiento | Operativa | Evaluación con referencias revisadas |
| 5. Reconstrucción | Parcial avanzada | Comandos, puntuación, mayúsculas y continuidad entre segmentos |
| 6. Transcripción híbrida | Parcial | Comparador existe; alineación de desacuerdos y beneficio de combinar pendientes |
| 7. Contexto médico | Parcial avanzada | Validar glosario y regresiones en textos/voces nuevos |
| 8. Incertidumbre y propuestas | Función principal pendiente | Señalar dudas y alternativas con aceptación/rechazo humano |
| 9. Editor e inserción | Parcial | Guardar edición, deshacer, copiar; integración directa con otras aplicaciones posterior |
| 10. Evaluación y entrega | Transversal, parcial | Referencias, pruebas reservadas, robustez, instalación reproducible y demo |

Tres operativas, cinco parciales y dos con función principal pendiente. Operativa no significa cerrada ni validada clínicamente. Se avanzó en fases posteriores para probar la experiencia; ahora retomamos el orden por la fase 3. No hay que rehacer las fases 1–2 ni borrar avances posteriores. Evaluación y documentación acompañan cada fase.

## Qué discutimos ahora: fase 3

Definir cuándo cerrar un segmento de reconocimiento mientras el usuario mantiene una toma activa. Una pausa puede separar intervenciones, pero no necesariamente termina una oración, crea un párrafo o termina el informe. Los paquetes de audio pequeños son transporte, no segmentación lingüística.

Propuesta: comparar Muse-streaming con cierre manual frente a Muse-streaming con segmentación automática (ENDPOINTING). Mantener Muse-Normal y Whisper local como alternativas y comparadores. Una pausa no debe desactivar silenciosamente el micrófono ni interpretarse como aprobación médica.

Decidir primero la experiencia deseada: tomas cortas activadas/paradas por el usuario o toma abierta durante varias frases y pausas; necesidad de pausa explícita; representación de borradores/finales; espera tolerable. Después aprobar un protocolo antes de programar. El documento PHASE_3_DISCUSSION.md detalla opciones y pruebas propuestas.

## Qué no conviene asumir ni abrir todavía

- No hay segmentación automática implementada, fine-tuning ni corrección clínica supervisada completa.
- No fusionaremos motores automáticamente sin evidencia de beneficio.
- No cambiaremos todas las reglas de comandos durante el ensayo de segmentación: impediría atribuir efectos.
- Muse no proporciona confianza por palabra en la documentación consultada; señales de duda propias no son probabilidades calibradas.
- Un detector de silencio no entiende por sí mismo negaciones, números ni frases.
- Estudios históricos de radiología no establecen la precisión actual de este prototipo en español chileno.
- La discusión actual no debe convertirse en una propuesta de RIS/PACS, entrenamiento o plantillas antes de resolver la fase acordada.

## Fuentes internas para el agente de implementación

ROADMAP.md: diez fases y aceptación. HACKATHON_LOG.md: avances cronológicos. EXPERIMENTS.md/METRICS.md: metodología/evidencia. LABORATORY.md y DICTATION_COMMANDS.md: operación y límites. Reportes privados locales de comparación multivoz: data/local/lab/reports/2026-10-28-multivoice/streaming/. No es necesario adjuntar audios, rutas privadas adicionales ni credenciales para esta discusión.

Fuente oficial técnica consultada: https://dev.meta.ai/docs/speech-to-text. Verificar capacidades actuales antes de implementar.
