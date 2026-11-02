# Capturas UI/UX de Dicta Libre: estado actual (2026-11-02)

Convención: **[M]** = medido directamente (Playwright/DOM/getComputedStyle/CDP), **[O]** = observado visualmente en la captura, **[I]** = inferido (de código o por razonamiento, no medido). Los valores ausentes van como `null`.

No se modificó ningún archivo del repositorio. Todo (scripts, PNG, datos del laboratorio) quedó en este directorio. `git status` al terminar solo mostraba `?? docs/revision/`, que no proviene de este trabajo.

## 1. Entorno y versión

- Repositorio `/home/user/dictalibre-meta`. HEAD al empezar: `654bed8`. Durante la sesión apareció un commit ajeno a este trabajo, `27259ee` (02:19:45 UTC, "Add full context, CLAUDE.md and draft UI proposal..."). Ese commit solo toca `CLAUDE.md` y `docs/`; `git diff --stat 654bed8 27259ee` no muestra cambios en `apps/`, `backend/` ni `design/`. El laboratorio reportó `build=27259ee…` y `sourceHash=6108eb39…`. **Conclusión [M]:** el código de interfaz capturado es idéntico en ambos commits.
- Navegador: Chromium 153.0.8010.12 headless, de Playwright, en Linux. Node v22.23.4.
- Fuente renderizada **[M]** (CDP `CSS.getPlatformFontsForNode`): **Inter**. El CSS declara `'Segoe UI', system-ui, sans-serif`; Segoe UI no existe en el contenedor. En Windows o Android la fuente real será otra **[I]**: Segoe UI en Windows, Roboto u otra de sistema en Android. Las métricas de texto pueden cambiar.
- Red: loopback local, sin túnel ni Internet entre dispositivos.
- Audio: dispositivo de audio falso de Chromium (`--use-fake-device-for-media-stream`). No hay voz ni audio clínico.
- Repeticiones: 1 ejecución completa del script de capturas, más 2 sondas puntuales (reinicio del editor y simulación de la maqueta).

## 2. Cómo arranqué

Directorio de trabajo: un directorio temporal fuera del repositorio (en adelante `$S`). Los scripts usados están copiados en `docs/propuesta-ui/actual/scripts/` con rutas relativas; escriben fuera del repo (`OUT_DIR`/`WORK_DIR` o un temporal). Las capturas originales (56 PNG a DPR 3,5) no se incluyen; en `docs/propuesta-ui/actual/` hay una selección reducida.

### 2.1 Por qué hizo falta un proxy HTTPS

El QR de `/live` usa `mobileOrigin`, que el laboratorio lee de `.runtime/demo.json`. La función `demoConnection` exige que la URL sea `https:`. Ese archivo no existe en el repo, y crearlo habría modificado el repo.

Además, `getUserMedia` necesita un contexto seguro y el relay solo acepta WebSocket del origen `PUBLIC_ORIGIN`. Para emular el flujo real QR→HTTPS sin túnel ni Cloudflare monté tres piezas:

1. Un certificado autofirmado para `localhost` en `$S/run/{cert,key}.pem`. Comando: `openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 2 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"`.
2. `$S/run/https-proxy.mjs`: un proxy HTTPS/WSS mínimo en `https://localhost:8443` hacia `http://127.0.0.1:8787`.
3. `$S/run/lab-wrapper.mjs`: importa `createLab` del repo. Le pasa `dataDir=$S/labdata`, `keyFile=$S/run/no-key.env` (inexistente) y `templateFile=$S/run/no-templates.json` (inexistente). Además intercepta **solo** la lectura de `.runtime/demo.json` en `fs.readFileSync` y responde `{"url":"https://localhost:8443","port":8787}`.

Así no se escribió en `data/local/` (verificado: `data/` solo contiene `synthetic/`) ni en `.env.local`. Tampoco se creó ninguna credencial.

