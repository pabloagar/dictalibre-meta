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
