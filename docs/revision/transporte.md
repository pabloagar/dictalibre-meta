# Revisión de transporte y audio · Dicta Libre · 02-11-2026

Revisión **de solo lectura**: no se modificó ningún archivo del repositorio. Rol: ingeniería de transporte/audio (captura en el celular, relay WebSocket, receptor en PC).

## Contexto y evidencia

- Repositorio `/home/user/dictalibre-meta`, rama `claude/dazzling-hamilton-k0apsq`, HEAD observado al ejecutar las pruebas: `27259eeef070b9c5f3d31f91f7cfeb015838ba8b`. Ese commit solo agrega documentación y maquetas de UI; `git diff --stat 654bed8 27259ee` no toca `apps/mobile`, `apps/shared`, `backend`, `desktop.js` ni `stream-client.js`. Árbol de trabajo limpio (`git status --short` vacío).
- Entorno de ejecución: contenedor Linux, Node v22.23.4, 4 vCPU Intel Xeon a 2,10 GHz, solo loopback y sin red externa. **No representa** al S25 Ultra, a Chrome Android, al túnel de Cloudflare ni a redes 4G/5G/Wi-Fi. Todo lo que dependa de eso se marca como *no verificable aquí*.
- Pruebas del repositorio: `node --test tests/*.test.mjs` → 76/76 aprobadas. Subconjunto de transporte (`capture`, `relay`, `mobile-lifecycle`, `mobile-haptics`, `live-bridge`, `metrics`) → 30/30 aprobadas.
- Sondas propias (copiadas a `docs/revision/sondas/`; importan el código real sin modificarlo):
  - `docs/revision/sondas/relay-probes.mjs`: varias sondas del relay. Una ejecución.
  - `docs/revision/sondas/relay-probes2.mjs`: toma 101 y ráfaga tras 5,2 s. Una ejecución.
  - `docs/revision/sondas/relay-probes3.mjs`: barrido de cortes de 2 a 4,5 s y cascada de abort. Una ejecución.
  - `docs/revision/sondas/mobile-probes.mjs`: arnés `vm` igual al de `tests/mobile-lifecycle.test.mjs`. Una ejecución.
  - `docs/revision/sondas/perf.mjs`: microbenchmarks con mediana de 5 a 500 repeticiones según la medida.
  - Se ejecutan con `node <ruta>`.
- Etiquetas: **[Ejecutado]** = verificado con un comando; **[Leído]** = inferido de la lectura del código; **[Estimado]** = cálculo a partir de constantes.

### Relación con `CODE_REVIEW_2026-11-01.md`

Sus hallazgos se refieren casi todos al laboratorio, al editor y al sondeo; no se repiten aquí.

- **P1 de sondeo.** `HACKATHON_LOG.md:190–192` lo declara corregido. `apps/shared/review-ui.js:12–16` muestra ahora un temporizador compartido (`reviewTimer`) que se detiene sin suscriptores [Leído]. No volví a medirlo.
- **P1 operativa del túnel temporal.** Sigue vigente en su estructura: `scripts/Start-Demo.ps1:28` usa un *quick tunnel* (`tunnel --url http://127.0.0.1:$Port`). No se puede verificar en la nube. Esa misma línea es la base del hallazgo M2.
- **P2 «la instrumentación necesita medir su propio coste».** Sigue vigente (`METRICS.md:84`: «El sobrecosto de instrumentación no está calibrado»). Aquí aporto evidencia nueva: la telemetría triplica los mensajes de subida y, en ráfagas, activa el limitador del relay (M3).

---

## Hallazgos

No encontré hallazgos **críticos**. En ningún caso observé un éxito falso de integridad: el teléfono solo muestra «✓ … exactamente el mismo audio» después de que el PC recalcula el SHA-256 (`backend/server.mjs:203–205`).

### ALTO

#### A1 · Un `aborted` rezagado anula la toma nueva en el teléfono sin avisar al relay; el PC queda «RECIBIENDO» una toma fantasma

