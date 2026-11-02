# Revisión general y protocolo de aceptación · 01-11-2026

Inspección de código y mediciones locales; sin cambios funcionales en ASR, formato, editor ni revisión durante las pruebas del responsable. No es auditoría clínica, de seguridad exhaustiva ni perfilado de GPU. El laboratorio principal no se reinició. Se renovaron únicamente relay/túnel al comprobar fallo real de acceso.

## Evidencia y alcance

- Medición reproducible: `node scripts/audit-resources.mjs`. Cada ejecución crea protocolo y resultados agregados en `data/local/audits/`; no ejecuta inferencias, no guarda secretos/textos y no modifica catálogo.
- Ejecución de esta revisión: `data/local/audits/2026-11-01T21-33-52-665Z/{protocol,results}.json`. Hipótesis, intervalos, unidades, repeticiones y limitaciones definidos antes de medir.
- Árbol de trabajo con cambios locales. HEAD observado `28d75be14d4044b54deaed71e0c85cc977d2d864` es contexto, no atribución de la implementación. Resultados incluyen hashes de archivos inspeccionados y hash separado del servidor en ejecución.
- Catálogo: 55 audios, 167 ejecuciones, 35 revisiones; solo 3 audios tienen alguna referencia guardada. Tener referencia no implica anotación validada. No permite declarar precisión global.
- No se ejecutó otra batería ASR ni se repitió la suite completa mientras el responsable probaba. La comprobación nueva fue sintaxis del script, ejecución del diagnóstico y sondas de recuperación. La suite 67 Node + 5 Python aprobada en la tarea anterior sigue siendo evidencia histórica.

## Hallazgos priorizados

### P1 · Tarjetas terminadas mantienen consultas repetidas del catálogo completo

`apps/shared/review-ui.js:48–49` consulta `/api/state` por panel cada 1,5 s, incluso sin revisión activa. `apps/desktop/live.js:80` monta ese panel en toda toma completada. El recorte de tarjetas en `live.js:102` se detiene si la primera contiene cualquier botón; las tarjetas terminadas ahora tienen botones de revisión, por lo que el límite de cinco deja de aplicarse. Además cuenta `article` de sugerencias anidadas, no solo tarjetas de toma. Los temporizadores solo terminan al retirar el panel del DOM.

Medido: cada respuesta `/api/state` ocupa **1.220.916 bytes**. Cinco paneles implicarían aproximadamente **4,07 MB/s de cuerpos JSON por loopback**, según intervalos de código; es una estimación, no tráfico capturado del navegador ni consumo de datos del celular. El laboratorio añade su propia consulta cada 1,5 s (`apps/lab/lab.js:54`), y una transcripción pendiente consulta cada 250 ms más tiempo de respuesta (`live.js:73,98`).

Propuesta: retención explícita de tarjetas por estado, conservando edición pendiente; una suscripción compartida por página, consulta acotada por trabajo/revisión y pausa cuando no hay cambios pendientes. Conservar todo el historial y audio en laboratorio. Prueba futura: 5/20/100 tomas sintéticas, cero pérdidas de edición, número acotado de consultas y reducción objetivo >=80% de bytes en reposo respecto de idéntica fixture. Objetivo propuesto, no resultado logrado.

### P1 operativa · Acceso dependiente de túnel temporal que desaparece

En esta incidencia el PC respondía, pero el enlace anterior fallaba DNS y cloudflared registraba `Unauthorized: Tunnel not found`. Ya había ocurrido una recuperación similar. Renovación resuelta, pero la causa estructural sigue pendiente: el enlace depende de ese túnel, PC e Internet disponibles.

Propuesta: antes de demo, elegir alojamiento/enlace estable y detectar fallo con un mensaje de recuperación y URL vigente. No crear servicios externos ni cambiar despliegue durante esta revisión. La página local permite conservar trabajo, pero el teléfono requiere transporte recuperado y QR nuevo.

### P2 · Escritura síncrona y respuesta de todo el historial

