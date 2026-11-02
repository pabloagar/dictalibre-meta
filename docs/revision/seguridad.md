# Revisión de seguridad y privacidad · Dicta Libre (dictalibre-meta)

Fecha: 2026-11-02 (America/Santiago). Revisión **solo lectura** sobre el clon local `/home/user/dictalibre-meta`. No se modificaron archivos del repositorio ni el historial git. Los scripts y salidas temporales quedaron en el scratchpad (`docs/revision/`).

- HEAD revisado: `654bed86c05046546db7691103f1f248c13e57d2` (ramas locales `claude/dazzling-hamilton-k0apsq` y `codex/capture-transport`, y sus remotas, apuntan al mismo commit).
- `git rev-parse --is-shallow-repository` → `false`: el clon **no es superficial**. 26 commits, 436 objetos, sin tags, sin notes, sin objetos inalcanzables (`git fsck --unreachable` sin salida).
- En el árbol de trabajo hay archivos sin seguimiento (`docs/CONTEXTO_COMPLETO.md`, `CLAUDE.md`) que no son parte del historial; `docs/CONTEXTO_COMPLETO.md` se escaneó y no contiene secretos ni identificadores.

Leyenda: **[V]** verificado (comando, prueba o lectura directa del código); **[I]** inferido (deducción razonable no comprobada en ejecución real); **[U]** información comunicada en la documentación del proyecto.

---

## Resumen ejecutivo

- **Crítico: ninguno.** No se encontraron secretos, claves de Meta, archivos `.env`, `.pem`, audio, binarios ni contenido de las 285 plantillas en ningún commit alcanzable de las ramas locales [V]. Ningún archivo fue borrado del historial: todos los paths que existieron alguna vez siguen en HEAD, y todos son de texto [V].
- **Alto (2):** (A1) el Revisor Meta viene **activado por defecto** y envía a Meta el texto de la toma, el informe previo y hasta 3000 caracteres de la **plantilla aplicada**, también cuando se usa Whisper local; eso incluye contenido de la colección cuyos permisos siguen pendientes. (A2) Las **exportaciones del laboratorio** incluyen ese contexto de plantilla e informe, y el flujo documentado consiste en copiar exportaciones a `experiments/results/`. Ningún filtro ni regla de `.gitignore` lo impide.
- **Medio (4):** el rate limit por IP lo comparten todos los clientes detrás de cloudflared, lo que permite bloquear el emparejamiento; el QR empareja sin confirmación, un riesgo si se proyecta en la demo; no hay aviso de "no usar datos de pacientes" en la UI (la casilla se retiró en `e06cb23`) y el audio y el texto se guardan indefinidamente sin opción de borrado; no hay `LICENSE`.
- **Bajo (8):** la ruta `C:\Users\<nombre de pila>\OneDrive\...` aparece en `HACKATHON_LOG.md:7`, subdominio trycloudflare vencido, vacíos de `.gitignore`/`.dockerignore`, lock Python sin hashes, `pip` 25.0.1 con CVE en el entorno del laboratorio, imagen Docker sin digest, laboratorio sin autenticación frente a procesos locales y errores que exponen rutas, `node.exe` de respaldo sin verificar y token QR en el portapapeles.

---

## Hallazgos por severidad

### CRÍTICO

Ninguno. Ver la sección "Escaneo del historial" para el detalle de lo que se buscó y sus límites.

---

### ALTO

#### A1 · El Revisor Meta, activado por defecto, envía la plantilla y el informe a Meta, incluso con Whisper local
- **Evidencia [V]:**
  - `apps/desktop/live.js:13`: `reviewToggle.checked=true` con la etiqueta «Revisor Meta al terminar cada toma (envía toma, contexto del informe y plantilla a Meta)».
  - `apps/lab/index.html:8`: `<input id="review-enabled" type="checkbox" checked>` («envía texto a Meta, también con Whisper local»).
  - `backend/review-context.mjs:5`: el contexto admite `templateName` (200), `templateCategory` (200), `templateText` (3000) y `reportText` (10000).
  - `apps/desktop/report-editor.js:10`: el contexto se arma desde `activeTemplate` (que puede ser una plantilla de la biblioteca importada servida por `/api/templates`, `backend/lab.mjs:112`).
  - `backend/meta-review.mjs:27,44`: `JSON.stringify(input)` con `originalText`, `formattedText`, `keywords` y `context` va a `https://api.meta.ai/v1/chat/completions`.
  - `THIRD_PARTY.md:79` y `TEMPLATE_LIBRARY.md:3`: la colección es de terceros («PLANTILLAS GENERALES PUC») y sus «permisos de redistribución no [están] acreditados».
  - `THIRD_PARTY.md` (sección Revisor, 29-10): «retención y condiciones de cuenta/concurso siguen pendientes de verificación».
- **Impacto:** cuando el usuario elige un motor local, puede creer que nada sale del equipo, pero el texto, el informe y la plantilla salen igual hacia un tercero. Procesar en una API externa un contenido de terceros sin permiso acreditado es un riesgo de licencia y confidencialidad distinto de la redistribución en Git. Si alguna vez se dicta un dato real, sale por defecto.
- **Riesgo de corregir:** bajo. Cambiar el valor por defecto a `false` en dos lugares no afecta los protocolos ya registrados. Los experimentos que suponen la revisión activa deben marcarla explícitamente.
- **Propuesta:** (1) dejar `checked=false` por defecto en `live.js:13` y `apps/lab/index.html:8`; (2) no adjuntar `templateText` cuando la plantilla provenga de la biblioteca importada (marcar el origen `importada`/`propia`) mientras falten los permisos, o pedir una confirmación explícita; (3) registrar en METRICS/EXPERIMENTS que el cambio de valor por defecto altera la condición de las series.
- **Plazo:** el valor por defecto y la exclusión de `templateText` importado son **seguros antes del 4-nov**. La confirmación por sesión, **después del hackathon**.