- **Evidencia:**
  - `apps/mobile/mobile.js:181`: `case 'aborted': abort(m.reason, false); break;` no compara `m.id` con `recording.id`.
  - `apps/mobile/mobile.js:75`: `if (recording && notify) client?.send({ type: 'abort' });`. El relay responde con `aborted` y el **id antiguo** (`backend/server.mjs:162` → `:77`).
- **Secuencia** (ocurre tras un abort local con aviso: saturación en `mobile.js:123`, o fallo de hash/envío en `mobile.js:96`):
  1. Abort de la toma #1 y nueva pulsación antes de un RTT. El teléfono crea la #2 y envía `start#2`.
  2. El relay procesa el `abort`, emite `aborted#1` y luego acepta `start#2`.
  3. Al llegar `aborted#1`, el teléfono descarta localmente la #2 con `notify=false`.
  4. El relay y el PC siguen con la #2 abierta y sin audio hasta el temporizador de 15 s (`server.mjs:220`).
  5. Si en ese lapso se inicia la #3, el relay la rechaza («La grabación anterior aún no terminó.»), aborta la #2 y ese `aborted#2` descarta la #3 en el teléfono.
- **[Ejecutado]**
  - `relay-probes.mjs` → `abortThenStart`: el PC recibe `aborted#1` y después `start#2`; `serverRecording: 2`.
  - `mobile-probes.mjs` → `staleAborted`: con `recording.id=2`, un `aborted` con `id:1` deja `recording=null` y no envía `abort` al relay.
  - `relay-probes3.mjs` → `cascade`: `aborted#1`, `aborted#2`, `error(La grabación anterior aún no terminó.)`.
- **Impacto:** se pierden una o dos tomas. Durante hasta 15 s el PC muestra «RECIBIENDO / Grabación en curso» (`desktop.js:155–157`) de una toma que el teléfono ya descartó. Es un «grabando» falso en el receptor. Las tomas no se marcan como verificadas, así que no hay éxito falso de integridad. Es más probable justo en malas condiciones de red (RTT alto), como el escenario de prueba con internet compartido desde el celular.
- **Riesgo de corregir:** muy bajo.
- **Propuesta:**
  - En el teléfono: `case 'aborted': if (recording && m.id !== recording.id) break; abort(m.reason, false);`.
  - Opcional en el PC: filtrar también por `current?.id` en `desktop.js:159`.
  - Prueba `vm` como la de `mobile-probes.mjs` (aborted con id ajeno ⇒ la toma sigue) y prueba de relay de la secuencia abort+start.
- **Plazo:** seguro antes del 4-nov (cambio de una línea en el cliente; no requiere reiniciar el relay, solo recargar `/mobile`).

### MEDIO

#### M1 · Un `error` del relay sin `aborted` deja al teléfono «grabando» y después «Comprobando entrega…» indefinidamente

- **Evidencia:**
  - `apps/mobile/mobile.js:182`: `case 'error': status(m.message, 'error'); if (!paired) client?.close(); break;` no cambia `recording`.
  - El relay solo aborta si existe `session.recording` (`server.mjs:209–211`). Por eso, si rechaza el `start` (`server.mjs:164–167`; p. ej. `usedIds.size >= 100` → «Crea una sesión nueva para continuar.»), el teléfono no recibe `aborted`.
- **[Ejecutado]**
  - `relay-probes2.mjs` → `take101`: tras 100 tomas verificadas, la 101 recibe solo `error(Crea una sesión nueva…)`, `error(Audio fuera de una grabación activa.)` y `error(Operación no permitida en este estado.)`. El PC no recibe nada.
  - `mobile-probes.mjs` → `errorDuringTake`: después del `error`, `recording.state` sigue en `'recording'` y no se envía `abort`.
  - [Leído] Al soltar, `stop()` pasa a `finishing`; como nunca llega `verified` ni `aborted`, el botón queda deshabilitado con «Comprobando entrega…» hasta pulsar «Reiniciar sesión».
