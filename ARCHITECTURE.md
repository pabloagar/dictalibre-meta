# Arquitectura

Actualizada el 28-10-2026 tras discutir las fases con el responsable. Esta versión reemplaza para las fases 1 y 2 las propuestas iniciales de red local obligatoria y backend Python. El resto de decisiones de IA permanece abierto.

## Implementado: captura y transporte

```text
S25 Ultra / navegador
  permiso → micrófono preparado → control explícito de grabación
  AudioWorklet → PCM16 mono → bloques ~100 ms → WSS
                                                   ↓
                               relay Node.js de una instancia
                                                   ↓
PC / navegador ← WSS ← bloques, secuencia y fin de toma
  confirma bloques → verifica SHA-256 → reproduce / descarga WAV
```

La demo actual usa un proxy HTTPS de Cloudflare y un túnel al relay del equipo de desarrollo. Ambos navegadores se conectan al origen público. Puede usarse desde redes diferentes; la prueba física en Wi-Fi y 4G/5G todavía no se ha realizado. El relay es portable a un servidor con soporte WebSocket y proxy HTTPS. La guía de Sites se consultó, pero su flujo de Workers no se utilizó para alojar este proceso Node con sesiones WebSocket en memoria.

## Módulos actuales

| Módulo | Responsabilidad |
| --- | --- |
| `apps/mobile/` | Interfaz de control, permiso, AudioWorklet, PCM, secuencias, estado y hash del emisor |
| `apps/desktop/` | Crear/confirmar sesión, recibir bloques, comprobar hash, reproductor y WAV |
| `apps/shared/` | Contrato binario, WAV, cliente WebSocket y estilos |
| `backend/server.mjs` | Servir únicamente assets permitidos, emparejar, validar y reenviar bloques, cerrar sesiones |
| `scripts/` | Inicio/parada del relay y túnel, comprobación de sintaxis y prueba sintética remota |
| `tests/` | Pruebas del worklet y del servidor, más lista de validación física pendiente |

Stack efectivo: Node.js, `ws`, JavaScript sin framework, `qrcode-generator`. Se eligió un único runtime para reducir infraestructura durante la prueba. El ASR futuro puede usar Python mediante un adaptador sin exigir cambios al control del teléfono.

## Estados y captura

Sesión: sin conexión → código creado → solicitud del teléfono → confirmación en PC → emparejados → cierre/caducidad. Códigos aleatorios de diez caracteres hexadecimales (40 bits), duración dos minutos y consumo al vincular. Confirmación adicional de cuatro cifras en ambos dispositivos. No hay cuentas de usuario ni sesiones recuperables.

Captura: sin preparar → preparado → grabando → entregando/verificando → preparado. Fuera de «grabando», el worklet no conserva ni envía muestras. La captura preparada mantiene el micrófono activo y su indicador del sistema; al finalizar sesión se libera. No hay buffer de audio previo a pulsar.

El modo mantener pulsado atiende presionar, soltar, cancelación del puntero y pérdida de captura. El modo inicio/parada alterna con dos pulsaciones. No puede cambiarse de modo durante una toma. Límite: 180 segundos. Al detener se vacía el bloque parcial antes de finalizar; no se añaden muestras posteriores al procesamiento de la orden de parada en el worklet. Las transiciones tienen latencia de procesamiento: se debe medir el primer/último sonido en el teléfono.

Se solicita mono y desactivar eco, reducción de ruido y ganancia automática; se informa lo que el navegador declara. No se presupone audio crudo ni que el hardware respete todas las solicitudes. El grafo convierte a mono y PCM16; se usa la frecuencia efectiva de AudioContext, sin fijarla a 16/24 kHz. No hay resampling dedicado ni VAD todavía.

La señal sintética de diagnóstico usa un oscilador de 440 Hz y se etiqueta como tal; no activa el micrófono ni acredita calidad de voz.

## Protocolo v1

Control JSON sobre `/ws`: `create`, `join`, `approve`, `start`, `receipt`, `end`, `verified`, `abort`, `close`, `ping`. Los roles se vinculan al socket; un receptor no puede enviar audio y el emisor no puede aprobarse a sí mismo.

`start`: identificador entero de toma, frecuencia, modo y origen micrófono/tono. El relay no acepta audio sin emparejamiento aprobado ni fuera de una toma.

Bloque binario: cabecera de 16 bytes con cuatro uint32 big-endian: magic `0x444c4131`, id de toma, secuencia desde cero y número de muestras. Sigue PCM16 little-endian mono. Los metadatos son independientes de la frecuencia de transporte y de la futura segmentación ASR.

Cada bloque recibido se valida; un duplicado idéntico se confirma sin reenviar. Duplicado diferente, hueco o desorden se marcan como error y abortan la toma. WebSocket mantiene orden en una conexión viva; esta validación protege contra errores de aplicación y futuras retransmisiones.

El relay calcula SHA-256 incremental y conserva hashes por bloque, sin guardar PCM. `end` incluye cantidad de bloques, muestras y SHA-256 del emisor. El PC calcula de nuevo el hash de su PCM y emite `verified` solo si coincide. No se acepta otra toma hasta esa confirmación. Este hash demuestra integridad del transporte, no autenticidad clínica ni ausencia de cortes anteriores en la captura.

## Fallos y límites

