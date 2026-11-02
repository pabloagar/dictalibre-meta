# Revisión técnica de Dicta Libre · 2 de noviembre de 2026

**Código revisado:** `654bed8`, rama `claude/dazzling-hamilton-k0apsq`. El único commit posterior de esta sesión (`27259ee`) agrega documentación y no toca código.

**Tipo:** revisión de **solo lectura**. No se modificó código de producto, pruebas ni historial git. Se tomó como contexto la revisión previa `CODE_REVIEW_2026-11-01.md`, y cada hallazgo de esa revisión se marca como vigente, mitigado o corregido.

**Equipo:** la revisión se dividió por roles y cada rol revisó en paralelo. El detalle completo, con fragmentos de código y comandos, está en los anexos:

| Rol | Anexo |
| --- | --- |
| Transporte/audio | [`revision/transporte.md`](revision/transporte.md) |
| Reconocimiento | [`revision/reconocimiento.md`](revision/reconocimiento.md) |
| Frontend/editor y XSS | [`revision/frontend.md`](revision/frontend.md) |
| Seguridad y privacidad (incluye historial git) | [`revision/seguridad.md`](revision/seguridad.md) |

El tech lead y QA consolidaron los anexos en este documento. Las sondas reproducibles están en [`revision/sondas/`](revision/sondas/).

**Etiquetas de evidencia:**

- **[Ejecutado]**: verificado con un comando o una prueba de concepto en este entorno.
- **[Leído]**: inferido de la lectura del código.
- **[Estimado]**: cálculo a partir de constantes.

Los datos que no se pudieron medir se registran como `null`.

## 0. Fase 0: línea base

**Entorno:** contenedor Linux en la nube, Node v22.23.4, Python 3.13.18, pnpm 11.25.0 vía corepack y 4 vCPU Xeon. Solo hay loopback hacia los servicios del proyecto.

| Comando | Resultado | Duración |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | OK (`ws` 8.22.0 y `qrcode-generator` 2.0.4) | 1 s |
| `pnpm audit` | «No known vulnerabilities found» | — |
| `node scripts/check.mjs` (`pnpm check`) | «Sintaxis JavaScript: OK» | — |
| `node --test tests/*.test.mjs` (`pnpm test`) | **76/76 aprobadas**, 0 fallidas, 0 omitidas | 1,65 s |
| `python3 -m unittest discover -s tests -p 'test_*.py'` | **5/5 aprobadas** | 0,01 s |

El total coincide con las 76 pruebas que registra la bitácora. Esto **no** confirma que las pruebas históricas se ejecutaron en ese commit; solo que hoy pasan en `654bed8`.

**No se pudo ejecutar ni verificar en la nube** (no se finge lo contrario):

| Elemento | Motivo | Consecuencia |
| --- | --- | --- |
| Muse por archivo o por streaming, y Revisor Meta | Sin credencial Meta; no se llamó a la API | El comportamiento con el proveedor real se infiere de los adaptadores y de proveedores simulados |
| Whisper large-v3 / OpenVINO | Sin GPU Intel Arc, sin modelo y sin `scipy`/`openvino` | `lab-worker.py` se probó solo con un intérprete falso (`sondas/fakepy.sh`) |
| S25 Ultra, Chrome Android, micrófono real, batería y vibración | Sin dispositivo | Las capturas móviles son emulación de Chromium de escritorio (412×915, DPR 3,5); el audio, de `--use-fake-device-for-media-stream` |
| Cloudflare Tunnel y redes 4G/5G/Wi-Fi | Sin túnel ni red externa | Las consecuencias del túnel (todas las IP como 127.0.0.1) se deducen de `scripts/Start-Demo.ps1:28` |
| Scripts PowerShell (`Start-Demo.ps1`, `Start-Lab.ps1`) | Linux sin PowerShell | Solo se leyeron |
| Referencias de GitHub no descargadas (PR, ramas borradas, forks) | Acceso solo al clon local, que **no** es superficial | El escaneo cubre las 26 confirmaciones alcanzables |

## 1. Resumen ejecutivo