- **Impacto:** después de 100 tomas en una sesión de 30 min (unas 3,3 por minuto, alcanzable con tomas cortas en modo mantener pulsado), o ante cualquier rechazo de `start`, la UI del teléfono queda bloqueada. El PC sigue «EN ESPERA» sin aviso. No hay éxito falso, pero sí un estado contradictorio y una toma perdida. El teléfono no avisa que se acerca el límite de 100.
- **Riesgo de corregir:** bajo.
- **Propuesta:**
  - En el cliente: si llega `error` con `recording` activo, ejecutar `abort(m.message)`. Mostrar «quedan N tomas en esta sesión» desde la toma 90.
  - En el servidor (después): responder `start_rejected{id}`.
  - Prueba: arnés `vm` y sonda `take101` convertida en test.
- **Plazo:** seguro antes del 4-nov la parte del cliente; la del servidor, después.

#### M2 · El limitador «por IP» detrás del túnel es global: cualquiera con la URL bloquea el emparejamiento de todos; los topes de 90 sockets y 30 sesiones no requieren credencial

- **Evidencia:**
  - `backend/server.mjs:85–89`: `limit(ip)`, 20 intentos por minuto, con clave `req.socket.remoteAddress` (`:126`).
  - `scripts/Start-Demo.ps1:28`: `cloudflared tunnel --url http://127.0.0.1:$Port`. Todo el tráfico público entra desde loopback [Leído; inferencia muy probable, no verificable sin túnel]. El puente `/live` también conecta desde 127.0.0.1 (`backend/live-bridge.mjs:18`).
  - `server.mjs:52`: tope de 90 sockets. `:128`: tope de 30 sesiones. `:224`: un socket sin sesión vive 30–40 s.
- **[Ejecutado]**
  - `relay-probes.mjs` → `sharedBucket`: 20 `join` fallidos desde un socket hacen que **otro** socket reciba `Demasiados intentos. Espera un minuto.` al hacer `create`.
  - `socketCap`: el socket 91 es rechazado.
- **Impacto:** solo de disponibilidad, sin pérdida de confidencialidad. Un mensaje cada 3 s basta para impedir crear o unir sesiones; 90 reconexiones periódicas agotan los sockets. La URL `trycloudflare` aparece en el QR, en el enlace copiado y en pantalla. Ese mismo cubo protege bien contra la fuerza bruta (ver Fortalezas).
- **Riesgo de corregir:** medio, porque toca el emparejamiento.
- **Propuesta:**
  - Contar solo los `join` fallidos, no los `create`.
  - Limitar intentos por socket (cerrar tras 3 fallos).
  - Con `TRUST_PROXY=cloudflare`, usar `CF-Connecting-IP` como clave y loopback para el puente.
  - Bajar a 10 s la vida de un socket sin sesión.
  - Prueba: `sharedBucket` como test (un atacante no bloquea a un tercero).
- **Plazo:** después del hackathon. Antes del 4-nov basta como mitigación operativa no difundir la URL; si se corrige, la variante mínima es «contar solo fallos».

#### M3 · La tolerancia a cortes de red es menor que la cola del cliente: dos guardas del relay abortan con mensajes engañosos

- **Evidencia:**
  - (a) `backend/server.mjs:120–121`: `if (++ws.messages > 80 || data.byteLength > 4096) throw new Error('Demasiados mensajes.');`. Cuenta todos los JSON, incluida la telemetría: `block_timing` por bloque (`mobile.js:126`) y `sender_metrics` por cada recibo (`mobile.js:172`).
  - (b) `server.mjs:111`: `r.samples + frame.samples > r.rate * (2 + elapsed*1.5)`. El margen inicial fijo es de 2 s, contado desde que el relay recibe el `start`.
  - Cola propia del teléfono: aborta al superar 512 KiB (`mobile.js:123`) [Estimado: 524288 / (9616 + 159) B por bloque a 48 kHz ≈ 53 bloques ≈ 5,4 s].