Primer intento descartado: con `--host-resolver-rules=MAP dicta.test 127.0.0.1`, Chromium devolvía `ERR_CONNECTION_RESET` para `dicta.test`. Por eso se usó `localhost`.

### 2.2 Comandos exactos (en segundo plano)

```bash
cd /home/user/dictalibre-meta
PUBLIC_ORIGIN=https://localhost:8443 PORT=8787 nohup node backend/server.mjs > $S/run/relay.log 2>&1 &
nohup node $S/run/https-proxy.mjs > $S/run/proxy.log 2>&1 &
env -u META_API_KEY -u MODEL_API_KEY nohup node $S/run/lab-wrapper.mjs > $S/run/lab.log 2>&1 &
cd $S && node capture.cjs          # capturas + mediciones.json
node probe-reset.cjs               # sonda: editor de /live al pulsar Conectar teléfono
node probe-design.cjs              # sonda: simulación de la maqueta
kill <pids>                        # detenidos al final; verificado 0 procesos restantes
```

Flags de Chromium: `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --ignore-certificate-errors --no-proxy-server`. Además `ignoreHTTPSErrors: true` y `permissions: ['microphone']`.

- Contexto móvil: viewport 412x915, `deviceScaleFactor` 3.5 (PNG de 1442 px de ancho), `isMobile` y `hasTouch` en true, `locale` es-CL. UA: `Mozilla/5.0 (Linux; Android 15; SM-S938B) … Chrome/141.0.0.0 Mobile Safari/537.36`. **No es un S25 físico.**
- Contexto escritorio: 1440x900 y 1920x1080 con DPR 1.
- Maqueta: `design/dictation-workspace.html` servida desde `http://127.0.0.1:8793/` por un servidor efímero dentro del script. No se usó `.runtime/design-preview.mjs`, que no existe en el repo.

### 2.3 Qué arrancó y qué no

- **Relay:** arrancó sin problemas.
- **Laboratorio:** arrancó sin Python, sin modelo y sin clave Meta, porque el worker Python solo se lanza al ejecutar. Encabezado de `/` **[M]**: "Muse: sin clave · Whisper: modelo pendiente".
- **`/lab`:** responde **404** `{"error":"No encontrado."}` **[M]**. La interfaz del laboratorio está en `/` del puerto 8789, y eso es lo que se capturó como "lab".

## 3. Estados logrados y no logrados

**Logrados [M]:**
- Móvil: inicial; código manual vacío (error); foco con Tab; emparejado por QR (enlace `#qr=` en contexto móvil nuevo); preparado; grabando en modo mantener pulsado (puntero presionado 2,2 s); ~300 ms tras soltar; tras soltar con toma verificada; grabando y tras detener en modo inicio/parada; sesión finalizada; modo oscuro inicial y preparado; móvil emparejado con `/live`.
- Escritorio relay (1440): inicial; foco con Tab; con QR; emparejado; durante toma; con 1 toma recibida y desplegables abiertos (la 2.ª toma, inicio/parada, se recibió después pero no se capturó con desplegables); sesión cerrada; oscuro emparejado. En 1920: inicial y con QR.
- `/live` (1440 y 1920): vacío; con texto sintético; biblioteca de plantillas abierta; ajustes de dictado abiertos; panel de tomas abierto. Solo en 1440: con QR, emparejado, grabando, tras la toma y panel de tomas tras la toma. También oscuro y vista móvil de referencia.
- `/` del laboratorio: 1440, 1920 y oscuro, con foco Tab.
- Maqueta: inicial (1440 y 1920), simulación a ~2,6 s y al final, y revisión lateral.