#### A2 · Las exportaciones del laboratorio arrastran contexto de plantilla e informe hacia `experiments/results/` sin ningún filtro
- **Evidencia [V]:**
  - `backend/lab.mjs:120`: `/api/export` devuelve `{...db}` completo, con `reviews[].input.context.templateText` y `reportText` (`backend/meta-review.mjs:44,52`), `reviews[].baseText`, `reviewDocuments`, `audios[].name` (nombre de archivo original, `lab.mjs:131`) y `references[].text`.
  - `git check-ignore -v --no-index` devuelve **NO IGNORADO** para `experiments/results/new/catalog.json`, `dicta-lab.json`, `dicta-revisiones.csv`, `data/templates/x.docx`, `templates/x.json`, `x.docx`, `x.pdf`.
  - `PUBLICATION.md`: «Las exportaciones del laboratorio pueden contener transcripciones: no deben añadirse automáticamente al repositorio», un control solo manual. `scripts/check.mjs` solo comprueba la sintaxis JS, no hay hooks (`.git/hooks` solo trae los `.sample`) ni CI (`.github` no existe).
  - Estado actual [V]: ninguno de los 17 JSON de `experiments/` contiene `templateText`/`reportText` con contenido (`grep -nE '^\+.*"(templateText|reportText)"\s*:\s*"[^"]'` sobre todo el historial no arrojó coincidencias).
- **Impacto:** el riesgo es latente pero el camino es corto. Una sola exportación copiada a `experiments/results/` después de usar la biblioteca publicaría fragmentos de plantillas sin permiso, y textos de informe, en un repositorio público. Borrarlo después exige reescribir el historial, y GitHub conserva cachés y forks.
- **Riesgo de corregir:** bajo si se hace como guardia externa (script de verificación o hook opcional) sin tocar el formato de exportación. Cambiar el formato de `/api/export` afectaría a los análisis que esperan el esquema actual.
- **Propuesta:** (1) añadir a `scripts/check.mjs` o a un `scripts/check-public.mjs` un escaneo de `experiments/**` que falle si encuentra claves `templateText`/`reportText`/`baseText` no vacías, nombres de audio no sintéticos o coincidencias de hash con `data/local/templates/catalog.json` (cuando exista localmente); (2) agregar al `.gitignore` `dicta-lab*.json`, `dicta-lab*.csv`, `dicta-revisiones*.csv`, `*.docx`, `*.doc`, `*.rtf`, `*.pdf`, `*.ppt*`; (3) ofrecer una exportación "publicable" que omita `reviews[].input.context` y `reviewDocuments`.
- **Plazo:** (2) y la guardia (1) son **seguras antes del 4-nov** porque no tocan la funcionalidad. La exportación publicable (3), **después del hackathon**.

---

### MEDIO

#### M1 · Detrás de cloudflared, el rate limit "por IP" lo comparten todos: cualquiera con la URL puede bloquear el emparejamiento
- **Evidencia:**
  - [V] `backend/server.mjs:85-89` (`limit(ip)`: 20 mensajes por minuto antes de tener sesión) y `:126` (`limit(req.socket.remoteAddress)`).
  - [V] Prueba local (`wsprobe.mjs`, relay en 127.0.0.1:18787): 25 `join` desde un cliente dieron 20 «Código inválido» y 5 «Demasiados intentos». Un **segundo cliente** de la misma IP recibió de inmediato «Demasiados intentos. Espera un minuto.» al intentar `create`.
  - [I, alta confianza] `scripts/Start-Demo.ps1:28` lanza `cloudflared tunnel --url http://127.0.0.1:$Port`, así que el relay ve todas las conexiones públicas como `127.0.0.1`. No se probó contra un túnel real.
  - [V] Otros límites globales: 90 clientes WS (`server.mjs:52`), 30 sesiones (`:26`). Los clientes sin sesión se cierran a los 30 s (`:224`).
- **Impacto:** disponibilidad de la demo. Un tercero que conozca la URL pública (por ejemplo, la vio proyectada) puede, con ~20 mensajes por minuto, impedir que el PC cree sesiones y que el teléfono se una. La fuerza bruta del código manual sigue siendo inviable (ver M2).
- **Riesgo de corregir:** medio. Usar `CF-Connecting-IP` solo es seguro si el relay escucha exclusivamente en loopback y solo cloudflared lo alcanza (hoy `HOST=127.0.0.1` en `Start-Demo.ps1:39`). Con `HOST=0.0.0.0` (Dockerfile, `RUNNING.md:62`) la cabecera sería falsificable. Cambiarlo dos días antes de la demo puede introducir regresiones.
- **Propuesta:** después del hackathon, separar los cubos `create` y `join`, tomar como clave `CF-Connecting-IP` solo cuando `remoteAddress` sea loopback y `PUBLIC_ORIGIN` esté definido, y añadir pruebas. Antes del 4-nov: no difundir la URL pública, crear un túnel nuevo justo antes de la demo y tener a mano `scripts/Restart-Relay.ps1`.
- **Plazo:** la mitigación operativa es **segura antes del 4-nov**. El cambio de código, **después del hackathon**.