- **[Ejecutado, solo loopback]**
  - `relay-probes3.mjs`: cortes de subida simulados de 2, 3 y 4 s → sin abort; **4,5 s → `aborted(Demasiados mensajes.)`**.
  - `relay-probes2.mjs`: 5,2 s → mismo resultado.
  - `relay-probes.mjs` → `initialBurst2500ms`: un `start` seguido de 25 bloques juntos (equivale a un corte de 2,5 s justo al pulsar) → `aborted(Flujo de audio demasiado rápido.)`.
  - [Leído] Un corte de bajada en el PC de unos 7–10 s puede producir una ráfaga de recibos y, con ella, de `sender_metrics`, con el mismo efecto.
- **Impacto:** en 4G/5G o con internet compartido, un corte de 2 a 5 s puede abortar la toma aunque el cliente la habría tolerado. El usuario ve «Demasiados mensajes.» o «Flujo de audio demasiado rápido.», mensajes que no describen el problema real. La toma se marca como incompleta, sin éxito falso. El umbral real en red móvil no está medido: el TCP real reparte la ráfaga y podría ser mayor (o menor).
- **Riesgo de corregir:** bajo.
- **Propuesta:**
  - Excluir `block_timing`, `sender_metrics` y `receipt` del contador, o darles un presupuesto propio (p. ej. 3 por bloque aceptado).
  - Agrupar `sender_metrics` (un mensaje cada 500 ms con varios ACK).
  - Medir el margen de ritmo desde el primer bloque, o permitir una ráfaga igual a la cola del cliente (unos 6 s).
  - Prueba: barrido paramétrico de cortes de 0 a 6 s (ver Instrumentación) con criterio «ningún abort por debajo del límite de cola del cliente».
- **Plazo:** seguro antes del 4-nov ajustar las constantes y excluir la telemetría (requiere reiniciar el relay; `RUNNING.md:97–100`). Agrupar mensajes, después.

#### M4 · Una caída de WebSocket termina la sesión; la semiconexión tarda en detectarse y el teléfono sigue diciendo «Grabando y enviando»

- **Evidencia:**
  - `apps/shared/client.js:18–19`: el teléfono cierra tras más de 20 s sin `pong` y revisa cada 5 s → 20–25 s.
  - `backend/server.mjs:224–225`: ping cada 10 s → 10–20 s.
  - `server.mjs:214`: cualquier cierre ejecuta `finishSession` (sin reanudación, decisión documentada en `ARCHITECTURE.md:60`).
  - `mobile.js:157`: «Grabando y enviando al computador.» no cambia aunque dejen de llegar recibos. Solo se congela el contador «RECIBIDOS EN PC».
- **Impacto [Leído]:** en un corte silencioso de subida, el teléfono sigue mostrando que graba y envía hasta unos 5,4 s (cola de 512 KiB) y luego aborta. Después hay que volver a emparejar ambos dispositivos y preparar de nuevo el micrófono. Los mensajes finales sí son claros: «Conexión cerrada. Crea una sesión nueva en el PC.» en el teléfono (`mobile.js:191`) y «Conexión cerrada. La grabación quedó incompleta.» en el PC (`desktop.js:172`). No hay éxito falso.
- **Propuesta:**
  - Antes del 4-nov: un indicador de antigüedad del último recibo durante la toma («sin confirmación del PC hace 1,8 s», en ámbar sobre 1 s).
  - Después: un token de reanudación de 60 s que conserve la sesión, aborte solo la toma y no exija un QR nuevo.
- **Riesgo de corregir:** bajo para el indicador; alto para la reanudación.
- **Plazo:** el indicador es seguro antes del 4-nov; la reanudación, después del hackathon.

#### M5 · La sesión de 30 min vence sin aviso previo y corta la toma en curso