**No logrados o con limitaciones:**
- **Transcripción real (texto ASR en el informe):** no se logró. Whisper falló con "Modelo local incompleto: ejecuta scripts/download-lab-model.py" (modelo ausente). Muse no estaba disponible sin clave, y no se crearon credenciales.
- **Borradores provisionales, propuestas del Revisor Meta y "Revisar informe":** no se capturaron, porque no hay motor ni clave.
- **Código manual con confirmación de 4 cifras:** no se capturó; solo se probó el código vacío.
- **Toma con tono sintético** ("Probar con tono sintético"): no se probó; se usó el micrófono falso.
- **Biblioteca con plantillas importadas:** no hay catálogo, así que se muestran "0 plantillas importadas".
- **Modo oscuro:** sí se capturó, pero la interfaz **no tiene tema oscuro**. Las capturas oscuras son idénticas píxel a píxel a las claras (md5 igual en `mobile-01` y `mobile-11`, y en `lab` y `lab-oscuro`) **[M]**. `matchMedia('(prefers-color-scheme: dark)')` daba true y `:root{color-scheme:light}` **[M]**.
- **Interrupciones de visibilidad, bloqueo de pantalla, vibración y Wake Lock:** no se emularon.
- **Medidor de nivel:** se vio vacío en las capturas de grabación **[O]**. Probablemente se debe a la señal del dispositivo falso **[I]**; su valor no se midió.

## 4. Capturas

Los nombres móviles son PNG 1442 px de ancho (3,5x). Las de escritorio son 1x. Las capturas "fullPage" incluyen toda la altura.

| Archivo | Descripción |
|---|---|
| mobile-01-inicial.png | /mobile inicial; pide código del computador |
| mobile-01b-inicial-viewport.png | Igual, solo primera vista |
| mobile-02-codigo-vacio.png | Tras "Conectar con el PC" sin código: aviso rojo "Introduce los 10 caracteres del código." |
| mobile-03-foco-tab.png | 4 Tab: foco ámbar en el campo de código |
| mobile-04-emparejado.png / -04b-…-viewport.png | Conectado; "Preparar micrófono"; botón de grabar deshabilitado (opacidad 0,45) |
| mobile-05-preparado.png / -05b-…-viewport.png | Micrófono preparado; "Preparar" y "tono sintético" desaparecen; botón grande "Mantén pulsado para hablar" |
| mobile-06-grabando-mantener.png | Grabando: botón rojo "Suelta para detener", 00:02, recibidos 22 |
| mobile-07a-recien-soltado.png | ~300 ms tras soltar |
| mobile-07-tras-soltar.png | "Micrófono preparado para otra toma." + "✓ El PC recibió exactamente el mismo audio. Puedes escucharlo allí." |
| mobile-08-grabando-inicio-parada.png | Modo Inicio / parada, botón rojo "Pulsa para detener" |
| mobile-09-tras-parada.png | Tras detener en Inicio / parada |
| mobile-09b-foco-tab-emparejado.png | 4 Tab estando emparejado (foco en radio "Inicio / parada") |
| mobile-10-sesion-finalizada.png | Tras "Finalizar sesión…": "Conexión cerrada. Crea una sesión nueva en el PC." |
| mobile-11-oscuro-inicial.png | colorScheme dark (idéntica a la clara) |
| mobile-12-oscuro-preparado.png | Oscuro, emparejado y preparado (sin tema oscuro) |
| mobile-13-live-tras-toma.png | Móvil emparejado con /live tras una toma |
| mobile-14-live-en-movil.png | /live del laboratorio en viewport móvil (solo referencia; no es el flujo previsto) |
| desktop-1440-relay-01-inicial.png | Receptor del relay antes de conectar |
| desktop-1440-relay-01b-foco-tab.png | 4 Tab (foco en "Audio recibido") |
| desktop-1440-relay-02-qr.png | QR, código de 10 caracteres, "Vence en 120 s", Copiar enlace, Abrir vista del teléfono |
| desktop-1440-relay-03-emparejado.png | "Teléfono conectado" |
| desktop-1440-relay-04-grabando.png | Pastilla "RECIBIENDO", "Grabación en curso." |
| desktop-1440-relay-05-toma-recibida.png | 1 toma recibida (mantener pulsado) con reproductor, SHA-256, "Integridad verificada"; tabla P50/P95 desplegada |
| desktop-1440-relay-06-sesion-cerrada.png | "Sesión cerrada. Puedes crear una nueva." |
| desktop-1440-relay-07-oscuro-emparejado.png | colorScheme dark (sin tema oscuro) |
| desktop-1920-relay-01-inicial.png / -02-qr.png | Receptor 1920 (contenido centrado a 1392 px de ancho) |
| desktop-1440-live-01-vacio.png | /live vacío: franja "1. Conecta tu teléfono para empezar", barra de herramientas e informe |
| desktop-1440-live-01b-foco-tab.png | 4 Tab (foco verde en el selector de motor) |
| desktop-1440-live-02-texto.png | Editor con "Nódulo de cinco milímetros en lóbulo superior derecho." |
| desktop-1440-live-03-plantillas.png | Panel "Plantillas" superpuesto (0 importadas) |
| desktop-1440-live-04-ajustes.png | Popover "Ajustes de dictado" superpuesto: Revisor Meta (marcado) y comandos |
| desktop-1440-live-05-panel-tomas.png | Panel lateral "Tomas y Revisor Meta · últimas 5" |
| desktop-1440-live-06b-tras-conectar-editor-vaciado.png | Sonda: tras pulsar "Conectar teléfono · mostrar QR" el editor queda vacío y el popover QR cubre "Deshacer" |
| desktop-1440-live-07-qr.png | /live con QR (popover bajo "Conectar teléfono") |
| desktop-1440-live-08-emparejado.png | "Teléfono conectado" |
| desktop-1440-live-09-grabando.png | Durante la toma |
| desktop-1440-live-10-tras-toma.png | Tras la toma; aviso "Toma cancelada. Se recuperó el texto anterior." |
| desktop-1440-live-11-panel-tomas-tras-toma.png | Tarjeta "Toma 1 · Whisper local — No se pudo transcribir: Modelo local incompleto…" |
| desktop-1440-live-12-oscuro.png | /live con colorScheme dark (sin tema oscuro) |
| desktop-1920-live-01…05 | Mismos estados que en 1440 (vacío, texto, plantillas, ajustes, tomas) |
| desktop-1440-lab.png / -lab-foco-tab.png / -lab-oscuro.png / desktop-1920-lab.png | Laboratorio "Compara tus dictados", con las 2 tomas de /live importadas y la ejecución en error |
| desktop-1440-design-01-maqueta.png / desktop-1920-design-01-maqueta.png | Maqueta: informe dominante, riel lateral Meta/Tomas/Datos |
| desktop-1440-design-02-simulacion.png | Maqueta "Escuchando", frase provisional subrayada en ámbar |
| desktop-1440-design-02b-simulacion-final.png | Maqueta al terminar la simulación |
| desktop-1440-design-03-revision.png | Maqueta con revisión lateral (Aceptar / Rechazar) |