`backend/lab.mjs:61` serializa/escribe el catálogo completo en cada guardado, incluidos registros de medición. `lab.mjs:70,112` recalcula evaluación y devuelve ejecuciones, eventos, revisiones e historiales completos al sondear estado. `apps/lab/lab.js:43` serializa dos veces todos los runs para comparar cambios. El historial crece con las pruebas.

Medido en snapshot: catálogo 1.528.557 bytes; mediana de 5 serializaciones **8,20 ms**, parseos **4,64 ms** y evaluaciones de todos los runs **0,92 ms**. La evaluación no es hoy el mayor coste de este diagnóstico, y solo hay 3 referencias. HTTP local 5/5 respuestas 200: **21,18–90,68 ms**, mediana **26,44 ms**, incluyendo primera petición. No se midieron escritura de disco ni contención del navegador, y no se atribuye latencia de Muse a estos valores.

Propuesta: estado resumido + detalle bajo demanda, índice por ID, caché de evaluación por hash/versión de referencia y persistencia que mantenga orden/atomicidad sin bloquear repetidamente. No basta sustituir `writeFileSync` por escrituras concurrentes. Medir durabilidad, restauración y latencia de bucle bajo la misma carga antes de elegir almacenamiento.

### P2 · Editor reconstruye y guarda más de lo necesario

`apps/desktop/report-editor.js:32,38,52` reconstruye el editor y persiste texto consolidado en cada parcial; también serializa hasta 1000 eventos de métricas a localStorage. En cierre manual el texto consolidado puede ser idéntico entre parciales. `apps/shared/report-model.js:13` guarda una versión completa en cada edición; `history` no tiene límite y `starts` del editor no elimina entradas terminadas.

Fixture independiente: informe inicial de 5100 caracteres + 1000 ediciones individuales deja **1000 entradas y 5.599.500 caracteres lógicos** en el historial, para texto final de 6100 caracteres. No equivale a RAM real: el motor puede compartir cadenas. El modelo tarda 59,92 ms en esa ejecución, sin DOM ni localStorage; no es una medición de fluidez física.

Propuesta: agrupar historial por acción/intención con límite configurable, actualizar solo el tramo provisional, evitar guardar texto sin cambios y agrupar persistencia de métricas con vaciado al finalizar/exportar. Conservar deshacer, cancelación, destinos y recuperación. Evaluar informes de 1/5/20 mil caracteres; no optimizar a costa de evidencia ni cambios perdidos.

### P2 · La instrumentación necesita medir su propio coste y la versión del cliente

Los `elapsedMs` de preview/final se calculan antes de entrar en `event(...)`, que luego serializa y guarda métricas (`report-editor.js:32,52`). Por tanto excluyen ese coste. El `sourceHash` mostrado procede del inicio del backend, aunque archivos estáticos pueden cambiar sin reinicio (`lab.mjs:66`). La incorporación reciente de biblioteca es un ejemplo: código en disco y servidor activo no tienen por qué representar la misma versión.

Propuesta: medir por separado actualización del editor, persistencia y métricas; exportar versión/hash del cliente servido y configuración por serie. Comparar sobrecosto instrumentado/no instrumentado en fixture antes de interpretar diferencias pequeñas. Campos desconocidos deben permanecer null. La revisión no altera métricas previas.

## Recursos: qué no conviene borrar ni confundir

Snapshot de procesos de este proyecto: laboratorio ~79,5 MiB de working set, relay ~58,8 MiB y túnel ~39,6 MiB. No había hijo Python del laboratorio en ese instante. CPU porcentual y memoria GPU no medidas; no afirmar que Whisper estaba cargado ni que GPU estaba ociosa. Una captura de working set no diagnostica una fuga.

Disco: modelos 3.099.056.767 bytes; originales del laboratorio 70.118.768 bytes y derivados 88.876.608 bytes. Son pesos y evidencia; no se eliminaron. `backend/lab-worker.py` mantiene el pipeline caliente después del primer uso, comportamiento necesario para la comparación acordada. Se podría ofrecer descarga explícita en reposo después de medir coste de recarga, sin mezclar frío/caliente.