- **Evidencia:**
  - `backend/server.mjs:26` (`sessionTTL = 30 * 60_000`) y `:219`, revisado cada 10 s (`:216–227`).
  - El cliente nunca recibe `expires` de la sesión; `created` trae solo la expiración del emparejamiento (`:135`), y `paired` trae solo `maxSeconds` (`:71`).
- **[Ejecutado]** `relay-probes.mjs` → `sessionExpiry` (con `sessionTTL: 300`): durante una toma, el PC y el teléfono reciben solo `closed(La sesión venció. Crea una nueva.)`. El aviso llegó a los 9.950 ms, por la granularidad del temporizador. [Leído] El PC marca la toma como «⚠ Incompleta» (`desktop.js:161` → `:81`), sin éxito falso.
- **Impacto:** en una serie larga (protocolo A+B+C con exportaciones) se puede perder una toma de hasta 3 min sin advertencia previa.
- **Riesgo de corregir:** bajo.
- **Propuesta:**
  - Incluir `sessionExpires` en `paired`.
  - Mostrar el tiempo restante.
  - Impedir en el cliente iniciar una toma si quedan menos de 180 s + margen, con un mensaje explícito.
  - Test con `sessionTTL` corto.
- **Plazo:** seguro antes del 4-nov (un campo en el servidor y UI). Requiere reiniciar el relay.

### BAJO

#### B1 · Mensajes de error que tapan la causa real

- **Evidencia:** después de un `aborted` del servidor, cada bloque en vuelo genera `error(Audio fuera de una grabación activa.)` (`server.mjs:99` → `:211`). En el teléfono, `status()` (`mobile.js:182`) reemplaza el motivo útil. Además, un JSON de más de 4096 B se informa como «Demasiados mensajes.» (`server.mjs:121`).
- **[Ejecutado]** `relay-probes.mjs` → `lateChunks`: `aborted(…)` seguido de 3 `error(Audio fuera…)`. `initialBurst2500ms`: el último texto visible sería «Audio fuera de una grabación activa.».
- **Impacto:** diagnóstico confuso durante las pruebas físicas.
- **Propuesta:** en el relay, descartar sin responder los binarios cuyo `recordingId === lastRecordingId` ya abortado; en el cliente, ignorar `error` cuando no hay toma y ya se mostró un abort. Usar mensajes distintos para tamaño y frecuencia.
- **Plazo:** seguro antes del 4-nov.

#### B2 · El QR directo no confirma qué teléfono se conectó

- **Evidencia:** `server.mjs:141–142` (`if (qr) { paired(s); return; }`) y `desktop.js:148`, que solo muestra «Conectados».
- **Impacto:** quien escanee o fotografíe el QR antes que el radiólogo, dentro de los 2 min, queda como micrófono. En `/live`, su audio se transcribiría al informe. El dueño legítimo vería «Código inválido, vencido o ya utilizado.». Es una decisión documentada (`RUNNING.md:95`); el riesgo es bajo con material sintético.
- **Propuesta:** mostrar en el PC una huella pasiva del dispositivo (familia de navegador y SO) y la hora de conexión, más un botón «No soy yo: desconectar». Tras la demo, evaluar una confirmación de un toque.
- **Plazo:** después del hackathon (la huella pasiva sería segura antes).

#### B3 · El PC marca una toma verificada y la envía a ASR aunque no pudo avisar al teléfono

- **Evidencia:** `desktop.js:95–97` ignora el valor de retorno de `client.send({type:'verified',…})`; luego ejecuta `addClip(…, true)` y despacha `dicta-take`.
- **Impacto [Leído]:** el sello de integridad en el PC es verdadero, porque hash del PC = hash del relay = hash del teléfono (`server.mjs:197,204`). Pero el teléfono puede informar «Conexión cerrada» y el usuario volvería a dictar, lo que puede duplicar texto en el informe. Es poco probable.
- **Propuesta:** si el envío falla, mostrar «Verificada en PC · el teléfono no recibió la confirmación».
- **Plazo:** seguro antes del 4-nov.