- Caída de un extremo: cierre de la sesión; nuevo emparejamiento. No reanudación automática.
- Cambio a segundo plano/bloqueo en el teléfono: abortar toma y liberar micrófono; preparar de nuevo al volver.
- Cola de envío móvil >512 KiB o receptor del relay >1 MiB: abortar con aviso.
- Quince segundos sin avance de toma/confirmación: abortar. Heartbeat para detectar conexiones muertas.
- Sesión máxima treinta minutos; hasta cien tomas por sesión. Hasta treinta sesiones y noventa sockets en una instancia; límite adicional de intentos por dirección de conexión.
- PC conserva como máximo tres tomas en memoria. Toma incompleta puede escucharse, pero no figura verificada.
- Fallos de permiso, contexto de audio suspendido y esquema inválido se muestran sin reinicio automático.

Estas cotas son límites del prototipo, no una certificación de resistencia a abuso. La memoria de sesión requiere una sola instancia: no desplegar con réplicas independientes sin rediseñar coordinación.

## Seguridad y datos

Solo origen configurado y ruta WebSocket válida; sin token en URL. El QR lleva el código temporal en el fragmento, que se retira de la barra del emisor. No se publican archivos arbitrarios del repositorio. CSP, no-cache, sin recursos externos de interfaz y sin persistencia del audio en servidor.

El túnel publica exclusivamente el servicio en loopback; su binario se verifica mediante hash y no se instala como servicio. HTTPS/WSS y el túnel no son cifrado de extremo a extremo frente al proxy/relay. El nodo de enlace puede ver PCM; el consentimiento de esta demo se limita a material sintético.

## Etapas futuras: propuestas, no implementación

Segmentación inteligente, ASR y sus adaptadores, consolidación de parciales/finales, comparación de motores, contexto terminológico, sugerencias de Meta y revisión humana se discutirán en las fases 3–8. La fase 9 incorporará texto/editor; los reproductores actuales solo sirven para comprobar el audio.

Conservar original y versionado; propuestas de spans con revisión base; abstención; ninguna sustitución clínica silenciosa; incertidumbre acústica distinguida de una hipótesis lingüística. Estos requisitos orientan el diseño futuro, pero no hay aún interfaces de corrección ni modelos ejecutados.

## Propuesta de transcripción modular · 2026-10-28
Investigación y contratos pendientes de aprobación en [TRANSCRIPTION_PLAN.md](TRANSCRIPTION_PLAN.md). Propone fuente intercambiable, preparación, delimitación, adaptadores ASR, consolidación, propuestas Meta opcionales y revisión. No se implementó ningún módulo ASR ni se seleccionó un ganador. La nueva propuesta de evaluación prioriza Muse Voice frente a Whisper y un contraste médico, condicionada a acceso y mediciones.

## Implementación posterior: laboratorio aprobado

Extensión en vivo implementada: emisor HTTPS → relay existente → puente WebSocket en loopback del laboratorio → receptor `/live` → verificación SHA-256 → importación WAV/cola Whisper → texto por toma. Lab no se publica en Cloudflare. Puente solo acepta origen y Host exactos de loopback; destino fijo leído de demo local. El relay no persiste PCM; sí el laboratorio, según aviso visible. Metadatos de parada cruzan el relay para estimación calibrada. Datos de ASR y credenciales no circulan hacia el teléfono. Una toma incompleta o vacía no activa ASR.
El laboratorio de [LABORATORY.md](LABORATORY.md) concreta fuente WAV → preparación compartida → adaptador Whisper GPU o Muse → original inmutable → evaluación versionada. API en loopback 8789, almacenamiento local y worker Python separado. No modifica el relay 8788 ni conecta automáticamente sus tomas. La afirmación anterior de ausencia de ASR describe el estado de investigación previo; ahora Whisper está ejecutado, Muse implementado y aún no verificado contra el servicio real. Corrección, segmentación inteligente y streaming permanecen futuros.

### Extensión implementada: Muse streaming
backend/muse-stream.mjs administra sesión, autenticación, ritmo, integridad, parciales y final; backend/stream-audio.mjs prepara PCM incremental. apps/desktop/stream-client.js conecta el receptor al backend local. Clave y conexión Meta quedan fuera del teléfono/navegador. El modo por toma permanece independiente; ambos alimentan números/comandos y el mismo catálogo del laboratorio. Véanse LABORATORY.md y METRICS.md para restricciones y semántica de tiempos.

## Fase 8 implementada · Revisor Meta
ASR final → números/comandos → texto visible → cola independiente Meta Spark → validación de propuestas → decisión humana → documento revisado por toma. backend/meta-review.mjs contiene contrato, proveedor, cola y revisiones; apps/shared/review-ui.js se comparte entre laboratorio y dictado. Rutas /api/reviews, /cancel, /action, /shown y /export bajo /api/reviews. Catálogo conserva reviews/reviewDocuments junto a runs inmutables. Configuración del interruptor congelada por toma, incluida en streaming. No revisa parciales ni bloquea cola ASR. Véase META_REVIEW.md.

## Editor de fase 9
ReportModel mantiene destinos por toma y desplaza sus posiciones ante edición exterior. El DOM distingue fragmentos provisionales; finales se aplican una vez y cancelaciones restauran la selección. Informe/plantillas locales al navegador, resultados ASR/revisiones permanecen en catálogo backend. No conexión RIS. Límites de persistencia y uso en PHASE_9_EDITOR.md.
