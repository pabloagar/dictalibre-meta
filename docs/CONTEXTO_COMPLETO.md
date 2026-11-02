# Dicta Libre — contexto completo de la idea y la aplicación

Documento para descargar, compartir y continuar la conversación en otro chat.

**Corte documental:** 1 de noviembre de 2026, America/Santiago. Resumen del repositorio local; no constituye una nueva evaluación clínica ni una comprobación de servicios encendidos.

**Versión de referencia consultada:** HEAD local `654bed86c05046546db7691103f1f248c13e57d2`. Este identificador registra el código disponible al preparar el documento; no atribuye a ese commit todas las pruebas históricas.

## 1. Qué es Dicta Libre

Dicta Libre es una aplicación experimental de dictado médico, enfocada inicialmente en radiología en español. Convierte el teléfono en un micrófono para el computador y conecta la voz con un editor de informes, transcripción asistida por inteligencia artificial y revisión humana.

La idea central es que el profesional pueda abrir una plantilla, dictar desde su celular, ver el texto en el lugar elegido del informe, corregirlo y copiar el resultado para pegarlo en su sistema de trabajo.

El responsable del proyecto es médico radiólogo. El desarrollo parte de su experiencia y busca una interacción familiar para profesionales que utilizan dictáfonos y comandos de dictado en español.

Es un prototipo para investigación y evaluación profesional. No diagnostica, no recomienda tratamientos a pacientes y no dispone de validación clínica global.

## 2. Qué problema busca resolver

La elaboración de informes requiere convertir observaciones del profesional en un texto preciso, estructurado y revisado. El proyecto explora cómo facilitar esa tarea utilizando un teléfono como control de dictado y distintos motores de reconocimiento.

Los problemas que orientan el diseño son:

- Facilitar la entrada de voz al computador sin exigir un dictáfono dedicado para este recorrido.
- Trabajar con vocabulario médico y radiológico en español.
- Insertar cada dictado donde el profesional está escribiendo, evitando reconstruir el informe a partir de textos dispersos.
- Manejar números, unidades, puntuación y comandos de formato.
- Ayudar a detectar posibles errores y contradicciones manteniendo la decisión en manos del médico.
- Poder comparar alternativas con evidencia reproducible, en vez de elegirlas solo por una impresión de rapidez o calidad.

Reducir tiempo de escritura o corrección es un beneficio buscado. Todavía no se ha demostrado una mejora general de productividad, seguridad clínica o precisión frente a otros productos.

## 3. Para quién está pensada

El usuario inicial es un médico radiólogo que redacta informes en un computador y utiliza un teléfono cercano como micrófono y control de grabación.

El dispositivo de referencia acordado es el **Samsung S25 Ultra**, con navegador visible y pantalla encendida. La extensión a otros dispositivos, especialidades o instituciones requiere pruebas propias; no se da por validada.

## 4. Cómo sería una sesión de uso

El siguiente recorrido combina funciones ya implementadas en piloto. Su aceptación física completa sigue pendiente.

1. El profesional abre la página de dictado en el computador.
2. Pulsa **Conectar teléfono** y escanea un QR con el celular. También existe acceso manual con código y confirmación en el PC.
3. Prepara el micrófono y concede permiso en el navegador móvil.
4. En el editor del computador crea un informe en blanco o aplica una plantilla.
5. Coloca el cursor o selecciona el fragmento que quiere sustituir.
6. Dicta desde el teléfono: puede mantener pulsado el control o pulsar para iniciar y volver a pulsar para detener.
7. Con Muse-streaming ve un borrador en el destino seleccionado; al terminar se consolida el resultado. Con las opciones por archivo recibe el texto al finalizar el procesamiento.
8. Revisa el texto y, si está habilitado, examina las propuestas de Meta. Puede aceptar, rechazar, editar y deshacer según el tipo de propuesta.
9. Puede solicitar una revisión global del informe para recibir avisos de posibles inconsistencias.
10. Copia el informe como texto plano y lo pega manualmente en el RIS u otra aplicación.

El caso de uso principal son tomas cortas de **2–10 segundos**. El límite técnico por toma es de tres minutos y la sesión de transporte tiene un límite de treinta minutos. Esos límites no equivalen a tiempos óptimos de uso clínico.