#### B4 · El PC recalcula métricas y reconstruye la tabla del DOM por cada bloque y por cada `sender_metrics` (~20 veces/s)

- **Evidencia:** `desktop.js:118,131` → `renderMetrics()` → `summary()` (`metrics.js:70–77`), que ordena todas las filas.
- **[Ejecutado]** `perf.mjs`: `summary()` tarda 0,056 ms con 100 bloques, 0,286 ms con 600 y 0,929 ms con 1.800 (Node/Xeon). [Estimado] Al minuto 3 son unos 19 ms de CPU por segundo, sin contar el DOM (no medido, null).
- **Propuesta:** limitar el render a 4 por segundo con `requestAnimationFrame` y un reloj de 250 ms, y medir `renderMetricsMs`.
- **Plazo:** seguro antes del 4-nov.

#### B5 · Copias y trabajo en el hilo principal del teléfono (no es un cuello de botella)

- **Lo bien resuelto:** la conversión float→PCM16 y la mezcla a mono ocurren en el worklet (`capture-worklet.js:27–31`), con bloques de `sampleRate/10` (`:4`) transferidos sin copia (`:16`).
- **Lo que se hace en el hilo principal:**
  - `encodeChunk` escribe muestra por muestra con `DataView` (`protocol.js:12`).
  - `.slice()` copia otra vez la parte para el hash (`mobile.js:128`).
  - Hay un bucle RMS (`:129`).
  - Al detener, `joinBytes` duplica la toma completa (`protocol.js:26–28,33`).
- **[Ejecutado]** `encodeChunk` de 4.800 muestras: 0,014 ms (con `Uint8Array.set` serían 0,006 ms). SHA-256 de una toma de 3 min a 48 kHz (17.280.000 B): 38,5 ms en Node.
- **[Estimado]** El pico de memoria en el teléfono al detener una toma de 3 min es de unos 34,6 MB (partes + copia unida). En el S25 Ultra no está medido (null).
- **Propuesta:** opcional; evitar `.slice()` reutilizando la vista y hacer un hash incremental en un Worker. Medir `senderHashMs` en el dispositivo antes de decidir; ya está instrumentado.
- **Plazo:** después del hackathon.

#### B6 · El resampler Muse calcula seno y coseno por cada coeficiente en el hilo del laboratorio

- **Evidencia:** `backend/stream-audio.mjs:12–16`.
- **[Ejecutado]** `perf.mjs`: 36,98 ms de CPU por segundo de audio a 48 kHz y 44,53 ms a 44,1 kHz. Equivale a un 3,7–4,5 % de un núcleo, en bloques síncronos de unos 4 ms por cada push de 100 ms dentro del event loop del laboratorio.
- **Propuesta:** tabla polifásica precalculada. Cambia la preparación, así que hay que versionarla (`STREAM_PREPARATION`→v2) y comparar las salidas con la v1 antes de adoptarla.
- **Plazo:** después del hackathon.

#### B7 · Mensajes de sobra y sobrecosto de la telemetría

- **Evidencia:** el relay envía un `ack` por bloque (`server.mjs:106,117`) que el teléfono no consume (`mobile.js:164–184` no tiene `case 'ack'`). Por bloque se envían 3 mensajes de subida (binario + `block_timing` + `sender_metrics`) y 2 de bajada.
- **[Estimado]** Tamaños: `block_timing` 159 B, `sender_metrics` 93 B, `ack` 38 B, `receipt` 42 B, frente a 9.616 B de audio a 48 kHz. Son unos 2,6 % de bytes adicionales de subida, y la telemetría alimenta M3.
- **Propuesta:** retirar `ack` o usarlo, y documentar en `METRICS.md` mensajes y bytes por bloque.
- **Plazo:** documentar es seguro ya; cambiar el protocolo, después.