#### M2 · El QR empareja sin confirmación: si se ve en pantalla, un tercero puede adelantarse e inyectar audio
- **Evidencia [V]:**
  - `backend/server.mjs:142`: `if (qr) { paired(s); return; }`, sin el paso `approve`.
  - `apps/desktop/desktop.js:135-136`: el QR codifica `${mobileOrigin}/mobile#qr=<token>`.
  - Controles correctos [V]: token de 32 bytes aleatorios (256 bits, `server.mjs:131`) guardado solo como SHA-256 (`:132`), de un solo uso (`:141` borra el código y el token), vencimiento a los 120 s (`:25,140`), en el *fragmento* (no se envía al servidor) y borrado de la barra con `history.replaceState` (`apps/mobile/mobile.js:51-54`), con `Referrer-Policy: no-referrer` en ambos servidores (`server.mjs:29`, `lab.mjs:103`). El código manual tiene 5 bytes, es decir 10 hex o 40 bits (`server.mjs:130`), y exige comparar un número de 4 cifras en el PC (`:143-145`, `:150`). Ese número es una verificación visual, no un secreto que se tipee, así que su fuerza bruta no aplica.
  - [I] Cálculo: con 20 intentos/min (global, ver M1), 120 s de vida y como máximo 30 códigos activos, la probabilidad de acertar un código manual es del orden de 40·30/2⁴⁰ ≈ 1·10⁻⁹ por ventana.
- **Impacto:** si el QR se proyecta, se comparte en una videollamada o queda grabado en un video de la demo mientras sigue vigente (120 s), cualquiera que lo escanee primero queda emparejado sin confirmación. Puede enviar audio al receptor, que lo transcribe, lo inserta en el editor y, según el motor, lo envía a Meta. El teléfono legítimo queda fuera porque el token es de un solo uso. El problema es visible para el usuario, pero ocurre en vivo.
- **Riesgo de corregir:** bajo para la mitigación operativa. Medio si se cambia el protocolo (exigir confirmación también con QR añade un paso a la demo y afecta las métricas `requestToPairedMs`).
- **Propuesta:** antes del 4-nov, en la demo **no proyectar el QR** (escanearlo fuera de cámara) o usar el código manual con confirmación del número. Si queda tiempo, ofrecer un modo "presentación" que oculte el QR. Después del hackathon, evaluar la confirmación opcional también para QR.
- **Plazo:** la mitigación operativa es **segura antes del 4-nov**. El cambio de protocolo, **después del hackathon**.

#### M3 · No hay aviso en la UI de "solo datos sintéticos" (la casilla se retiró) y el audio y el texto se guardan indefinidamente sin borrado
- **Evidencia:**
  - [V] El commit `e19577f` introdujo «Usaré solo dictados sintéticos, sin datos de pacientes» (casilla obligatoria antes de crear o unirse). El commit `e06cb23` la eliminó de `apps/mobile/index.html` y `apps/desktop/index.html`. En HEAD no hay rastro (`git grep consent HEAD -- apps` vacío). [U] `HACKATHON_LOG.md:42`: «Por solicitud del responsable se retiró la casilla de uso sintético».
  - [V] En HEAD, `apps/` no contiene «paciente» en ningún texto de la UI. La vista móvil no indica que, con Muse, el audio termina en Meta (solo «Grabando y enviando al computador», `apps/mobile/mobile.js:157`). Las advertencias existen en `README.md:68`, `RUNNING.md:83` y en el mensaje de consola del relay (`server.mjs:240`), que el usuario final no ve.
  - [V] Persistencia: `backend/lab.mjs:132,190,193` escriben los WAV originales y derivados en `data/local/lab/{audio,derived}`, y `:62` guarda el catálogo completo con transcripciones, referencias y revisiones. No hay ruta de borrado: el laboratorio solo admite GET/POST y ninguna ruta elimina datos (`lab.mjs:107-177`). El informe y las plantillas propias quedan en `localStorage` del origen local (`docs/CONTEXTO_COMPLETO.md`, sección 8).
  - [V] Lo que sale a Meta: audio WAV 16 kHz por toma (`lab.mjs:48-52`), PCM 24 kHz en streaming mientras se habla (`backend/muse-stream.mjs:61-63`, `:40`), el glosario (`keywords`) en ambos casos, y el texto, el contexto y la plantilla en el revisor (A1). La UI del PC lo advierte para el motor elegido (`apps/desktop/live.js:24`, `apps/lab/index.html:8`, `apps/desktop/report-review.js:8`). El audio de la demo además pasa por Cloudflare (`THIRD_PARTY.md`, `RUNNING.md:83`).
- **Impacto:** un profesional de salud que use la demo con un caso real no recibe ninguna advertencia, ni en el teléfono ni en el PC, de que no debe hacerlo. El audio, la voz y el texto quedarían en disco sin cifrar y sin una vía de eliminación, y podrían haber salido a Meta y Cloudflare.
- **Riesgo de corregir:** bajo para un texto fijo de advertencia, porque no cambia el flujo ni las métricas. Restituir la casilla obligatoria cambia el flujo de emparejamiento y fue retirada a pedido del responsable, así que la decisión es suya.
- **Propuesta:** antes del 4-nov, una línea fija y visible en `/mobile` y `/live`: «Prototipo: usar solo dictados sintéticos. Con Muse, el audio se envía a Meta; el revisor envía texto y plantilla». Después, una política de retención y un botón de borrado por audio o ejecución, con registro en METRICS.
- **Plazo:** el aviso es **seguro antes del 4-nov**. Retención y borrado, **después del hackathon**.