Ejemplo exclusivamente sintético: el profesional selecciona una sección del informe y dicta «Nódulo de cinco milímetros en pulmón derecho, punto, nueva línea». El sistema intenta reconocer el contenido y aplicar el formato; el profesional comprueba el resultado antes de incorporarlo a su trabajo.

## 5. Qué componentes de IA utiliza

### Muse-Normal

Nombre conversacional para Muse de Meta usado con un archivo completo. Procesa una toma terminada o un audio cargado al laboratorio.

### Muse-streaming

Nombre conversacional para Muse usado mediante envío incremental de audio. Permite mostrar parciales reemplazables mientras se dicta y consolidar el texto al terminar.

Muse-Normal y Muse-streaming son **dos formas de usar el mismo modelo de reconocimiento**, no dos modelos distintos.

El streaming admite cierre manual y una opción experimental de segmentación automática. La segmentación decide cuándo cerrar un segmento de reconocimiento; una pausa no significa automáticamente nuevo párrafo, final del informe ni aprobación de su contenido.

### Whisper local

Whisper large-v3 ejecutado mediante OpenVINO, con la GPU Intel Arc del computador de referencia. Procesa tomas o archivos completos y sirve como alternativa y comparador local. Este proyecto no implementa streaming de Whisper.

### Revisor Meta

Una etapa separada, basada en `muse-spark-1.3`, que revisa texto después del reconocimiento. No reconoce el audio ni acredita que la transcripción coincida con lo pronunciado.

El glosario, el formato de números y los comandos son configuraciones o etapas del flujo. No son motores adicionales ni entrenamiento de los modelos.

## 6. Qué está implementado

### Captura y comunicación

- Interfaz móvil y receptor de escritorio en navegador.
- Emparejamiento QR con token temporal de un uso; alternativa manual con confirmación.
- Controles de mantener pulsado e inicio/parada.
- Micrófono preparado entre tomas; fuera de la toma sus muestras se descartan sin guardarlas ni enviarlas.
- Captura AudioWorklet y transporte PCM mono de 16 bits en bloques de aproximadamente 100 ms.
- Relay Node.js y conexión WebSocket segura mediante el túnel HTTPS temporal de la demo.
- Secuencias, confirmaciones y hashes SHA-256 para comprobar integridad del transporte.
- Diagnóstico con tono sintético, reproducción y descarga voluntaria de WAV.
- Vibración opcional de grabación, desactivada por defecto, con diagnóstico. Su percepción y posible contaminación acústica requieren comprobación física.

La coincidencia de hashes demuestra que los bytes recibidos coinciden; no demuestra que el micrófono haya capturado toda la voz sin cortes.

### Transcripción y formato

- Muse-Normal, Muse-streaming y Whisper local.
- Parciales que se reemplazan y finales que se consolidan.
- Segmentación automática opcional de Muse-streaming en validación.
- Conversión básica de números españoles a cifras y comandos de puntuación/saltos.
- Glosario radiológico versionado.

Persisten casos pendientes de números, puntuación, mayúsculas y comandos. No se promete reconocimiento perfecto de cualquier expresión.

### Editor y plantillas

- Informe en blanco, plantillas propias y biblioteca local con búsqueda, categorías, favoritas y vista previa.
- **285 plantillas únicas importadas localmente**, según el estado documentado. El contenido de esa colección está excluido del repositorio público por permisos de redistribución pendientes.
- Dictado en cursor o selección fijados al iniciar la toma.
- Borrador streaming dentro del informe; consolidación o restauración del texto ante cancelación/error.
- Edición manual, deshacer y copia como texto plano, con confirmación del portapapeles.
- Persistencia del informe consolidado y de las plantillas propias en el navegador/origen.

El contenido heredado de una plantilla exige revisión profesional. La existencia de una plantilla no certifica sus hallazgos ni su adecuación al caso.

### Revisión con Meta

La revisión por toma conserva el original y ofrece propuestas localizadas. Los cambios sensibles detectados en cifras, unidades, negaciones o lateralidad se convierten en alertas sin sustitución directa; esta defensa es parcial y no reemplaza la revisión humana.

La actualización contextual incorpora una instantánea acotada de la plantilla aplicada y del informe previo a la toma. La revisión global se solicita mediante **Revisar informe** y muestra avisos con citas literales, sin sustituir texto automáticamente. Una edición posterior deja el resultado desactualizado.

Al copiar sin revisión global vigente se ofrece revisar o copiar sin revisar. Una revisión completada no equivale a aprobación clínica.