#### B8 · Cabeceras, origen y detalles menores

- **Lo que está bien [Ejecutado, `relay-probes.mjs` → `http`]:** CSP estricta, `nosniff`, `no-store`, `Referrer-Policy: no-referrer` y `Permissions-Policy` presentes.
- **Lo que falta o confunde:**
  - Falta HSTS. Si Cloudflare lo agrega, no es verificable aquí.
  - La verificación de Origin (`server.mjs:49–52`) solo protege contra páginas de navegador. Un script puede falsificar el Origin; la autenticación real es el código o token.
  - El puente acepta solo `http://127.0.0.1:<puerto>` (`live-bridge.mjs:13–14`), así que abrir `http://localhost:8789/live` falla con un genérico «No se pudo conectar con el servidor.».
  - La documentación es inconsistente: `ARCHITECTURE.md:64` dice «tres tomas», mientras `RUNNING.md:37,82` y `desktop.js:75` usan cinco.
  - [Estimado] Memoria en el PC: hasta 5 × ~17,3 MB de WAV por tomas de 3 min. En `/live` se crea un segundo Blob por toma (`desktop.js:97`), no medido.
- **Plazo:** corregir la documentación es seguro antes del 4-nov.

#### B9 · Batería y wake lock

- **Evidencia:** el wake lock se pide al preparar y su fallo se ignora en silencio (`mobile.js:144`). Mientras está «preparado», el micrófono y el `AudioContext` siguen activos y `process()` corre continuamente (`capture-worklet.js:25`). A eso se suma un ping cada 5 s (`client.js:18`). Es diseño documentado; al ocultar la página se libera todo (`mobile.js:215`).
- **Impacto:** consumo de batería no medido (null).
- **Propuesta:** avisar «La pantalla podría apagarse: mantenla encendida» cuando el wake lock falla, y hacer la medición física descrita abajo.
- **Plazo:** el aviso es seguro antes del 4-nov.

---

## Límites de toma y sesión: dónde se aplican

| Límite | Cliente | Servidor | Estado |
| --- | --- | --- | --- |
| Toma 180 s | Worklet `capture-worklet.js:34` (`total >= sampleRate*180`, con flush) y aviso en `mobile.js:87` | `server.mjs:110` (`> rate*MAX_SECONDS`) y `:109` (6000 bloques) | Coherentes [Leído; test `capture`] |
| Sesión 30 min | Ninguno | `server.mjs:26,219`, granularidad 10 s | Ver M5 [Ejecutado] |
| 100 tomas/sesión | Ninguno | `server.mjs:167` | Ver M1 [Ejecutado] |
| Emparejamiento 2 min, un uso | Cuenta regresiva `desktop.js:142` | `server.mjs:140–141,219` | OK [tests relay] |
| Cola de envío | 512 KiB `mobile.js:123` | 1 MiB hacia el PC `server.mjs:80`; 1 MiB en el puente `live-bridge.mjs:22–23` | Ver M3 |
| Sin avance 15 s | — | `server.mjs:220` | OK |

## Fortalezas verificadas

- **Sin éxito falso de integridad.** El teléfono muestra «verificado» solo tras `verified` del relay, y el relay lo emite solo si el hash del PC coincide (`server.mjs:197,203–205`). El PC compara su propio SHA-256 (`desktop.js:91–93`). Un hash incorrecto aborta [tests `relay`: «hash incorrecto nunca se marca verificado»].
- **Credenciales de emparejamiento.**
  - Token QR de 256 bits, guardado solo como hash (`server.mjs:131–132`), de un uso (`:141`) y retirado del fragmento de la URL (`mobile.js:54`).
  - Código manual de 40 bits, válido 2 min, de un uso, con confirmación de 4 cifras en el PC.
  - [Estimado] Con el cubo global de 20 intentos por minuto, acertar un código por fuerza bruta en su vigencia tiene probabilidad ~40/2⁴⁰ ≈ 4·10⁻¹¹ [tests `relay`, QR y manual].