| Severidad | N.º | Lo más importante |
| --- | --- | --- |
| Crítico | 1 | **C1:** «punto» o «coma» entre dos números se convierte siempre en decimal y **fabrica una cifra sin aviso** |
| Alto | 6 | Conectar el teléfono borra el informe · un `aborted` atrasado anula la toma nueva · el filtro del Revisor deja pasar cambios clínicos · el Revisor viene activado por defecto y envía plantillas de terceros a Meta · las exportaciones pueden llevar plantillas al repo público · una segunda toma en streaming rompe la conexión |
| Medio | 15 | Estados colgados o mensajes engañosos ante errores del relay y cortes de red; DoS del emparejamiento detrás del túnel; resultado vacío anunciado como incorporado; sondeo y persistencia del catálogo completo; falta `LICENSE`; sin aviso de datos sintéticos |
| Bajo | ~30 | Detalle en los anexos; resumen en la §2.4 |

**Lo que se comprobó que está bien:**

- **XSS:** no se encontró ningún XSS. Se inyectaron cargas en plantillas, texto ASR, respuestas del Revisor, errores y nombres de archivo, con 0 ejecuciones. Hay una CSP restrictiva.
- **Rutas estáticas:** están en lista blanca y los intentos de path traversal devuelven 404.
- **Origin:** se valida en el WebSocket y en el laboratorio.
- **Token QR:** 256 bits, guardado solo como hash, de un uso y con vencimiento a los 120 s.
- **Integridad:** el teléfono muestra «verificado» solo después de que el PC recalcula el SHA-256.
- **Portapapeles:** se copia texto plano y la copia se confirma solo si tuvo éxito.
- **Historial git:** no contiene secretos, audio, binarios previos a esta sesión ni contenido de las 285 plantillas.
- **Textos de la interfaz:** no afirman validación clínica, precisión ni integración con RIS/PACS.

## 2. Hallazgos por severidad

Formato: **ID · título**, seguido de evidencia, impacto, riesgo de corregirlo, propuesta y plazo. Los plazos son:

- **Antes del 4-nov:** cambio acotado, con prueba y sin alterar el comportamiento de captura, transporte o reconocimiento, salvo que se indique y se apruebe.
- **Después:** requiere más diseño, más pruebas o la aprobación del responsable.

### 2.1 Crítico

#### C1 · «punto» o «coma» entre dos números fabrica una cifra decimal sin aviso [Ejecutado]

- **Evidencia:** `backend/number-format.mjs:8` (patrón `sequence (coma|punto) sequence`) y `:17–23`. Reproducido en esta revisión:

  ```text
  «segmento ocho punto dos quistes simples» → «segmento 8,2 quistes simples»   warnings: []
  «T dos punto dos lesiones»                → «T 2,2 lesiones»                 warnings: []
  «uno punto cinco centímetros»             → «1,5 centímetros»                (caso correcto)
  ```

  La protección de decimales de `dictation-commands.mjs` nunca llega a actuar en vivo, porque el formato de números corre antes y siempre está activado. Hay 54 casos en `revision/reconocimiento.md`, sección «Tabla de casos».
- **Impacto:** se inventa una medida que nadie dictó: «ocho» y «dos» se convierten en «8,2». No queda alerta ni marca visual. Es exactamente el tipo de error (cifras) que el proyecto declara proteger.
- **Riesgo de corregirlo:** **alto**. «uno punto cinco centímetros» → `1,5` es el uso deseado y una prueba lo fija. Cualquier cambio de regla altera el reconocimiento y exige aprobación.
- **Propuesta:**
  - **Antes del 4-nov, sin cambiar la conversión:** agregar un **aviso** (`warnings: possible_sentence_boundary`) cuando el decimal no va seguido de una unidad (mm, cm, ml, %, etc.), y mostrarlo en la UI como alerta de cifra. Solo agrega una señal; requiere 4 o 5 pruebas nuevas con los casos de arriba.
  - **Alternativa mínima:** documentarlo como limitación conocida en la demo («evitar *punto* seguido de una oración que empieza con un número»).
  - **Después:** convertir a decimal solo si sigue una unidad o un contexto numérico, y validar la regla contra el conjunto de comandos ya registrado en `experiments/results/2026-10-28-dictation-commands/`.

### 2.2 Alto

#### A1 · «Conectar teléfono» borra el informe sin aviso, también el restaurado tras recargar [Ejecutado]

