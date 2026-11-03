# Flujo público y controles — 2026-11-03

Prueba manual dirigida en navegador integrado, web pública. Sin audio guardado ni datos de pacientes. Se pidió al responsable escanear QR y dictar una frase sintética; la UI mostró teléfono conectado, una toma de 00:05 y texto incorporado. No se observó directamente la cámara del teléfono ni se midió exactitud ASR. Modelo/dispositivo del celular y red: null. Una toma observada, no ensayo de carga.

Acciones comprobadas: idioma EN→ES; usar teclado; abrir biblioteca; elegir/aplicar RX de tórax; cinco pares de aumentar/reducir fuente; sexo F/M/—; ajustes, temas Día/Ámbar/Penumbra y ayuda; deshacer/rehacer con igualdad del texto; copiar sin revisión; cancelar nuevo informe; vaciar y recuperar con Deshacer; revisión real Meta del texto sintético; ir al aviso; aceptar corrección; deshacer/rehacer. Sin caída ni errores de consola observados. Pausa del teléfono apareció en pantalla.

Hallazgos pendientes:
- El dictado se insertó delante del título sin separación entre la última palabra y RX. El revisor lo detectó y permitió añadir un espacio. La aceptación corrigió este informe de prueba; no corrige el algoritmo de inserción de la aplicación.
- Copiar mostró éxito, pero lectura de clipboard a través de la herramienta devolvió vacío. No se sabe si es fallo del producto o aislamiento del navegador integrado; requiere pegado real en destino.
- La revisión se marcó desactualizada al deshacer/rehacer: observado, controles de aceptación antiguos deshabilitados.

Alcance: recorrido dirigido de controles principales, no prueba exhaustiva de todas las combinaciones ni garantía de ausencia de fallos. No se reinició el servidor ni se cambió código de aplicación. Informe sintético dejado abierto para inspección. Captura privada fuera del repositorio.