- **Superficie HTTP mínima** [Ejecutado]. Rutas en lista blanca (`server.mjs:10–18`): `/../package.json`, `/%2e%2e/package.json`, `/apps/mobile/mobile.js`, `/.env` y `/mobile/` → 404. `POST` → 405. Origin ajeno o ausente → socket destruido.
- **Tamaño de mensaje** [Ejecutado]. Con `maxPayload` de 32768, un binario de 32.816 B cierra con 1009 y el PC recibe `closed`. Hay validación estricta de longitud y cabecera (`protocol.js:18–20`).
- **Ciclo de vida del teléfono.** Ocultar la página, `pagehide`, el fin de la pista o la suspensión del `AudioContext` abortan la toma y liberan el micrófono, sin reanudación silenciosa (`mobile.js:134–137,214–220`) [test `mobile-lifecycle`]. El worklet no conserva audio fuera de una toma [test `capture`].
- **Stale-checks correctos tras `await`:** `mobile.js:91` y `desktop.js:92`.

## Instrumentación propuesta

Cada punto con hipótesis, unidad y prueba reproducible. Toda medida ausente debe exportarse como `null`, sin rellenar.

1. **Causas de rechazo del relay** (conteo por toma: `floodLimited`, `tooFast`, `startRejected`, `lateBinaryAfterAbort`, `rateLimitedPairing`), incluidas en `aborted` y en `metrics-batch`. Prueba: convertir en tests las sondas `take101`, `lateChunks`, `initialBurst2500ms` y `sharedBucket`.
2. **Tolerancia a cortes.** Hipótesis: ninguna toma aborta con cortes menores que el límite de cola del cliente. Barrido de 0–6 s en pasos de 0,5 s, con `relay-probes3.mjs` como base y 5 repeticiones. Métrica: corte máximo tolerado (s). En red real: modo avión de 1–6 s en el S25 Ultra, con red declarada por el usuario.
3. **Latencia de captura no medida hoy.**
   - `captureToMainMs`: el worklet incluye `currentFrame` al vaciar cada bloque; el hilo principal lo relaciona con `context.getOutputTimestamp()`.
   - Exportar `context.baseLatency` y `track.getSettings().latency`, con `null` si no se informan.
   - Fin de captura→envío y primer sonido→texto siguen sin medirse. Proponer un pulso sintético con detección de flanco en el PC (mide la ruta sin micrófono) y otra prueba acústica física aparte.
4. **Detección de semiconexión:** `lastReceiptAgeMs` (máximo por toma) y, al cerrar, `lastPongAgeMs`; tiempo desde el corte forzado hasta el aviso visible, en ms.
5. **Red declarada o observada:** `navigator.connection?.effectiveType/rtt/downlink` cuando exista (Chrome Android); si no, `null` más lo que declare el usuario por separado.
6. **Sobrecosto de la telemetría.** Bandera de prueba sin `block_timing`/`sender_metrics`, con un tono sintético de 30 s, 10 tomas alternadas por variante. Medir bytes y mensajes por bloque, `stopToVerifiedMs` y `renderMetricsMs`. Criterio definido antes de comparar.
7. **Coste de render en el PC:** `renderMetricsMs` (performance.now alrededor del render) y renders por segundo; fixture con 1.800 bloques.
8. **Batería (física, no verificable aquí):** 30 min «preparado en reposo» frente a micrófono liberado, con pantalla y brillo fijos y estadísticas de batería de Android, 2 repeticiones. Resultado en %/h; `null` hasta medir.
9. **`sessionRemainingMs` al iniciar cada toma**, para correlacionar cortes por vencimiento (M5).
10. **Hash en el dispositivo:** `senderHashMs` ya existe. Reportar su distribución por duración de toma (10 s, 60 s, 180 s) en el S25 Ultra antes de decidir B5.