#### M4 · Repositorio público sin `LICENSE` para el código propio
- **Evidencia [V]:** no existe `LICENSE*` ni `COPYING*` en la raíz. `PUBLICATION.md:29`: «Licencia del código propio pendiente… Repositorio público no equivale a otorgar una licencia abierta». `THIRD_PARTY.md` describe las licencias de terceros: ws y qrcode-generator (MIT), cloudflared (Apache-2.0), OpenVINO/GenAI/Tokenizers (Apache-2.0), Whisper large-v3 (MIT, conversión OpenVINO con ficha Apache-2.0, revisión `220761e6…`), NumPy/SciPy (BSD-3-Clause), huggingface_hub (Apache-2.0), y Muse Voice Transcribe y Muse Spark como servicios propietarios con términos, retención y cuota «pendientes de verificar». Las licencias Llama se mencionan para modelos candidatos no usados. La voz Windows Helena no se redistribuye. La colección de plantillas tiene «permisos de redistribución no acreditados» y no está en el repositorio. Sobre el glosario solo hay una indicación genérica de «registrar licencias de datasets/glosarios de manera independiente» (`THIRD_PARTY.md:50`). [V] El glosario lo ingresa el usuario y vive en el catálogo local (`backend/lab-core.mjs:40-41`), y no hay ningún glosario commiteado.
- **Impacto:** sin una licencia, terceros (jurado incluido) no tienen derecho legal de reutilizar el código. Si las bases del concurso exigen una licencia abierta, podría haber un incumplimiento. [U] El enlace a las reglas/waiver no pudo consultarse.
- **Riesgo de corregir:** ninguno técnico. Es una decisión legal del responsable y, una vez publicada, no es revocable para las copias ya obtenidas.
- **Propuesta:** contrastar las reglas aceptadas y elegir una licencia (por ejemplo MIT o Apache-2.0) o declarar explícitamente "todos los derechos reservados". Añadir `NOTICE` con las atribuciones de Whisper y OpenVINO si se distribuye algo de eso.
- **Plazo:** **antes del 4-nov** si las bases lo exigen. Es una decisión del responsable, no un cambio de código.

---

### BAJO

#### B1 · Identificadores personales menores en el contenido del historial (siguen en HEAD)
- **Evidencia [V]:**
  - `HACKATHON_LOG.md:7`, introducido en `e19577f`: ruta `C:\Users\<nombre de pila>\OneDrive\Documentos\ChatGPT\DictaLibre Meta IA` (nombre de usuario de Windows y estructura de carpetas).
  - Metadatos de los 26 commits: autor y committer `pabloagar <p…@gmail.com>`, correo personal [V]. Es el comportamiento normal de git, pero queda público.
  - `experiments/results/*/` (`2026-10-28-live-whisper/runs.json:48-51,70`, `2026-10-28-meta-auth/*.json`): CPU «Intel Core Ultra 7 155H», iGPU Arc, RAM 33 752 997 888 B, `osRelease` 10.0.26200, Node v24.19.0. `2026-10-28-4g-phone-wifi-pc/manifest.json:7`: modelo de teléfono «S25 Ultra». No hay IPs distintas de 127.0.0.1/0.0.0.0, user agents, hostnames, IDs de dispositivo, correos ni RUT [V]. Los UUID de audio, sesión y ejecución son aleatorios.
  - `CODE_REVIEW_2026-11-01.md:61`: contexto de ubicación comunicado («ruido de aeropuerto»).
  - `TEMPLATE_LIBRARY.md:3` y `THIRD_PARTY.md:79` nombran la institución de origen de las plantillas y la ubicación local («Escritorio»).
- **Impacto:** bajo. Revelan el nombre de pila, el correo y el equipo del autor, que en parte ya son públicos por la cuenta de GitHub. Nombrar la institución puede ser sensible mientras falten los permisos.
- **Riesgo de corregir:** editar HEAD es trivial. Quitarlo del historial exige reescribirlo (`git filter-repo`) y hacer *force-push*, lo que rompe la trazabilidad commit→medición que el proyecto documenta (los `build` en los JSON referencian SHA) y no elimina copias ya clonadas.
- **Propuesta:** antes del 4-nov, como mucho, reemplazar en HEAD la ruta por `C:\Users\<usuario>\…`. **No** reescribir el historial. Evaluar con el responsable si mencionar la institución requiere su autorización.
- **Plazo:** el cambio en HEAD es **seguro antes del 4-nov**. No se recomienda reescribir el historial.

#### B2 · Subdominio de Quick Tunnel vencido en la bitácora
- **Evidencia [V]:** `HACKATHON_LOG.md:178,185`, introducido en `b906676`, en HEAD: un subdominio `<4 palabras>.trycloudflare.com`. No contiene token, credencial ni ruta. La misma bitácora registra que ya no existía (ENOTFOUND, «Tunnel not found»). Los tokens QR nunca se escriben en la bitácora [V] (`grep 'token=|#qr='` sin resultados).
- **Impacto:** prácticamente nulo. Los Quick Tunnels no se reutilizan. Sirve de recordatorio para no publicar la URL **vigente** antes de la demo (ver M1).
- **Propuesta:** ninguna acción en el historial. No registrar en documentos públicos la URL activa durante el concurso.
- **Plazo:** n/a.

