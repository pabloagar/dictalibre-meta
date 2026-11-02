# Primera prueba desde teléfono · dicta en Render

Estado: protocolo preparado; resultados físicos pendientes. Usar solo la frase sintética de abajo. La versión activa verificada se registra en HACKATHON_LOG.md. No publicar códigos QR, credenciales, audio clínico ni informes de pacientes.

## Preparación

1. PC: abrir https://dictalibre-demo.onrender.com/live, entrar con el código y empezar con el informe vacío.
2. Ajustes → Dictado: Muse-streaming, Cierre manual y Aplicar comandos de dictado activado. Dejar Sin glosario para esta primera prueba.
3. Pulsar Conecta tu teléfono, escanear el QR y abrir el enlace en Chrome del teléfono. Esperar la confirmación de conexión en ambos equipos.
4. Teléfono: Preparar micrófono y permitir el acceso. Usar Inicio / parada para la primera toma; mantener la página visible y la pantalla encendida.
5. Más opciones → Vibración al iniciar y detener. Viene activada en un navegador sin preferencia anterior; si antes se apagó, reactivarla explícitamente. Pulsar Probar vibración breve antes de grabar. Si no se percibe, revisar ajustes de vibración, silencio y No molestar; no dar por hecho que el motor vibró porque el navegador aceptó la solicitud.

## Serie inicial: tres tomas

Usar la misma frase y esperar el resultado final en el PC antes de comenzar otra toma. Entre tomas usar Nuevo informe y confirmar: debe conservar la conexión del teléfono.

Decir literalmente, incluidos los comandos:

> No hay derrame pleural punto nueva línea nódulo de tres milímetros en el pulmón derecho punto

Esperado: dos frases en líneas separadas, signos de punto, negación «No», cantidad 3, unidad milímetros y lado derecho. «mm» y «milímetros» son equivalentes para esta comprobación. No debe insertarse la palabra «punto» ni contenido no dictado.

| Toma | Modo | Vibración | Qué comprobar |
| --- | --- | --- | --- |
| 1 | Inicio / parada | Activada | Inicio confirmado, pulso perceptible, reloj/nivel en movimiento, fin de captura y texto final. |
| 2 | Inicio / parada | Desactivada | Misma captura y texto, sin pulso; elección conservada al volver a Más opciones. |
| 3 | Mantener pulsado | Activada | Captura solo mientras se mantiene pulsado; soltar detiene y el texto queda completo. |

Durante inicio se muestra Iniciando. Empezar a hablar al ver Grabando y, si funciona la vibración, sentir el pulso. Al detener: Deteniendo → Comprobando entrega → confirmación de audio recibido. Esa confirmación no significa que la transcripción haya terminado: comprobar también el PC. El indicador del permiso de micrófono por sí solo no acredita que se esté grabando una toma.

Al terminar, usar Copiar para RIS y pegar en un documento vacío de prueba. Debe coincidir con el informe, sin botones, avisos ni marcas de revisión. No hace falta abrir un RIS clínico.

## Criterios y registro

Para cada toma registrar por separado: pulso inicial/final percibido, respuesta visual al toque, primera/última palabra completas, texto esperado, duplicaciones, entrega verificada y copia limpia. La primera serie pasa si todas las tomas entregan el audio y mantienen negación, cantidad/lado y comandos sin cortes ni duplicación. Con vibración activa deben percibirse ambos pulsos; desactivada ninguno. Si el toque con guante o dedo húmedo no inicia nada, no debe aparecer Grabando ni un pulso de inicio. No confundir falta de vibración del dispositivo con falta de captura: contrastar reloj/nivel y estado.

Ficha: fecha, commit activo comprobado, modelo de teléfono, versiones de sistema/Chrome, red Wi-Fi o móvil, modo, motor/segmentación/glosario, vibración, cantidad de repeticiones y resultado por toma. Registrar datos ausentes como null y sensaciones como observaciones del usuario. No estimar latencias en ms de memoria.