Datos crudos: `$S/mediciones.json`. Contiene, por pantalla, cajas, estilos, contraste, regiones vivas, recorrido de Tab y errores de consola (0 en la ejecución final).

## 5. Mediciones

Método de contraste **[M]**: ratio WCAG 2.x entre `color` y el primer fondo no transparente de sus ancestros, con composición alfa. No considera la `opacity` del elemento; la opacidad se reporta aparte. Los fondos con imagen o degradado no se consideran (no se observaron). Precisión: es una aproximación sobre colores computados, no sobre píxeles.

### 5.1 Móvil (/mobile, 412x915 CSS px)

**Objetivos táctiles (boundingBox, CSS px) [M]:**

| Elemento | Ancho × alto | Notas |
|---|---|---|
| Conectar con el PC (`#join`) | 346 × 36 | |
| Campo de código (`#join-code`) | 346 × 42 | |
| Reiniciar sesión / Exportar diagnóstico | 380 × 36 | Botones con aspecto de enlace, sobre la tarjeta principal |
| Preparar micrófono (`#prepare`) | 346 × 36 | Oculto tras preparar |
| Probar con tono sintético | 346 × 36 | Oculto tras preparar |
| Radio "Mantener pulsado" / "Inicio / parada" | 169 × 37 cada uno | Etiqueta visible; el input radio está oculto |
| Botón de grabar (`#record`) | **346 × 100** | Deshabilitado con opacidad 0,45 antes de preparar |
| Probar vibración breve | 346 × 36 | |
| Casilla "Vibración breve al grabar" | **13 × 13** | La etiqueta amplía el área clicable [I] |
| Finalizar sesión y liberar micrófono | 346 × 36 | |