#### B3 · Vacíos en `.gitignore` y `.dockerignore`
- **Evidencia [V]** (`git check-ignore -v --no-index`):
  - Cubiertos: `.env`, `.env.local` (`.gitignore:2-3`), `.runtime/demo.json` y los logs (`:47`), `.tools/cloudflared.exe` (`:46`), `data/local/lab/{catalog.json,audio,derived,reports}`, `data/local/templates/{catalog,inventory}.json`, `*.pdf.txt`, `history/`, `data/local/audits` (`:22`), `data/private/` (`:21`), `models/…` (`:23`), `.venv/` (`:9`), `*.wav` (`:27`), `__pycache__/`.
  - La clave de Meta se escribe en `.env.local` en la raíz (`backend/lab.mjs:58` `keyFile`, `backend/meta-key.mjs:14`, modo 0o600, que en Windows no tiene efecto) y queda cubierta por `.env.*`.
  - **No cubiertos:** `data/templates/`, `data/plantillas/`, `templates/` (cualquier salida de `import-templates.py` fuera de `data/local/`, porque el script acepta el destino como argumento, `scripts/import-templates.py:119`), `*.docx`, `*.doc`, `*.pdf`, `*.pptx`, `*.rtf`, las exportaciones `dicta-lab.json`, `dicta-lab.csv`, `dicta-revisiones.csv`, `dicta-metricas-ultimas-5.json` y `dicta-emparejamiento.json`, la exportación móvil con `navigator.userAgent` (`apps/mobile/mobile.js:48`), y `*.p12`, `*.pfx`, `id_rsa*`, `credentials.json`.
  - `.dockerignore` excluye `.env*`, `.runtime`, `.tools` y `data`, pero no `models/` (~3,1 GB según `CODE_REVIEW_2026-11-01.md`), `.venv/`, `experiments/` ni `*.wav` fuera de `data`. Como el `Dockerfile` solo hace `COPY` de `package.json`, `pnpm-lock.yaml`, `apps` y `backend`, esos archivos no terminan en la imagen [V], pero sí se envían al demonio Docker como contexto de build [I].
- **Impacto:** un `git add .` descuidado podría incluir una plantilla o una exportación.
- **Riesgo de corregir:** muy bajo. Añadir patrones no altera nada versionado (`git ls-files` no contiene esas extensiones).
- **Propuesta:** agregar a `.gitignore` `data/*` con `!data/synthetic/` (o al menos `data/templates/` y `templates/`), las extensiones de documentos ofimáticos, `dicta-*.json`/`dicta-*.csv` en la raíz, `mobile-lifecycle*.json`, `*.p12`, `*.pfx` e `id_rsa*`. Agregar a `.dockerignore` `models`, `.venv`, `experiments`, `tests`, `*.wav` y `scripts/__pycache__`.
- **Plazo:** **seguro antes del 4-nov**.

#### B4 · Cadena de suministro: lock Python sin hashes, `pypdf` no fijado, `pip` vulnerable en el entorno, imagen sin digest
- **Evidencia:**
  - [V] `requirements-lab.lock.txt`: 22 paquetes con `==` pero sin `--hash` (no hay `--require-hashes`). `pypdf`, que usa `scripts/import-templates.py:85`, no está en el lock (`TEMPLATE_LIBRARY.md`: se usó «Python del runtime de documentos»).
  - [V] El campo `vulnerabilities` de PyPI (JSON por versión, consultado el 2026-11-02) no reporta vulnerabilidades para ninguna de las 22 versiones del lock: anyio 4.15.1, click 8.5.0, colorama 0.4.6, filelock 4.2.4, fsspec 2026.9.0, h11 0.16.0, hf-xet 1.7.1, httpcore2 2.16.0, httpx2 2.16.0, huggingface_hub 2.3.0, idna 3.20, numpy 2.5.4, openvino 2026.4.1, openvino-genai 2026.4.1.0, openvino-telemetry 2025.2.0, openvino-tokenizers 2026.4.1.0, packaging 26.3, PyYAML 6.0.3, scipy 1.18.1, tqdm 4.70.1, truststore 0.10.5, typing_extensions 4.16.0. No pude usar OSV directamente (el proxy rechazó `api.osv.dev`). PyPI no cubre necesariamente todos los avisos.
  - [V] `experiments/lab-dependencies.json` registra `pip 25.0.1` en el venv. PyPI lista para esa versión CVE-2025-8869 (corregida en 25.3), CVE-2026-1703 (26.0), CVE-2026-3219 y CVE-2026-6357 (26.1), CVE-2026-8643 (26.1.2) y CVE-2026-13346 (26.2). Afectan a la instalación de paquetes, no al runtime del laboratorio.
  - [V] `httpx2`/`httpcore2`: nombres poco habituales. Sus metadatos de PyPI apuntan a `github.com/pydantic/httpx2`, con Tom Christie como autor declarado. No verifiqué la titularidad más allá de eso.
  - [V] Node: `ws@8.22.0` y `qrcode-generator@2.0.4`, fijados con integridad sha512 en `pnpm-lock.yaml`. El endpoint de avisos masivos del registro npm devolvió `{}` (sin avisos), en línea con el `pnpm audit` previo (0).
  - [V] `Dockerfile:1`: `node:24-alpine` sin digest. `:4` fija `pnpm@11.25.0` con `--frozen-lockfile`.
  - [V] `scripts/Start-Demo.ps1:19,22,24`: cloudflared 2026.10.5 desde el release oficial de GitHub, con **SHA-256 fijado y verificado antes de ejecutar** (lanza excepción si no coincide, y también verifica un binario ya presente). No contrasté que el hash fijado (`db4e4c41…`) coincida con el publicado por Cloudflare, porque el script lo fija pero yo no descargué el binario.
  - [V] El modelo se fija por revisión (`scripts/download-lab-model.py:7`) sin código remoto. El worker usa `HF_HUB_OFFLINE=1` y `DO_NOT_TRACK=1` (`backend/lab-worker.py:3-4`).