- **Evidencia:** `apps/desktop/desktop.js:166` dispara `dicta-new-session` y `apps/desktop/live.js:71` responde con `reportEditor.reset()`, que vacía el editor y `localStorage`. «Reiniciar sesión» (`desktop.js:183`) hace lo mismo y además recarga la página. La prueba de concepto con Playwright está en `revision/frontend.md` A1. La captura reducida está en `propuesta-ui/actual/escritorio-live-tras-conectar-vacio.png`.
- **Impacto:** si se cae el túnel o vence la sesión de 30 minutos, el médico vuelve a conectar y pierde el informe en curso. Deshacer lo recupera, pero solo en memoria: una recarga lo elimina también.
- **Riesgo de corregirlo:** bajo. Es un cambio de 1 o 2 líneas en el cliente de escritorio y no toca captura ni transporte.
- **Propuesta:** que una sesión nueva **no** reinicie el editor y limpie solo el estado de las tomas. Para vaciar el informe, que haya una acción explícita «Informe en blanco» con confirmación. Agregar la prueba «conectar no altera el informe».
- **Plazo:** **antes del 4-nov.**

#### A2 · Un `aborted` atrasado anula la toma nueva en el teléfono [Ejecutado]

> **Estado (2-nov, después de la revisión):** corregido con aprobación del responsable. `mobile.js` ignora un `aborted` con otro `id` y hay una prueba nueva en `tests/mobile-lifecycle.test.mjs`, que falló antes del cambio. Resultado: 77/77 pruebas. Falta la comprobación física en el S25.

- **Evidencia:** `apps/mobile/mobile.js:181` (`case 'aborted': abort(m.reason, false)`) no compara `m.id` con la toma en curso. El relay responde `aborted` con el id antiguo (`backend/server.mjs:162` → `:77`). Se reproduce con `node docs/revision/sondas/mobile-probes.mjs`.
- **Impacto:**
  - El teléfono cancela la toma nueva sin avisar al relay.
  - El PC queda hasta 15 s en «RECIBIENDO» una toma fantasma.
  - Se pierden 1 o 2 tomas en cascada.
- **Riesgo de corregirlo:** bajo, pero **toca la captura**: requiere tu aprobación explícita.
- **Propuesta:** ignorar `aborted` cuando `m.id !== recording?.id`, con una prueba en `tests/mobile-lifecycle.test.mjs` que reproduzca la secuencia.
- **Plazo:** **antes del 4-nov, si lo apruebas.**

#### A3 · El filtro del Revisor Meta deja pasar cambios clínicos como reemplazo de un clic [Ejecutado]

- **Evidencia:** `backend/meta-review.mjs:10` (lista `sensitiveTokens`) y `:20`. Con `node docs/revision/sondas/guard-cases.mjs`, las siguientes propuestas sintéticas quedan como reemplazo directo:
  - hipodensa → hiperdensa;
  - superior → inferior;
  - segundo arco → tercer arco;
  - dieciséis → diecisiete (la lista no incluye 16–19, 21–29, etc.);
  - benigna → maligna;
  - ausente → presente;
  - un hallazgo nuevo («Neumotórax a tensión»);
  - una negación cambiada de lugar.

  Sí se bloquean derecho/izquierdo, no/sin, T2, C5 y %.
- **Impacto:** la defensa es más débil de lo que sugiere la documentación («parcial» en META_REVIEW.md, pero se ven huecos grandes). Un clic acepta un cambio de sentido clínico.
- **Riesgo de corregirlo:** bajo si **solo se amplía la lista** de términos protegidos, porque el sistema se vuelve más conservador y genera más alertas. Es medio si se cambia la lógica.
- **Propuesta:**
  - **Antes del 4-nov, con tu aprobación:** ampliar los tokens con números cardinales completos, superior/inferior/anterior/posterior/medial/lateral, hipo/hiper*, benign*/malign*, ausen*/presen* y ordinales. Además, tratar como sensible cualquier propuesta que **agregue** una oración. Cada término nuevo lleva su caso en `tests/meta-review.test.mjs`.
  - **Después:** que `scripts/evaluate-meta-review.mjs` compare automáticamente contra `expected`.

#### A4 · El Revisor Meta está activado por defecto y envía a Meta la plantilla aplicada, también con Whisper local [Leído]

- **Evidencia:** `apps/desktop/live.js:13` (`reviewToggle.checked=true`) y `apps/lab/index.html:8`. El contexto incluye hasta 3000 caracteres de la plantilla y hasta 10 000 del informe (`backend/review-context.mjs`). Ver `revision/seguridad.md` A1 y `revision/reconocimiento.md` M7.
- **Impacto:**
  - La plantilla aplicada puede pertenecer a la colección de 285 plantillas **con permisos de redistribución pendientes**: el texto sale del equipo sin que el usuario lo haya decidido de forma explícita.
  - Con Whisper «local» igual se envía texto a Meta. La etiqueta lo dice, pero la casilla viene marcada.