- Tamaños comparados con referencias **[I]**: todos ≥ 24 px (WCAG 2.2 AA, 2.5.8). Los de 36 px quedan bajo los 44 px de WCAG AAA (2.5.5) y bajo los 48 dp de Material. Solo el botón de grabar supera ampliamente ambos.
- Posición del botón de grabar **[M]**: en estado preparado, y = 612–712 px; en grabación, y = 594–694. Está dentro de la primera vista de 915 px, sin hacer scroll. "Finalizar sesión" queda en y = 846–882 (preparado), también dentro de la primera vista. En la parte superior, "Reiniciar sesión" y "Exportar diagnóstico" anteceden a los controles.
- Altura del documento **[M]**: 915 (inicial), 1076 (emparejado), 1024 (preparado), 1006 (grabando). Siempre hay scroll vertical desde que se empareja.
- Scroll horizontal **[M]**: ninguno. `scrollWidth` = `clientWidth` = 412 en todos los estados móviles, incluido /live en móvil.

**Tipografía [M]** (CSS declarado → renderizado Inter):

| Elemento | Estilo |
|---|---|
| Cuerpo | 16 px |
| h1 "Micrófono del teléfono" | ≈ 22 px semibold [O: no medido el tamaño exacto del h1] |
| Estado (`#status`) | 13 px / 18,2 |
| Botones de texto | 13 px peso 600 |
| Selector de modo | 12 px |
| Etiqueta del botón de grabar | 14 px 600 (contenedor 16 px) |
| Temporizador | 28 px |
| Nota de privacidad | 12 px / 18 |
| Pie | 10 px |
| Aviso de verificación | 12 px |

**Colores y contraste [M]:**

| Elemento | Texto / fondo | Ratio |
|---|---|---|
| Página | `#163d33` sobre `#f5f4ee` | — |
| Primario (`#join`, `#prepare`, grabar en reposo) | `#ffffff` sobre `#245c47` | **7,79** |
| Grabar en grabación | `#ffffff` sobre `#b53e35` | **5,67** |
| Grabar deshabilitado | 7,79 nominal, opacidad 0,45 | Efectivo menor, no calculado: `null` |
| Estado neutro | `#163d33` sobre `#ecefe5` | 10,31 |
| Estado éxito | `#235d40` sobre `#e5f1e6` | 6,66 |
| Estado error | `#903d34` sobre `#fff0ed` | 6,52 |
| Botones secundarios (Reiniciar, Exportar, Finalizar) sobre página | `#67766e` sobre `#f5f4ee` | **4,34** (menor que 4,5) |
| Botones secundarios sobre tarjeta | `#67766e` sobre `#fffefa` | 4,74 |
| Nota de privacidad (12 px) y pie (10 px) | `#67766e` sobre `#f5f4ee` | **4,34** (menor que 4,5) |
| "Probar vibración breve" durante grabación | 4,74 nominal, opacidad 0,45 | Deshabilitado |

**Estado durante grabación [M]:** `#status` muestra "Grabando y enviando al computador." con el mismo fondo neutro que el estado inicial (`#ecefe5`). El cambio visual principal es el botón rojo con el texto "Suelta para detener" o "Pulsa para detener".

**Foco con Tab [M]:**
- Recorrido inicial: logo → "Reiniciar sesión" → "Exportar diagnóstico" → campo de código.
- Recorrido emparejado: logo → Reiniciar → Exportar → radio "Inicio / parada".
- Todos con `outline: 3px solid rgb(209,155,62)` y `:focus-visible` true. El foco es visible en la captura `mobile-03`.