- **Impacto:** bajo para la demo. Sin hashes, un compromiso del índice o un *typosquat* al reinstalar no se detectaría.
- **Riesgo de corregir:** regenerar el lock con hashes (`pip-compile --generate-hashes` o `pip freeze` + `pip hash`) puede requerir resolver wheels por plataforma (Windows). Actualizar `pip` en el venv tiene riesgo bajo.
- **Propuesta:** después del hackathon, un lock con hashes que incluya `pypdf`, `pip>=26.2` en el venv y una imagen Docker fijada por digest.
- **Plazo:** **después del hackathon**. Actualizar `pip` en el venv sería seguro antes, pero no es necesario para la demo.

#### B5 · El laboratorio no se autentica frente a otros procesos locales y sus errores exponen rutas absolutas
- **Evidencia [V]** (laboratorio arrancado con `createLab` y directorios del scratchpad, puerto 18789):
  - Escucha solo en `127.0.0.1` (`backend/lab.mjs:207`). `Host` debe ser exactamente `127.0.0.1:<puerto>` (`:106`): `Host: localhost:18789` y `Host: evil.example:18789` dan 403, una defensa correcta contra DNS rebinding. `Sec-Fetch-Site: cross-site` da 403. Los POST exigen `Origin` exacto (`:108`): sin Origin, con Origin ajeno o desde otro puerto de localhost dan 403. No hay cabeceras CORS. `/../.env`, `/%2e%2e/.env.local`, `/.env.local` y `/package.json` dan 404 (lista blanca, `:123-124`).
  - `/api/state` y `/api/export` **no** contienen la clave (comprobado con una clave ficticia escrita en un `env.local` del scratchpad).
  - Pero cualquier proceso local puede falsificar `Origin` fuera del navegador y leer `/api/state` y `/api/export` (transcripciones) o sobrescribir `/api/key`. `Sec-Fetch-Site: same-site` (otro puerto de localhost) se acepta en GET, aunque la SOP impide leer la respuesta [I].
  - `GET /api/live-info` sin demo activa devolvió `{"error":"ENOENT: no such file or directory, open '/home/user/dictalibre-meta/.runtime/demo.json'"}`: la ruta absoluta, que en Windows incluiría `C:\Users\<usuario>` [V]. `lab.mjs:178` devuelve `e.message` en general.
- **Impacto:** bajo, porque el modelo de amenaza es un equipo personal de un solo usuario.
- **Riesgo de corregir:** bajo para sanear mensajes. Un token de sesión local cambia el flujo de arranque.
- **Propuesta:** después del hackathon, devolver mensajes genéricos para errores de `fs` y, de forma opcional, un token aleatorio por arranque para la API.
- **Plazo:** **después del hackathon**.

#### B6 · `Start-Demo.ps1` usa, como respaldo, un `node.exe` de una caché de runtime sin verificar
- **Evidencia [V]:** `scripts/Start-Demo.ps1:13`: `$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` si `node` no está en PATH.
- **Impacto:** bajo. Ejecuta un binario de una caché de una herramienta externa sin comprobar su versión ni su hash.
- **Propuesta:** exigir `node` en PATH o comprobar `node --version` ≥ 22.
- **Plazo:** **después del hackathon**. No es necesario para la demo.

#### B7 · El token QR completo se puede copiar al portapapeles
- **Evidencia [V]:** `apps/desktop/desktop.js:137-138`: `navigator.clipboard.writeText(link)` con `#qr=<token>`. El token también queda como `href` de `phone-link`.
- **Impacto:** bajo. El portapapeles de Windows puede guardar historial o sincronizarse entre equipos. El token es de un uso y vence a los 120 s.
- **Propuesta:** ninguna antes de la demo. Después, valorar copiar solo el enlace con el código manual.
- **Plazo:** **después del hackathon**.

#### B8 · Cabeceras de seguridad: correctas, con omisiones menores
- **Evidencia [V]** (`curl -D -` sobre el relay y lectura de `lab.mjs:103`): ambos envían `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` y una CSP restrictiva (`default-src 'self'; script-src 'self'; … frame-ancestors 'none'; base-uri 'none'`), sin `unsafe-inline`. El relay además envía `Permissions-Policy: microphone=(self), camera=()` y `form-action 'self'`. El único `innerHTML` es el SVG generado por qrcode-generator a partir de datos propios (`desktop.js:136`). El resto del DOM usa `textContent`. Faltan HSTS (lo cubre el HTTPS de Cloudflare), COOP/CORP y `Permissions-Policy` en el laboratorio.
- **Impacto:** muy bajo.
- **Plazo:** **después del hackathon**, opcional.

---

## Superficie de red: resultados de las pruebas locales

Relay (`PORT=18787 HOST=127.0.0.1 node backend/server.mjs`, detenido al terminar):