- **Riesgo de corregirlo:** bajo, porque cambia un valor por defecto de la UI y no la lógica.
- **Propuesta:**
  - Que la casilla venga **desmarcada** por defecto, con un texto que diga qué se envía.
  - No incluir `templateText` en el contexto cuando la plantilla viene de la biblioteca importada; incluirlo solo si es una plantilla propia.
  - Agregar una prueba en `tests/report-review.test.mjs`.
- **Plazo:** **antes del 4-nov** el valor por defecto, que es una decisión de producto (la pregunto en la §6). La exclusión de plantillas importadas puede ir antes del 4-nov con su prueba.

#### A5 · Las exportaciones del laboratorio pueden llevar plantillas e informes al repositorio público [Leído]

- **Evidencia:**
  - `backend/lab.mjs:120`: `/api/export` vuelca `db` completo con `reviewContext`/`templateText`.
  - El flujo documentado copia exportaciones a `experiments/results/`.
  - Ni `.gitignore` ni `scripts/check.mjs` ni ningún hook lo impiden. Ver `revision/seguridad.md` A2.
- **Impacto:** un `git add experiments/` puede publicar contenido de terceros, o texto clínico si alguna vez se dicta material real.
- **Riesgo de corregirlo:** bajo.
- **Propuesta:**
  - **Antes del 4-nov:** sumar a `.gitignore` los patrones de exportación (`dicta-*.json`, `dicta-*.csv`) y los documentos (`*.docx`, `*.pdf`, `*.pptx`).
  - Agregar a `scripts/check.mjs` una verificación que falle si `experiments/**` contiene `templateText` o `reportText` con contenido.

#### A6 · Iniciar una toma en streaming mientras la anterior espera su final destruye el socket sin registro [Ejecutado con proveedor simulado]

- **Evidencia:** `backend/muse-stream.mjs:12`: `wss.clients.size>=1` lleva a `socket.destroy()` sin mensaje. `node docs/revision/sondas/stream-probe.mjs` termina con `ECONNRESET` en ese escenario, que es justamente la manifestación del hallazgo. Según los experimentos ya registrados, la ventana dura entre 1,0 y 1,7 s.
- **Impacto:** en una demo con tomas cortas seguidas, la segunda toma falla con un error genérico.
- **Riesgo de corregirlo:** medio, porque toca el reconocimiento.
- **Propuesta:**
  - **Antes del 4-nov:** pauta operativa en la demo («esperar el texto antes de la siguiente toma») y un mensaje claro en el PC si se rechaza.
  - **Después:** cola o rechazo explícito con un código y una prueba.

### 2.3 Medio