**ARIA [M]:**
- `#status` tiene `role="status"` y `aria-live="polite"` (el estado de grabación se anuncia por aquí).
- `#verified` tiene `role="status"` y `aria-live` implícito.
- El medidor tiene `aria-label="Nivel del micrófono"`.
- El SVG del botón de grabar es `aria-hidden`.
- Los modos están en un `fieldset` con `legend` "Compara los dos controles".
- El temporizador no tiene región viva.

**Atajos de teclado [I, desde código]:** no hay atajos globales. En modo mantener pulsado, Espacio o Enter sobre `#record` inicia y soltar la tecla detiene; perder el foco (`blur`) también detiene. No hay atajos visibles en pantalla **[O]**.

**Textos de privacidad o validación visibles [M]:**
- "Prepara el micrófono una vez. Entre tomas permanece activo, pero su audio no se guarda ni se envía."
- "Micrófono preparado. Fuera de cada toma, el audio se descarta."
- "Al bloquear o cambiar de aplicación se libera el micrófono… Las tomas guardadas permanecen en el laboratorio."
- Pie: "DICTA LIBRE · PRUEBA DE CAPTURA".
- Descripción del formato: "44.1 kHz · PCM 16 bits · mono · máx. 3 min. Procesado del navegador: eco no, ruido no, ganancia automática no."

No aparece en el móvil ningún aviso del tipo "no introducir datos de pacientes" ni sobre validación clínica o precisión **[M]**: búsqueda en los textos visibles y en el HTML.

### 5.2 Escritorio: receptor del relay (/)

- Primario "Conectar teléfono ↗" **[M]**: 206 × 36 px, 13 px peso 600, `#fff` sobre `#245c47`, contraste 7,79. Tras crear la sesión queda deshabilitado (opacidad 0,45).
- Textos pequeños **[M]**: estado 13 px (contraste 10,31). Etiqueta del encabezado "CAPTURA + TRANSPORTE · PROTOTIPO" a 10 px, `#67766e` sobre `#f5f4ee`, **4,34**. Pastilla de estado ("EN ESPERA" / "RECIBIENDO") a 11 px, 10,14. Pie "DICTA LIBRE · FASES 01 + 02" a 10 px, 4,34.
- Área "Transcripción" **[M/O]**: muestra "Tu dictado aparecerá aquí… El reconocimiento de voz aún no está integrado." con la etiqueta "RECONOCIMIENTO PENDIENTE".
- Toma recibida **[O]**: el enlace dice "Descargar WAV sintético" aunque el origen sea el micrófono. Según el código, ese texto es fijo **[I]**.
- Mediciones P50/P95 **[O]**: se muestran solo dentro de un desplegable. Encima hay tres valores siempre visibles (≈ 2,8 ms, 4,6 ms, 100 ms en esta ejecución en loopback; **no** son representativos de red real).
- Ancho a 1920 **[M]**: el contenido no se expande. Se centra en 1392 px y deja ~264 px de margen a cada lado. Sin scroll horizontal.
- Foco con Tab **[M]**: logo → Conectar teléfono → Reiniciar sesión → summary "Audio recibido". Outline ámbar de 3 px.
- ARIA **[M]**: `#status` con `role="status"` y `aria-live="polite"`. La pastilla `#record-state` no tiene región viva. QR con `aria-label="Código QR para conectar el teléfono"`.

### 5.3 Escritorio: /live (editor de informe)

**Disposición a 1440x900 [M]:**
- Documento de 1334 px de alto.
- Editor en y = 469–901: el borde inferior queda 1 px bajo el pliegue.
- "Tomas y Revisor Meta" en y = 1118, fuera de la primera vista.
- Sobre el editor se apilan: estado global, franja de bienvenida "1. Conecta tu teléfono para empezar" (86 px), barra Conectar/Dictado/Motor/Ajustes/Laboratorio, banda de grabación y título "Informe" con su barra de herramientas.