### Laboratorio de evaluación

- Carga y reproducción de audios, ejecuciones configurables y comparación de motores.
- Conservación local de originales, resultados, configuración, errores y tiempos.
- Referencias y cálculo de WER cuando existe una referencia válida.
- Exportaciones para estudiar transcripción, revisión y comportamiento del editor.

## 7. Arquitectura resumida

```text
Celular / navegador
  → captura de voz y control de toma
  → HTTPS/WSS y relay Node.js
  → receptor y laboratorio local del computador
  → Muse por archivo / Muse streaming / Whisper local
  → formato de números y comandos
  → editor del informe
  → revisión Meta opcional y decisiones humanas
  → copiar texto para pegar en el RIS
```

El código principal utiliza JavaScript sin framework, Node.js, `ws` y `qrcode-generator`. Whisper utiliza un worker Python separado con OpenVINO. La configuración exacta se documenta en las guías de ejecución.

El relay de la demo se aloja en el equipo de desarrollo y se expone mediante Cloudflare Tunnel. Ese equipo debe permanecer encendido y conectado. El túnel es temporal; no representa un servicio permanente en la nube. El laboratorio trabaja en loopback y no se publica como tal mediante el túnel.

## 8. Datos, privacidad y persistencia

En esta etapa se utiliza material sintético. No incorporar audio clínico, texto de pacientes, identificadores personales ni secretos a la evidencia compartida.

- El relay no persiste el audio; el laboratorio local sí conserva tomas y resultados.
- El informe y las plantillas propias se guardan en el navegador/origen. No hay sincronización entre dispositivos ni respaldo central de ese contenido.
- El historial de deshacer y las asociaciones de tomas están en memoria y no se recuperan íntegramente tras recargar.
- Las credenciales Meta permanecen en el backend local y fuera de Git.
- Muse requiere enviar audio al proveedor. La revisión Meta envía texto y el contexto habilitado.
- **Usar Whisper local con Revisor Meta activado también envía texto a Meta.** El reconocimiento local por sí solo no implica que todas las etapas sean locales.
- HTTPS/WSS protege el transporte, pero no es cifrado de extremo a extremo frente a los operadores del relay/proxy.

## 9. Qué está probado y qué significa esa evidencia

La bitácora registra pruebas automatizadas, pruebas sintéticas de transporte público, comprobaciones de navegador, tomas aportadas por el responsable y comparaciones de motores sobre los mismos audios. La última entrada funcional consultada registra 76 pruebas y tres controles sintéticos reales para la revisión contextual/global; no se reejecutaron al preparar este documento.

También existen comparaciones exploratorias multivoz. Su alcance depende de la fuente de audio, la configuración y las referencias disponibles. Un guion escrito no sustituye la comprobación de lo efectivamente pronunciado.

Se distingue entre medidas directas, tiempos estimados y experiencias comunicadas por el usuario. Una experiencia positiva, una respuesta JSON válida o una prueba técnica exitosa no demuestran precisión clínica ni superioridad general.

Siguen pendientes la evaluación humana independiente, las referencias revisadas, un conjunto reservado y el análisis sistemático de errores relevantes: negaciones, lateralidad, medidas, unidades y términos médicos.

## 10. Las diez fases originales

| Fase | Estado documental | Pendiente principal |
| --- | --- | --- |
| 1. Captura de audio | Operativa | Completar aceptación física, permisos, interrupciones e inicio/final de voz |
| 2. Comunicación celular–PC | Operativa | Recuperación explícita y acceso/alojamiento estable |
| 3. Segmentación inteligente | Parcial/en validación | Comparación física pareada de pausas y cierre manual/automático |
| 4. Reconocimiento de voz | Operativa | Referencias revisadas y evaluación de errores clínicos |
| 5. Reconstrucción del texto | Parcial avanzada | Comandos, puntuación, mayúsculas, orden y cancelación |
| 6. Transcripción híbrida | Parcial | Evaluar desacuerdos y beneficio antes de combinar motores |
| 7. Contexto y terminología médica | Parcial avanzada | Efecto del glosario y regresiones en contenido nuevo |
| 8. Incertidumbre y propuestas | Parcial/piloto | Utilidad, falsas alertas, omisiones y errores introducidos |
| 9. Editor e inserción | Parcial/piloto | Usabilidad física, selección/copia y contenido de plantillas |
| 10. Evaluación y evidencia | Parcial/transversal | Evaluación reservada, reproducibilidad y cierre de entrega |