| ID | Hallazgo | Evidencia | Impacto | Propuesta | Plazo |
| --- | --- | --- | --- | --- | --- |
| M1 | Un `error` del relay sin `aborted` deja al teléfono «grabando» y después «Comprobando entrega…» indefinidamente [Ejecutado] | `mobile.js:182`; disparador `server.mjs:167` (toma 101) | Estado colgado y engañoso; el PC no recibe aviso | El relay envía `aborted` junto con el error, o el cliente aborta ante un error durante una toma; agregar prueba | Después (toca transporte) |
| M2 | El límite de 20 intentos por minuto por IP es **global** detrás del túnel [Ejecutado en loopback] | `server.mjs:85–89,126`; `Start-Demo.ps1:28` | Cualquiera con la URL bloquea el emparejamiento; topes de 90 sockets y 30 sesiones sin credencial | Antes del 4-nov: no difundir la URL. Después: usar `CF-Connecting-IP` solo si el túnel está configurado, o límite por sesión | Pauta antes; código después |
| M3 | El QR empareja sin confirmación [Leído] | `server.mjs:142` | Si el QR se proyecta en una demo, un tercero puede emparejarse antes e inyectar audio | Antes: no proyectar el QR. Después: mostrar en el PC el dispositivo conectado (con B2 de transporte) | Pauta antes |
| M4 | Los cortes de red abortan antes de lo que aguanta la cola del cliente, con mensajes engañosos («Demasiados mensajes», «Flujo de audio demasiado rápido») [Ejecutado] | `server.mjs:111,121`; cola del teléfono ≈ 5,4 s a 48 kHz | Tomas perdidas en redes móviles con mensajes que confunden; la telemetría cuenta para el límite de 80 mensajes por segundo | Excluir la telemetría del límite y alinear los márgenes; medir con cortes simulados | Después |
| M5 | Una caída del WebSocket termina la sesión; detectarla toma 10–25 s y mientras tanto se muestra «Grabando y enviando» [Ejecutado] | `revision/transporte.md` M4 | Se muestra un estado optimista durante la desconexión | Después: heartbeat más corto y estado «sin confirmación del PC» si no llegan ACK en N s | Después |
| M6 | La sesión de 30 min vence sin aviso y corta la toma en curso [Ejecutado con TTL corto] | `server.mjs:26,219` | Corte inesperado (la toma queda «Incompleta», sin éxito falso) | Enviar `expiresAt` a ambos clientes y avisar a los 2 min | Antes, si se aprueba (solo agrega un mensaje) |
| M7 | Un resultado ASR **vacío** borra la selección y anuncia «Toma incorporada»; en el backend queda `completed` [Ejecutado] | `revision/frontend.md` M1; `revision/reconocimiento.md` M1 | Se pierde texto seleccionado sin que se note | No reemplazar la selección si el texto final está vacío y mostrar «La toma no produjo texto» | **Antes del 4-nov** (editor) |
| M8 | Sondeo de `/api/state` completo cada 1,5 s en reposo y persistencia síncrona del catálogo completo [Ejecutado] | `review-ui.js`, `lab.mjs:61`; 10 peticiones en 15 s; guardado de 20–243 ms con catálogos sintéticos de 5,9–36 MB | El P1 de CODE_REVIEW está mitigado solo en parte; el P2 sigue vigente; bloqueo del bucle frente a los 20 ms de envío del streaming | Después: estado resumido y detalle bajo demanda | Después |
| M9 | Las tomas en vivo de Muse-Normal y Whisper comparten la cola FIFO con los lotes del laboratorio; cancelar Muse-Normal mata el worker de Whisper [Leído y ejecutado con intérprete falso] | `revision/reconocimiento.md` M4 | Latencia impredecible si hay lotes corriendo | Antes: pauta («no lanzar lotes mientras se dicta»). Después: cola prioritaria | Pauta antes |
| M10 | No hay aviso de «solo datos sintéticos» y el texto clínico queda en `localStorage` sin caducidad; audio y textos del laboratorio sin forma de borrarlos [Leído] | `revision/seguridad.md` M3 (casilla retirada en `e06cb23`); `revision/frontend.md` M5 | Riesgo de que se cargue material real sin advertencia | Antes: aviso fijo visible en el teléfono y el PC («Usa solo material sintético; no ingreses datos de pacientes») | **Antes del 4-nov** |
| M11 | No hay `LICENSE` para el código propio en un repo público [Leído] | Raíz; `PUBLICATION.md` lo deja pendiente | Sin licencia nadie puede reutilizarlo; ambigüedad para el jurado | Decisión del responsable (MIT, Apache-2.0 u otra) | Antes, si se decide |
| M12 | Comandos: «punto y aparte» → `. Y aparte`; la coma que inserta el propio motor rompe decimales («dos, cinco» → `2, 5`) [Ejecutado] | `revision/reconocimiento.md` M5–M6 | Formato incorrecto en frases habituales del dictado | Después, con pruebas; antes del 4-nov solo documentarlo | Después |
| M13 | El laboratorio reenvía `/api/reviews/shown` en cada nuevo render, lo que contamina la medición «mostrada tras texto» [Ejecutado] | `revision/frontend.md` M4 | Métrica sesgada; llena el tope de 10 por revisión | Enviar una vez por revisión; agregar prueba | Antes (solo instrumentación) |
| M14 | El respaldo manual (Ctrl+C) copia también `text/html` con estilos [Ejecutado] | `revision/frontend.md` M6 | Al pegar en el RIS pueden llegar estilos | Interceptar `copy` en el editor y forzar `text/plain` | Antes (editor, con prueba) |
| M15 | Se descartan los códigos de error de Muse y del proceso Python [Leído] | `revision/reconocimiento.md` M8 | Errores difíciles de diagnosticar durante la demo | Registrar código y tipo, sin cuerpo del proveedor | Después |

### 2.4 Bajo (resumen; detalle en los anexos)