**Disposición a 1920x1080 [M]:** editor de 1498 × 518 px (y = 469–987), completamente visible.

**Controles [M]:**
- "Conectar teléfono · mostrar QR": 291 × 48, 17 px.
- Summaries "Conectar teléfono", "Ajustes de dictado", "Plantillas": 38 px de alto, 16 px 600, contraste 12.
- "Copiar informe": 138 × 38, `#fff` sobre `#205b46`, **7,94**.
- A− y A+: 47 × 38.
- Casillas: 13 × 13.

**Editor [M]:** `div` con `contentEditable=plaintext-only`, `role="textbox"`, `aria-multiline="true"`, `aria-label="Informe dictado"`. Texto de 24 px / 37,2, `#163d33` sobre `#fff`, contraste 12. Foco del editor: outline verde.

**Textos auxiliares [M]:**
- Ayuda y estado del informe: 14 px, `#52665b` sobre `#fffefa`, 6,1.
- Etiqueta del encabezado "DICTADO · MUSE / WHISPER" y pie: 12 px, `#67766e` sobre `#f3f4ef`, **4,32**.
- Ayuda de ajustes ("El audio se transcribe en la GPU…"): 12 px sobre `#eef2eb`, **4,22**.

**Avisos visibles sobre envío a terceros y privacidad [M]:**
- "Revisor Meta al terminar cada toma (envía toma, contexto del informe y plantilla a Meta)". La casilla aparece **marcada por defecto**, incluso con motor Whisper local y sin clave Meta configurada.
- Caja "Revisión del informe · Meta — Revisión opcional del texto completo y contexto de plantilla. Envía texto a Meta; no modifica el informe."
- "Borrador guardado solo en este navegador. Revisa también el contenido heredado de la plantilla."
- Panel de tomas: "Audio y resultados se guardan en el laboratorio local."

No se ve ningún aviso de "no introducir datos de pacientes" ni de validación clínica en los estados capturados **[M]**. Según el código, "Esto no valida clínicamente el informe" aparece solo tras un resultado de revisión global, que no se capturó **[I]**.

**Superposiciones [O]:**
- El panel "Plantillas" y el popover "Ajustes de dictado" se abren superpuestos sobre la barra y el editor; Ajustes tapa el selector de motor.
- El popover del QR cubre "Deshacer", "A−" y "A+". Playwright no pudo pulsar "Deshacer" mientras estaba abierto **[M]**: un `path` del QR interceptaba el puntero.

**Sonda de reinicio del editor [M]** (`probe-reset.cjs`, 1 repetición):
1. Con texto escrito en el informe, pulsar "Conectar teléfono · mostrar QR" deja el editor vacío (`"\n"`). Ningún mensaje lo indica: el estado sigue diciendo "Borrador guardado solo en este navegador…".
2. "Deshacer", activado por script porque estaba tapado, restauró el texto con el mensaje "Cambio deshecho…".
3. El texto restaurado sobrevivió a una recarga.

Según el código **[I]**, el evento `dicta-new-session` llama a `reportEditor.reset()`.

**Toma tras ASR fallido [M]:** la tarjeta dice "No se pudo transcribir: Modelo local incompleto: ejecuta scripts/download-lab-model.py." y el estado del informe "Toma cancelada. Se recuperó el texto anterior.". El estado global del PC sigue mostrando "Audio recibido completo. Escucha la toma y comprueba el inicio y el final." Tras emparejar, el PC muestra "Conectados. Prepara el micrófono en el teléfono." aun cuando el teléfono ya estaba preparado.

**Botones repetidos [O]:** "Conectar teléfono" aparece dos veces mientras no hay conexión: la franja de bienvenida y el summary de la barra.

**Foco con Tab [M]:** logo → "Conectar teléfono · mostrar QR" → summary "Conectar teléfono" → selector de motor. `outline: 3px solid rgb(57,123,100)`, `:focus-visible` true.