| Petición | Resultado |
| --- | --- |
| `/`, `/mobile`, `/health`, `/qr.js`, `/mobile?x=1` | 200 |
| `/package.json`, `/.env`, `/.env.example`, `/../.env`, `/%2e%2e/.env`, `/%2e%2e%2fpackage.json`, `/..%2f..%2fetc/passwd`, `/.runtime/demo.json`, `/data/local/lab/catalog.json`, `/backend/server.mjs`, `/shared/../../package.json`, `//etc/passwd`, `/mobile/` | 404 (lista blanca exacta, `server.mjs:10-18,39-40`) |
| `POST /`, `OPTIONS /`, `HEAD /mobile` | 405 (`server.mjs:35`) |
| CORS con `Origin: https://evil.example` | sin cabeceras `Access-Control-*` |
| WS `/ws` con Origin ajeno, sin Origin o desde otro puerto de localhost; WS `/ws?x=1` | conexión destruida (`server.mjs:47-52`) |
| WS `/ws` con Origin `http://127.0.0.1:18787` | abre |
| 25 `join` erróneos | 20 rechazos por código y 5 por límite; un 2.º cliente de la misma IP queda bloqueado (M1) |

Límites verificados en el código: WS `maxPayload` 32 KiB (`server.mjs:46`); JSON ≤4096 B y ≤80 mensajes/s por conexión (`:121`); audio ≤1/4 s por bloque, ≤6000 bloques, ≤3 min y ritmo ≤1,5× tiempo real + 2 s (`:101,109-111`); `bufferedAmount` >1 MiB aborta (`:80`); sesión de 30 min y ≤100 tomas por sesión (`:26,167`). Laboratorio: cuerpo ≤40 MB, JSON ≤100 kB (`lab.mjs:127,134`), un streaming a la vez (`muse-stream.mjs:12`) de ≤180 s (`:49`), puente `/ws` ≤3 clientes (`live-bridge.mjs:16`). En el laboratorio no hay rate limiting, lo que se acepta porque es solo loopback.

Interfaces: el relay usa `HOST` (por defecto `127.0.0.1`, `server.mjs:238`; `Start-Demo.ps1:39` lo fuerza a 127.0.0.1). El `Dockerfile:8` y `RUNNING.md:62` usan `0.0.0.0` para un despliegue tras proxy con `PUBLIC_ORIGIN`. El laboratorio escucha siempre en `127.0.0.1` (`lab.mjs:207`) y no se expone por el túnel: el túnel apunta solo al puerto del relay.

---

## Escaneo del historial: comandos ejecutados (reproducibles)

Directorio: `/home/user/dictalibre-meta`. `S` es el directorio `review/` del scratchpad.