- **Transporte:**
  - el QR directo no muestra qué teléfono se conectó;
  - el PC marca una toma «verificada» aunque no pudo avisar al teléfono;
  - el PC recalcula métricas y la tabla del DOM unas 20 veces por segundo (0,93 ms cada vez con 1800 bloques);
  - el resampler de Muse consume 37 ms de CPU por segundo de audio;
  - se envía un `ack` por bloque que nadie usa;
  - la telemetría suma ≈ 2,6 % de bytes;
  - el fallo del wake lock se ignora;
  - `ARCHITECTURE.md` dice 3 tomas en memoria y el código usa 5.
- **Reconocimiento:**
  - una sola propuesta inválida anula la revisión completa;
  - mayúscula forzada al inicio de cada toma, aunque se inserte a mitad de oración;
  - «uno de ellos» → «1 de ellos»;
  - formato superlineal (26 ms con 8460 caracteres);
  - la clave de Meta se guarda en texto plano en `.env.local`, fuera de Git (aceptable en un piloto local; el permiso 0600 no aplica en Windows);
  - el script de evaluación de prompt injection no compara contra lo esperado.
- **Frontend:**
  - el aviso de cuota de `localStorage` llena se sobrescribe;
  - el panel Plantillas tapa Deshacer y Revisar informe;
  - «Destino ocupado» al aceptar una propuesta junto a una toma activa;
  - `textDiff` ambiguo con texto repetido;
  - el historial de deshacer no tiene límite;
  - deshacer funciona por carácter y no hay rehacer;
  - `/live` pierde la etiqueta «PROTOTIPO» y conserva el texto obsoleto «El reconocimiento de voz aún no está integrado» (`apps/desktop/index.html`);
  - `stream-client.js` usa `ws://` fijo;
  - «Descargar WAV sintético» aparece también en tomas de voz real (`desktop.js:72`).
- **Seguridad y privacidad:**
  - `HACKATHON_LOG.md:7` muestra una ruta de Windows con el nombre de pila del usuario: reemplazarla en HEAD por `C:\Users\<usuario>\…`, **sin** reescribir el historial;
  - hay un subdominio trycloudflare vencido en la bitácora;
  - los JSON de `experiments/results` registran el hardware y el modelo del teléfono (aceptable, documentarlo);
  - el lock de Python no tiene hashes y `pypdf` no está fijado;
  - el `pip` 25.0.1 del entorno tiene CVE conocidos;
  - la imagen Docker no está fijada por digest;
  - los errores del laboratorio exponen rutas absolutas;
  - el token QR se puede copiar al portapapeles;
  - `.gitignore` no cubre los PNG de `docs/` (las capturas de esta sesión son sintéticas y se revisaron).

## 3. Rendimiento

| Medida | Valor | Tipo | Fuente |
| --- | --- | --- | --- |
| Costo por parcial de streaming en el editor (reconstrucción, persistencia y métricas) | p50 de 0,5 ms (1k caracteres) a 8 ms (50k); con 5k caracteres sube de 1,9 a 4,2 ms con 1000 eventos de métricas | Ejecutado, Chromium headless en contenedor | `revision/frontend.md` B5 |
| Guardado síncrono del catálogo del laboratorio | Mediana de 20 a 243 ms con catálogos sintéticos de 5,9 a 36 MB | Ejecutado (`sondas/save-bench.mjs`) | `revision/reconocimiento.md` M3 |
| Resampler de Muse-streaming | 37 ms de CPU por segundo de audio | Ejecutado (`sondas/perf.mjs`) | `revision/transporte.md` B6 |
| Recálculo de métricas en el PC | 0,93 ms por llamada, unas 20 por segundo | Ejecutado | `revision/transporte.md` B4 |
| Formato de comandos | 0,022 ms (141 caracteres) a 26,2 ms (8460) | Ejecutado | `revision/reconocimiento.md` B6 |
| Latencia de punta a punta en el S25 Ultra (soltar → texto consolidado) | `null` | No medible aquí | Instrumentación parcial ya existente (`stopToTextEstimateMs`) |
| Consumo de batería del teléfono por toma o por sesión | `null` | No medible aquí | Ver la instrumentación propuesta |
| Bloqueos del hilo principal del teléfono (long tasks) | `null` | No medible aquí | Ver la instrumentación propuesta |

Todas las cifras ejecutadas se midieron en un contenedor Linux. **No** representan al PC de referencia ni al S25 Ultra.

### Instrumentación propuesta

Ninguna de estas mediciones cambia el comportamiento. Cada una se registra en METRICS.md con hipótesis, unidades e intervalo antes de usarla.