**ARIA [M]:**
- `#status` (`role=status`, `aria-live=polite`).
- `.report-copy` (`aria-live=polite`).
- `.report-status` (`role=status`).
- Revisión global (`role=status`).
- `.live-transcript` de cada toma (`role=status`).
- Selectores con `aria-label`: "Motor para dictar", "Glosario de Muse", "Segmentación de Muse-streaming", "Plantilla para el informe", "Buscar plantillas", "Aumentar/Reducir tamaño del informe".

**Atajos [I, desde código]:** no hay atajos propios. El único texto visible que menciona una tecla es "copia con Ctrl+C", y solo aparece si falla la copia.

**Scroll horizontal [M]:** ninguno a 1440 ni a 1920. En viewport móvil, /live mide 412 px de ancho y 1700 de alto, sin scroll horizontal.

### 5.4 Laboratorio (/ en 8789)

- h1 "Compara tus dictados" **[M]**: 24 px, peso 700, contraste 10,89. "Ejecutar selección": 200 × 40, `#fff` sobre `#245c47`, 7,79.
- Indicador **[M]**: "Muse: sin clave · Whisper: modelo pendiente", 13 px, `#63756a` sobre `#f5f4ee`, **4,45**.
- Subtítulo y pasos **[M]**: "1 · Selecciona audios → 2 · Elige configuraciones → 3 · Ejecuta y compara", 16 px, 4,45. Pie de 11 px, 4,45.
- Orden de pantalla **[O]**: el bloque "03 · Ejecutar" aparece **antes** que "01 · Audios" y "02 · Configuraciones".
- Avisos visibles **[M]**: "Carga WAV PCM16 de hasta 3 minutos. Se guardan en este computador.", "Muse envía los audios seleccionados a Meta. Whisper los procesa localmente.", "Muse estimado USD 0.00000. Coste local no medido; estimación, no factura." y "Revisor Meta: sugerencias opcionales bajo aprobación humana" (pie). El aviso "el WER no evalúa seguridad clínica" está en el HTML, pero no se vio en el estado capturado **[I]**: probablemente está dentro de un desplegable.
- Foco **[M]**: outline 3 px `rgb(202,155,72)`. Recorrido: logo → Volver al dictado → Exportar JSON → CSV.
- ARIA **[M]**: `#status` tiene `role=status` sin `aria-live` explícito.
- Documento de 1424 px de alto a 1440, sin scroll horizontal **[M]**.

### 5.5 Maqueta design/dictation-workspace.html

- README de `design/` **[O]**: la describe como propuesta independiente, no integrada, con datos simulados. Su franja superior dice "Propuesta interactiva · audio y datos simulados".
- Diferencias con /live **[M/O]**: la maqueta no tiene franja de bienvenida ni bloque de conexión en el cuerpo. La conexión es un texto en el encabezado ("S25 conectado · ejemplo"). Hay un riel derecho de 58 px con Meta / Tomas 5 / Datos. El informe (24 px / 38,4, `#253e35` sobre `#fffefa`, 11,44) empieza en y = 269. La simulación marca el texto provisional con fondo `#fff0c7` y subrayado punteado, con la leyenda "Subrayado: texto provisional; puede cambiar al finalizar.".
- Foco **[M]**: outline 3 px `rgb(57,123,100)`. Recorrido: Ajustes → Ver cómo aparece el dictado → Volver a dictado enfocado → Plantillas.

### 5.6 Sobrecosto y limitaciones de la instrumentación

- Las mediciones se hicieron con `page.evaluate` después de esperas fijas (300–2200 ms). No se midieron tiempos de interacción. El sobrecosto de la instrumentación no se midió (`null`) y no afecta los tamaños ni los colores.
- `boundingBox` está en CSS px. En físico, × 3,5 en el contexto móvil.
- Chromium headless con dispositivo falso: no reproduce el permiso real de Android, la barra de URL ni los teclados virtuales. El UA es solo una cadena; no hubo validación física en el S25 Ultra.