Hay código comprimido en líneas largas y varias responsabilidades en `lab.mjs`/`live.js`; separar consulta de estado, persistencia y presentación ayudará a verificar estos cambios. No se hizo una reescritura general ni se agregaron dependencias.

## Pruebas del responsable ahora

Entorno comunicado: S25 Ultra, PC con Internet compartido desde celular y ruido de aeropuerto. Registrar si cambió; tecnología 4G/5G, navegador exacto y nivel de ruido no medidos. No etiquetar esta serie como Wi-Fi hospitalaria ni comparar su latencia con otra red como si fueran condiciones iguales.

### A · Cinco tomas de 2–10 segundos, editor y formato

Muse-streaming, cierre manual, mismo glosario, comandos activos, Revisor Meta automático desactivado. Informe en blanco o plantilla propia actualmente disponible; biblioteca importada pendiente de reinicio.

1. Dictar «Pulmones bien expandidos, punto» al final del informe.
2. Escribir/seleccionar «Sin derrame pleural.»; dictar «Pequeño derrame pleural derecho, punto». Comprobar reemplazo exclusivo y deshacer exacto.
3. Dictar «Nódulo de dos coma cinco centímetros, punto»; comprobar cifra 2,5 y unidad sin alteración.
4. Dictar «Atelectasia laminar basal derecha, punto, nueva línea, sin neumotórax, punto»; comprobar salto, mayúscula, lateralidad y negación.
5. Mover cursor a otro lugar y repetir la primera frase; comprobar destino y que no se duplique el final.

Exportar métricas de últimas 5 tomas y mediciones del editor ANTES de otra serie/recarga. Escuchar inicio/final; anotar cualquier palabra distinta de lo realmente pronunciado. Criterios: cero cambios fuera de selección, cero duplicados, deshacer fiel y cifras/negaciones conservadas. Registrar latencia percibida; no inventar umbral clínico.

### B · Pausas (fase 3)

Misma frase «Pulmones bien expandidos [pausa de unos 2 segundos] sin derrame pleural, punto». Dos tomas con cierre manual y dos con automática, manteniendo botón activo durante la pausa. Registrar duración objetivo como aproximada; no afirmar silencio acústico medido. Comparar cantidad de segmentos, integridad, texto completo y espera final. La pausa no debe apagar micrófono ni inventar párrafo. Cuatro tomas son piloto exploratorio. Exportar de nuevo antes de otra serie.

### C · Revisor y copia (fases 8/9)

Sobre tomas A, solicitar revisión con Meta manualmente; no hace falta volver a grabar. Escuchar una propuesta, valorar si ayuda, aceptar/rechazar y deshacer verificando el resto del informe. Si no hay propuestas, registrar abstención; no inventar error para forzar una. Copiar informe a un editor de texto y comprobar saltos. Exportar JSON del laboratorio y CSV de revisiones además de métricas del editor. Registrar errores corregidos, nuevos errores, falsas alertas y observaciones útiles; aún no es estudio clínico.

### Después de exportar

Avisar término de grabaciones para activar biblioteca pendiente. Entonces probar buscar plantilla, vista previa, favorito, crear copia editable, reemplazar una frase y copiar el resultado. Finalmente prueba separada de bloqueo/cambio de aplicación y recuperación; el producto no promete grabación en segundo plano.

## Orden de decisiones

1. Preservar series actuales y resolver estabilidad de acceso.
2. Corregir consultas y retención; repetir fixture pareada y casos de edición.
3. Activar biblioteca al terminar y validar contenido/uso.
4. Decidir cierre manual/automático y revisor opcional según evidencia; mantener tres motores intercambiables.
5. Referencias humanas y fase 10 para entrega. Fine-tuning, fusión automática y RIS directo se mantienen fuera de este cierre.