1. **Long tasks del teléfono:** `PerformanceObserver({type:'longtask'})` en `mobile.js`, con conteo y duración p50/p95 por toma, incluido en la exportación de diagnóstico. Si el navegador no lo soporta, el valor queda `null`.
2. **Batería:** porcentaje de batería al inicio y al final de una sesión fija de 10 tomas de 5 s con tono sintético, medido manualmente por el usuario en el S25 (la API Battery no está disponible en todos los navegadores). Es un dato *comunicado por el usuario*, no una medida directa.
3. **Costo por parcial en el editor:** `performance.measure` alrededor de `render+persist`, con p50/p95 en la exportación de disposición. Prueba reproducible: `revision/frontend.md` B5.
4. **Mensajes por segundo y bytes de telemetría frente a audio** en el relay, con un contador por sesión que se exporta sin token. La prueba es una variante de `sondas/relay-probes3.mjs`.
5. **Tiempo de guardado del catálogo** (`save()`) como histograma en `/api/state`, para medir el efecto real en el PC de referencia.
6. **Sobrecosto de la instrumentación:** ejecutar la misma toma sintética con la telemetría activada y desactivada, 5 repeticiones alternadas. Hoy está pendiente según `METRICS.md:84`.

## 4. Mantenibilidad

- **Densidad:** los archivos son pequeños en bytes pero muy densos, con líneas de hasta **1684 columnas** en `apps/desktop/report-editor.js`, 909 en `live.js` y 790 en `apps/lab/lab.js` [Ejecutado con `awk`]. Eso hace difícil revisar los cambios y localizar los errores por línea. Propuesta para después: formatear con una herramienta automática (Prettier o Biome) **en un commit aparte que solo formatee**, sin cambios de lógica, y verificarlo con las 76 pruebas.
- **Duplicación:** `api()` está escrita 4 veces y `.report-editor` aparece 3 veces en el CSS (`revision/frontend.md` B12). Se resuelve con un módulo `apps/shared/api.js` después del hackathon.
- **JavaScript sin framework:** no es un problema por sí mismo y no se recomienda migrar. Sí convendría separar `live.js` (21 KB, orquestación, UI y métricas) en módulos por responsabilidad cuando se implemente la propuesta de interfaz.
- **Pruebas:**
  - `apps/desktop/report-editor.js`, `apps/desktop/stream-client.js` y `backend/lab-worker.py` **no tienen pruebas directas**. El modelo del editor sí está probado (`report-model.test.mjs`), pero la capa DOM no.
  - Cada hallazgo de las §2.1–2.3 indica qué prueba agregar.
  - No hay CI: las pruebas solo corren si alguien las ejecuta. Una GitHub Action con `pnpm check && pnpm test` y la prueba de Python es barata y segura.
- **Instalación reproducible:**
  - La guía depende de PowerShell y Windows (`Start-Demo.ps1`, `Start-Lab.ps1`).
  - No hay un equivalente documentado para Linux o macOS. En esta revisión el relay arrancó en Linux con `node backend/server.mjs` y el laboratorio mediante `createLab()`; `node backend/lab.mjs` directo no se probó. Además, el QR de `/live` exige `.runtime/demo.json`, que solo crea `Start-Demo.ps1` (ver `propuesta-ui/actual/NOTAS_CAPTURA.md` §2.1).
  - El lock de Python no tiene hashes.
- **Licencia:** falta `LICENSE` (M11). `THIRD_PARTY.md` documenta bien las licencias de terceros.
- **Documentación:** hay mucha documentación histórica y algunos textos desactualizados: `ARCHITECTURE.md` (3 tomas en vez de 5) y el texto estático del receptor.

## 5. Honestidad del producto

- **Sin afirmaciones indebidas:** no se encontraron textos en la interfaz que afirmen validación clínica, precisión, «seguro» ni integración con RIS/PACS (`revision/frontend.md`, «Textos de producto revisados»).
- **Textos que conviene corregir:**
  - `/live` (servido desde `apps/desktop/index.html`) perdió la marca «PROTOTIPO». Además conserva el texto estático «El reconocimiento de voz aún no está integrado» y la etiqueta «RECONOCIMIENTO PENDIENTE», que **contradicen** la función actual cuando se ven.
  - El teléfono dice «✓ El PC recibió exactamente el mismo audio». Es correcto (hash), pero conviene agregar que eso no garantiza el texto.
  - El Revisor activado por defecto (A4) hace que «local» no signifique local en todas las etapas. Hay que hacerlo visible.