```bash
git rev-parse --is-shallow-repository                 # false
git branch -a; git for-each-ref; git tag -l; git notes list; git replace -l; cat .git/FETCH_HEAD .git/packed-refs
git log --all --oneline | wc -l                      # 26
git log --all --format='%h %ad %an <%ae> | %cn <%ce> | %s' --date=iso
git rev-list --all --objects > $S/objects.txt         # 436 objetos
git rev-list --all --objects | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sort -k3 -n -r | head -25
git fsck --unreachable --dangling                     # sin salida
git count-objects -vH                                 # 1 pack, 390 KiB
awk 'NF>1{print $2}' $S/objects.txt | sort -u > $S/paths_all.txt; git ls-files | sort > $S/paths_head.txt
comm -23 $S/paths_all.txt $S/paths_head.txt           # solo directorios: ningún archivo borrado
sed -n 's/.*\.\([A-Za-z0-9]*\)$/\1/p' $S/paths_all.txt | sort | uniq -c   # css html js json md mjs ps1 py txt yaml + dotfiles
git log --all -p --no-color --format='COMMIT %H' > $S/allpatch.txt         # 24 631 líneas
# Patrones de secretos (conteos sobre allpatch.txt):
grep -E -c 'sk-[A-Za-z0-9_-]{16,}'                  # 0
grep -E -c 'Bearer [A-Za-z0-9._~+/=-]{12,}'         # 0 (solo `Bearer ${key}` y 'Bearer test-secret' de pruebas)
grep -E -c "api[_-]?key[\"' ]*[:=] *[\"'][^\"']{8,}" # 0
grep -E -c 'META_API_KEY=[^ ]+'                     # 3: documentación y el código que escribe la clave; ningún valor
grep -E -c 'LLM\|[0-9]' ; 'AKIA[0-9A-Z]{16}' ; 'ghp_[A-Za-z0-9]{20,}' ; 'xox[baprs]-' ; '-----BEGIN' ; 'eyJ[A-Za-z0-9_-]{10,}\.' ; 'token=[A-Za-z0-9_-]{8,}'   # 0 en todos
grep -E -c 'trycloudflare\.com[^ "]*'               # 3: subdominio vencido y regex del script (B2)
grep -oE '[A-Fa-f0-9]{40,}' | sort -u               # 52 únicos: SHA de commits, revisión del modelo, SHA-256 de audio/fuente/cloudflared
grep -oE '[A-Za-z0-9+/]{40,}={0,2}' | grep -vE '^[A-Fa-f0-9]+$'   # integridades sha512 del lock y fragmentos de URL
grep -nE -i 'LLM\||keyPrefix|last4|fingerprint|keyHash|password|secret|client_secret|authorization'   # solo código, fixtures 'test-secret' y licencias
# Identificadores personales:
grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'   # 0 en contenido (el correo solo aparece en metadatos de autor)
grep -nE '\b[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9kK]\b'      # 0 (RUT)
grep -noE '[A-Za-z]:\\\\?[Uu]sers\\\\?[^\\" ]+|/Users/[^/ ]+|/home/[^/ ]+'   # 1: HACKATHON_LOG.md (e19577f)
grep -oE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' | sort | uniq -c  # 127.0.0.1, 0.0.0.0 y un número de bytes con puntos
grep -rnoiE 'Mozilla/|Android [0-9]|iPhone|Chrome/[0-9.]+|DESKTOP-|LAPTOP-|SM-[A-Z0-9]+' experiments *.md   # 0
grep -rnE '"(deviceName|deviceModel|browserVersions|cpu|osRelease|totalRamBytes|home|node|build|…)"' experiments   # hardware genérico (B1)
# Plantillas y texto clínico (líneas añadidas):
grep -E '^\+' allpatch.txt | grep -cE 'Hallazgos|HALLAZGOS|Impresi[oó]n|T[ée]cnica:|TÉCNICA|\bTC de\b|\bRM de\b|Conclusi[oó]n:|Antecedentes|Paciente|paciente|Nombre:|RUT|Fecha de nacimiento|Dr\.|Edad:'
#   → 12/3/0/0/2/0/0/0/0/0/10/0/0/0/0/0: solo fixtures sintéticos de pruebas (tests/test_template_import.py, tests/*.mjs), la maqueta design/dictation-workspace.html, prompts y documentación
grep -nE '^\+.*"(templateText|reportText)"\s*:\s*"[^"]' allpatch.txt   # 0
grep -E '^\+' allpatch.txt | grep -oiE '[^ "`(]{0,60}\.(docx?|pdf|txt|zip|pptx?)\b'   # solo nombres de fixtures; ningún nombre de plantilla real
git log --all --format=%h -S'id="consent"' -- apps   # e19577f (agrega), e06cb23 (retira)
git log --all -p -- .env.example | grep -E '^[+-][A-Z_]+='   # solo PORT/HOST
# Ignorados:
git check-ignore -v --no-index <ruta>   # sobre 38 rutas concretas (ver B3)
```

Resultados resumidos [V]: no se detectaron secretos ni credenciales (incluidos patrones de Meta, Bearer, sk-, AWS, GitHub, Slack, PEM y JWT). El único `.env` en el historial es `.env.example`, sin valores. No hay `*.pem` ni archivos de audio, modelos o binarios, y ningún archivo fue borrado. El blob más grande pesa 153 kB (`experiments/results/2026-10-28-mobile-vs-wifi/mobile.json`). No hay correos en el contenido, RUT, user agents, IDs de dispositivo ni IPs externas. No hay contenido ni nombres de las 285 plantillas: los textos tipo informe son fixtures sintéticos o frases genéricas («No hay derrame…», «Pulmones bien expandidos») [I: no se pudo comparar contra la colección real, que no está en este equipo]. Hallazgos menores: B1 y B2.

## Addendum: commit concurrente `27259ee`

Mientras se hacía esta revisión apareció en la rama local un commit nuevo, `27259ee` («Add full context, CLAUDE.md and draft UI proposal with static mockups», autor `Claude <noreply@anthropic.com>`, 2026-11-02 02:19 UTC). Esta revisión no lo creó. Agrega `CLAUDE.md`, `docs/CONTEXTO_COMPLETO.md`, `docs/PROPUESTA_UI.md`, 4 maquetas HTML, `contraste.py` y **7 PNG** (`docs/propuesta-ui/capturas/*.png`, de 129 a 153 kB). Se revisó por separado [V]: no contiene patrones de secretos, correos (aparte del de atribución), rutas de usuario, RUT ni URLs de túnel. El texto tipo informe de las maquetas y de una captura (`a-escritorio-dia.png`, inspeccionada visualmente) es sintético y genérico, sin barra del navegador ni datos personales visibles [I: no se pudo comparar contra la colección real]. Observaciones: es el **primer binario** del historial, y `.gitignore` solo ignora `design/*.png`, no `docs/**/*.png`. Si las maquetas o capturas se generan alguna vez a partir de plantillas de la biblioteca, quedarían publicadas. No se verificó si ese commit ya fue enviado a GitHub. Las conclusiones del escaneo anterior se refieren a los 26 commits hasta `654bed8`.

## Límites de esta revisión
- El clon local solo trae dos ramas (ambas en el mismo commit). GitHub puede tener otras referencias no descargadas (rama por defecto distinta, `refs/pull/*`, ramas borradas aún en caché, forks), y el nombre previo `pabloagar/dicta-libre` redirige [U, `HACKATHON_LOG.md:213,216`]. No hubo acceso a GitHub (`gh`/MCP no disponibles), así que esto **no se verificó**.
- Los patrones no garantizan ausencia: no tuve la clave real para buscar coincidencias exactas (`PUBLICATION.md` dice que se hizo localmente, [U]) ni la colección de plantillas para comparar contenido.
- No se probó un túnel cloudflared real ni el comportamiento en Windows (permisos de `.env.local`, PowerShell).
- Las vulnerabilidades Python se consultaron solo en el campo `vulnerabilities` de PyPI. OSV no fue accesible.
- Las pruebas de red usaron instancias efímeras en 127.0.0.1:18787/18789 con directorios del scratchpad. El laboratorio se instanció con worker, Muse y revisor simulados, sin llamadas a Meta. Ambos procesos se detuvieron. Un proceso `node backend/server.mjs` preexistente (PID 2243, ajeno a esta revisión) no se tocó.