Medidas instrumentadas: startControlMs (orden → primer audio procesado), stopFlushMs (orden de parada → vaciado), stopToVerifiedMs (parada → integridad confirmada), resultado final del PC mediante métricas disponibles. Precisión efectiva del reloj, latencia física y duración física del pulso: null si no se miden. Exportar diagnóstico de interrupciones en el teléfono y métricas de las últimas tomas en el PC antes de recargar. Los JSON de diagnóstico no necesitan audio ni texto clínico.

Después de aprobar esta serie: repetir con datos móviles y probar una interrupción controlada de una toma sintética al ocultar/bloquear la pantalla. Debe indicarse interrupción y requerir reactivar el micrófono, sin fingir entrega correcta. La comparación formal de vibración y posible ruido sigue [HAPTICS_CHECKLIST.md](HAPTICS_CHECKLIST.md); esta serie de tres tomas no es un benchmark ni validación clínica.

## Aceptación física comunicada · Samsung · 02-11-2026

Fuente: resultados escritos por el responsable, no exportación instrumentada. Dispositivo Samsung S25 Ultra; Chrome, versión null; sistema operativo null; teléfono Wi-Fi, red del PC null; commit activo durante cada toma null (no atribuir por fecha). Cantidad exacta de repeticiones y latencias null. No se publica transcripción aportada ni audio.

- Nuevo informe: responsable confirma hoja vacía (captura con placeholder), dictado posterior y coincidencia entre lo dicho y lo recibido. Campo de continuidad de conexión sin respuesta explícita: confirmar si evitó reemparejar; no marcar ese criterio aprobado por inferencia.
- Mantener pulsado: inicio al presionar y parada al soltar, vibración percibida en ambos extremos, frase esperada y ausencia de cortes/duplicaciones comunicadas. Aprobación de esta prueba por observación del usuario, no validación global.
- Cambio a WhatsApp sin grabar: al regresar aparece «Conexión cerrada. Crea una sesión nueva en el PC». Requirió introducir código de nuevo. Informe del PC conservado y siguiente toma correcta después de reconectar. **Recuperación cómoda no aprobada.** Responsable solicita mantener emparejamiento unos dos minutos; alternativa QR más fácil si expira. No implica permitir grabación en segundo plano.

Inspección de código: backend/server.mjs termina toda la sesión al cerrar cualquiera de los sockets; mobile.js libera micrófono al ocultarse y cierra socket en pagehide; cliente usa latidos con plazo de 20 s. Esto explica por qué una suspensión puede obligar a reemparejar; no se midió cuál evento exacto ocurrió en esta prueba. Pendiente implementar y probar recuperación temporal autenticada, invalidación al cerrar sesión/expirar, toma interrumpida sin éxito falso y reactivación explícita de micrófono. No reutilizar QR de un solo uso ni mantener grabación al regresar. Requiere prueba de servidor y móvil y despliegue coordinado. iPhone físico pendiente.

Confirmación posterior del responsable, 02-11-2026: después de «Nuevo informe» pudo dictar sin volver a conectar el teléfono. Criterio de continuidad tras vaciar aprobado según observación comunicada. Esto resuelve el campo sin respuesta del registro anterior; la recuperación después de WhatsApp sigue pendiente.

## Repetición tras corrección de recuperación temporal

Pendiente prueba física en versión desplegada nueva: emparejar de nuevo tras despliegue, dictar frase sintética, salir a WhatsApp sin grabar 30–60 s, volver a misma pestaña Chrome. Debe recuperar sin código, pedir preparar/reactivar micrófono y conservar informe. Dictar otra frase y verificar entrega única. Repetir pausa superior a dos minutos: debe requerir sesión nueva/QR. Cerrar sesión desde PC y verificar que no vuelve automáticamente. Si se oculta durante toma, debe avisar interrupción sin éxito falso. No recargar ni cerrar la pestaña para este ensayo; el secreto de recuperación vive solo en memoria. Registrar duración aproximada como estimación del usuario, versión/dispositivo/navegador/red y exportación de eventos si disponible; no exportar tokens ni texto clínico.