- **Contraste:** el color `--muted` actual (`#67766e` sobre `#f5f4ee`) da **4,34:1**. No cumple AA para texto normal y se usa en textos informativos de 12–13 px (`docs/propuesta-ui/contraste.py`).

## 6. Decisiones que necesito de ti

Son en orden de urgencia y te las haré de a una:

1. ~~¿Apruebas tocar `mobile.js` para ignorar `aborted` de otra toma (A2)?~~ Aprobado e implementado.
2. ¿El Revisor Meta debe venir **desactivado** por defecto (A4)?
3. ¿Apruebas ampliar los términos protegidos del Revisor (A3)? Lo hace más conservador.
4. ¿Qué licencia quieres para el código propio (M11)?

## 7. Lista priorizada para la sesión 2

**Seguros antes del 4-nov.** Son cambios acotados, cada uno con prueba, y no alteran captura, transporte ni reconocimiento salvo donde se indica la aprobación:

| # | Cambio | Hallazgo | Toca | Prueba |
| --- | --- | --- | --- | --- |
| 1 | Que conectar o reiniciar la sesión **no** borre el informe | A1 | `live.js` / `desktop.js` | Nueva: «conectar no altera el informe» |
| 2 | Resultado vacío: no reemplazar la selección y avisar «La toma no produjo texto» | M7 | Editor | Nueva en `report-model`/`live` |
| 3 | Aviso fijo «solo material sintético» en el teléfono y el PC | M10 | HTML | Captura antes y después |
| 4 | `.gitignore` para exportaciones y documentos, y verificación de `templateText` en `scripts/check.mjs` | A5 | Repo | `pnpm check` con un caso positivo sintético |
| 5 | Excluir `templateText` de las plantillas importadas del contexto enviado a Meta | A4 | `review-context` | Nueva en `report-review.test.mjs` |
| 6 | Aviso (sin cambiar la conversión) cuando «punto»/«coma» produce un decimal sin unidad | C1 | `number-format` (solo `warnings`) | 4 o 5 casos nuevos |
| 7 | Restaurar la marca «Prototipo de investigación» en `/live` y quitar los textos obsoletos | §5 | HTML | Captura |
| 8 | Forzar `text/plain` en la copia manual | M14 | Editor | PoC de Playwright como prueba |
| 9 | Enviar `/api/reviews/shown` una vez por revisión | M13 | Laboratorio | Nueva |
| 10 | Reemplazar en HEAD la ruta de Windows con el nombre de pila | §2.4 | `HACKATHON_LOG.md` | — |
| 11 | ~~Ignorar `aborted` de otra toma~~ **Hecho el 2-nov** con aprobación del responsable | A2 | **Captura** | `mobile-lifecycle` (77/77) |
| 12 | **Con tu aprobación:** ampliar los términos protegidos del Revisor | A3 | Revisor | Un caso por término |
| 13 | **Con tu decisión:** Revisor desactivado por defecto; agregar `LICENSE` | A4, M11 | UI / repo | — |
| 14 | Pautas de demo en RUNNING.md: no proyectar el QR ni difundir la URL; esperar el texto antes de la siguiente toma; no lanzar lotes mientras se dicta; evitar «punto» seguido de un número | M2, M3, A6, M9, C1 | Docs | — |
| 15 | Mejoras de UI de bajo riesgo de `PROPUESTA_UI.md` §9 (solo CSS/HTML del móvil, tema oscuro y contraste de `--muted`) | — | CSS | Capturas y contraste |

**Mejor después del hackathon.** Requieren diseño, más pruebas o tocar el núcleo:

1. Regla de decimales que dependa de la unidad o el contexto (C1).
2. Cola o rechazo explícito de una segunda toma en streaming (A6).
3. Estados de error del relay, cortes de red y heartbeat (M1, M4, M5); aviso de vencimiento de la sesión (M6).
4. Límite de intentos detrás del túnel; QR con confirmación del dispositivo (M2, M3).
5. Estado resumido en `/api/state` y persistencia incremental (M8); cola prioritaria para tomas en vivo (M9).
6. Comandos «punto y aparte» y comas del ASR (M12); diagnósticos de errores del proveedor (M15).
7. Formateo automático del código, módulo `api.js` común, CI con GitHub Actions y pruebas DOM del editor (§4).
8. Implementar la dirección de diseño elegida en `PROPUESTA_UI.md`.
9. Instrumentación de long tasks, batería y sobrecosto (§3).