Son tres fases operativas y siete parciales/en validación. «Operativa» describe un recorrido funcional; no significa fase cerrada ni validación clínica.

## 11. Qué sigue pendiente en la visión

La fusión automática de motores, el fine-tuning, la inserción directa en RIS/PACS y la generación de informes a partir de instrucciones dictadas no están implementados como parte de este alcance.

Tampoco se garantiza funcionamiento móvil con pantalla bloqueada o en segundo plano, recuperación automática tras desconexión, compatibilidad con cualquier red hospitalaria, edición colaborativa o despliegue de producción.

La integración directa al RIS fue diferida por decisión del responsable: el recorrido acordado para la demo termina en copiar y pegar. El alojamiento estable, la instalación reproducible completa y la licencia del código propio siguen siendo puntos de trabajo según la documentación consultada.

## 12. Prioridades de continuación

1. Validar el recorrido completo en el S25 Ultra: plantilla, selección, dictado corto, final, cancelación, deshacer y copia.
2. Probar interrupciones, permisos y pérdida de visibilidad sin mostrar éxito falso.
3. Evaluar por separado segmentación, glosario y revisión, manteniendo constantes las demás condiciones.
4. Revisar referencias humanas y medir errores clínicamente relevantes, además de WER y latencia.
5. Valorar propuestas de Meta y revisión global, incluyendo falsas alarmas, omisiones y cambios potencialmente perjudiciales.
6. Consolidar acceso estable, documentación de instalación y alcance de la demo.

Cada comparación debe definir previamente hipótesis, métrica, unidades, inicio/final del intervalo, condiciones y criterio de aceptación. Registrar versión comprobada, configuración, dispositivo, navegador, red, fuente de audio y repeticiones. Los datos ausentes se mantienen como `null`; se conservan resultados favorables y desfavorables y se documentan precisión y sobrecosto de instrumentación.

## 13. Origen, contribución y repositorio

La idea y exploración conceptual precedieron al Meta AI Developer Hackathon 2026. Según la trazabilidad del proyecto, la implementación concursante comenzó desde cero el 28 de octubre de 2026. Eso no implica que nunca existieran experimentos anteriores.

La contribución propia reúne captura/control móvil, transporte, adaptadores de reconocimiento, laboratorio comparativo, formato, revisión supervisada, editor e instrumentación. Los modelos y sus pesos son externos; no se reivindica su entrenamiento como propio.

Repositorio público indicado en la documentación: [pabloagar/dictalibre-meta](https://github.com/pabloagar/dictalibre-meta).

Este resumen no verifica nuevamente las bases del concurso, su elegibilidad ni el estado de una entrega. Esos puntos deben consultarse en su documentación y portal correspondientes.

## 14. Fuentes internas y cómo continuar en otro chat

Este documento se apoya en `README.md`, `ROADMAP.md`, `HACKATHON_LOG.md`, `ARCHITECTURE.md`, `CONTRIBUTIONS.md`, `RUNNING.md`, `METRICS.md`, `PHASE_9_EDITOR.md`, `META_REVIEW.md` y `REPORT_REVIEW.md`. Para resultados y protocolos detallados consultar también `EXPERIMENTS.md`, `LABORATORY.md`, `TEMPLATE_LIBRARY.md` y las listas de aceptación de `tests/`.

Hay documentos con cortes históricos y actualizaciones posteriores. Las entradas antiguas que dicen «pendiente» no deben utilizarse para negar una implementación registrada después. Este archivo actualiza el contexto general sin borrar esa historia.

Texto listo para acompañar este archivo en otro chat:

> Estoy desarrollando Dicta Libre, una aplicación experimental de dictado radiológico en español. Uso un S25 Ultra como micrófono del computador, Muse por toma o streaming y Whisper local como alternativa/comparador, un editor con plantillas y revisión supervisada con Meta. Lee este contexto antes de proponer cambios. Distingue lo implementado en piloto, lo probado y lo pendiente; conserva las diez fases y las decisiones acordadas. No des por validada la seguridad clínica ni presentes propuestas como funciones existentes. Para cada cambio medible, plantea instrumentación y una prueba reproducible. Si necesitas una decisión de producto, haz preguntas concretas de una en una.
