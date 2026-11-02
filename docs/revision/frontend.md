# Revisión frontend · Dicta Libre · 02-11-2026

Revisión técnica **solo lectura**. No se modificó ningún archivo del repositorio (`git status` limpio al terminar).

## Alcance, versión y método

- Código revisado: HEAD `654bed8` al inicio; durante la revisión apareció `27259ee` (commit solo de documentación). `git diff 654bed8 27259ee --stat -- apps backend tests` sale vacío: el código de producto revisado es el mismo en ambos.
- Archivos: `apps/desktop/{report-editor,report-review,live,desktop}.js`, `apps/desktop/index.html`, `apps/shared/{report-model,review-ui}.js`, `apps/shared/style.css`, `apps/lab/{lab.js,index.html,style.css}`, `apps/mobile/mobile.js` (solo render de mensajes), rutas `/api/templates` y `/api/state` de `backend/lab.mjs`.
- Pruebas existentes ejecutadas: `node --test tests/report-model.test.mjs` (8/8), `report-review` (4/4), `review-polling` (3/3), `templates` (1/1). Todas pasan.
- Pruebas propias (PoC) en `docs/revision/sondas/poc/`: `harness.mjs`, `s1-xss.mjs`, `s2-editor.mjs`, `s3-quota.mjs`, `s4-perf.mjs`, `s5-lab.mjs`, `s6-ctrlc.mjs`, `s7-restart.mjs`, `m1-model.mjs`.
  - Entorno: Playwright 1.63, Chromium headless 153.0.8010.12, Linux en contenedor. Sin teléfono, sin GPU, sin red externa.
  - Montaje: instancia aislada de `createLab()` con datos en el scratchpad (lo mismo que hacen los tests). El WebSocket del relay está reemplazado por un stub y `/asr-stream` está interceptado con `routeWebSocket`. `/api/state`, `/api/runs`, `/api/audio`, `/api/live-info` y las revisiones son simulaciones con texto sintético. Las tomas se simulan disparando los mismos `CustomEvent` que emite `desktop.js` (`dicta-recording-start`, `dicta-take`, `dicta-recording-stop`).
  - Limitaciones: los tiempos son de Chromium headless en este contenedor y no representan el PC de referencia ni la fluidez percibida. Ningún resultado usa audio ni texto clínico real.
- Convención: **[Verificado]** = se observó con un comando o PoC (se indica cuál). **[Lectura]** = se deduce del código citado, sin ejecutarlo.

---

## Resumen de severidades

| Severidad | N.º | Hallazgos |
|---|---|---|
| Crítico | 0 | No encontré XSS explotable ni pérdida irreversible sin intervención del usuario. |
| Alto | 1 | A1: «Conectar teléfono» borra el informe. |
| Medio | 6 | M1–M6 |
| Bajo | 12 | B1–B12 |

---

## Alto

### A1 · «Conectar teléfono» borra el informe (también el restaurado tras recargar) sin aviso — [Verificado]

- `apps/desktop/desktop.js:164-166`
  ```js
  $('create').onclick = () => {
    if (client) return;
    window.dispatchEvent(new Event('dicta-new-session'));
  ```
- `apps/desktop/live.js:71`: `window.addEventListener('dicta-new-session',()=>{generation++;reportEditor.reset();…for(const card of panel.querySelectorAll('article'))card.remove();});`
- `apps/desktop/report-editor.js:67` (`reset(){…model.reset();…render(null,selection)…}`), que a su vez llama a `persist()` y sobrescribe `localStorage['dicta-report-v1']` con `''`.
- PoC `s2-editor.mjs` (A): se sembró el informe sintético «HALLAZGOS\nInforme sintético previo a recarga.» y se cargó `/live`; el editor lo mostró restaurado. Un clic en `#create` («Conectar teléfono · mostrar QR») dejó `editor=""` y `localStorage=""`. El estado siguió en «Borrador guardado solo en este navegador…», sin ningún mensaje. «Deshacer» recupera el texto porque `ReportModel.reset` lo guarda en `history` (`report-model.js:16`), pero solo en memoria.
- PoC `s7-restart.mjs`: «Reiniciar sesión y limpiar pantalla» (`desktop.js:183`) borra el informe, recarga la página y en la nueva carga vuelve a pulsar `#create`. Resultado: `afterRestart=""`, `stored=""`, 0 diálogos de confirmación, y Deshacer ya no recupera nada porque la recarga perdió el historial.
- Las tarjetas de toma también se eliminan (`live.js:71`), incluidas las ediciones de revisión sin guardar.
- **Impacto**: cada vez que haya que volver a emparejar (sesión de transporte de 30 min, caída del túnel documentada en CODE_REVIEW, recarga) el primer clic natural borra el informe en pantalla y en disco. Esto contradice PHASE_9_EDITOR.md («al recargar queda el texto previo»), que solo atribuye la limpieza a «Reiniciar sesión». Si el usuario no nota el vacío y recarga, el texto se pierde.
- **Riesgo de corregir**: bajo. Hay que separar «nueva sesión de transporte» de «nuevo informe». `dicta-new-session` también cancela trabajos y streams, lo que sí debe mantenerse al reconectar.
- **Propuesta**: en `live.js:71`, no llamar a `reportEditor.reset()` ni borrar tarjetas en la reconexión. Si una toma está en curso, cancelar solo esa toma. Para «Reiniciar sesión», pedir confirmación explícita («Borrará el informe actual»), o copiar antes y conservar la posibilidad de deshacer. Prueba reproducible: el mismo PoC A tiene que dar `after===before`.
- **Seguro antes del 4-nov** (cambio de 1–2 líneas más la prueba de navegador).

---

## Medio

### M1 · Un resultado ASR vacío borra la selección y se anuncia «Toma incorporada» — [Verificado]

- `apps/desktop/live.js:101-103`
  ```js
  const finalText=run.formatting?.text??run.numberFormatting?.text??run.text;
  text.textContent=finalText.trim()||(finalText.includes('\n')?'(Salto aplicado al informe.)':'(El motor devolvió texto vacío.)');
  await reportEditor.finish(reportAnchor,finalText,run.id);
  ```
- `apps/shared/report-model.js:10`: `preview` usa `text?a.prefix+text:text`, así que con `''` reemplaza el destino por vacío.
- PoC `s2-editor.mjs` (B): el informe era «HALLAZGOS\nSin derrame pleural.\nFin.». Se seleccionó «Sin derrame pleural.» y el motor devolvió `''`. Resultado: `"HALLAZGOS\n\nFin."`, estado «Toma incorporada. Puedes revisar o seguir dictando.» y tarjeta «(El motor devolvió texto vacío.)».
- El modelo lo hace a propósito (`tests/report-model.test.mjs:8`, «reemplazo vacío»), pero en la interfaz una toma silenciosa o fallida termina **borrando** texto clínico seleccionado, con mensaje de éxito.
- **Impacto**: se pierde una frase sin que el usuario lo note. Deshacer la recupera si se da cuenta.
- **Riesgo de corregir**: bajo. Hay que mantener el caso `'\n'` (comando «nueva línea»), que es legítimo.
- **Propuesta**: en `live.js`, si `finalText.trim()==='' && !finalText.includes('\n')`, llamar a `reportEditor.cancel(reportAnchor)` (que restaura) y mostrar «Sin texto reconocido; se conservó la selección». Agregar el caso a una prueba de navegador.
- **Seguro antes del 4-nov.**

### M2 · El enlace «Descargar WAV sintético» aparece también en tomas de voz real — [Lectura]

- `apps/desktop/desktop.js:71-72`
  ```js
  if (complete) { … download.textContent = 'Descargar WAV sintético'; …
  ```
  No depende de `record.source`. En la línea 65 sí se distingue `record.source === 'tone' ? ' · Tono sintético' : ''`.
- **Impacto**: un archivo con voz de dictado, potencialmente clínica, se ofrece con una etiqueta que invita a tratarlo como material de prueba. Es a la vez un problema de honestidad del texto y de privacidad (AGENTS.md: no conservar audio clínico como evidencia).
- **Riesgo de corregir**: nulo.
- **Propuesta**: `record.source==='tone'?'Descargar WAV sintético':'Descargar audio de esta toma (contiene tu voz)'`.
- **Seguro antes del 4-nov.**

### M3 · Consulta del catálogo completo `/api/state` cada 1,5 s en reposo (hallazgo P1 de CODE_REVIEW, corregido solo en parte) — [Verificado]

- `apps/shared/review-ui.js:9-17` ya usa un único temporizador por página y `sharedState` agrupa las lecturas concurrentes (`review-ui.js:1-8`). `trimTakeCards` (`review-ui.js:18-22`) ya cuenta solo `.clip` y protege las tarjetas pendientes o editadas, con prueba en `tests/review-polling.test.mjs`.
- Lo que sigue pendiente: el intervalo continúa mientras haya **cualquier** panel conectado, aunque todas sus revisiones estén terminadas (`review-ui.js:12-16`). Además, `/api/state` sigue devolviendo todo el catálogo (`backend/lab.mjs:114`: `json({audios:db.audios,configs:db.configs,runs:db.runs.map(viewRun),reviews:db.reviews,reviewDocuments:…})`).
- PoC `s4-perf.mjs` (H): `/live` con una sola toma terminada y su revisión `completed`, sin nada pendiente, hace **10 peticiones `/api/state` en 15 s**. El laboratorio también hace 10 en 15 s (`lab.js:55` comparte caché con el panel).
- No volví a medir el tamaño real: CODE_REVIEW midió 1.220.916 bytes por respuesta con el catálogo de entonces.
- **Impacto**: CPU y parseo de JSON en el hilo principal del PC cada 1,5 s, proporcional al historial, que va creciendo.
- **Riesgo de corregir**: medio, porque el panel se actualiza solo por este sondeo.
- **Propuesta**: suscribir solo los paneles con revisión `queued/running` o con documento recién cambiado, y desuscribir al terminar. A más largo plazo, un endpoint acotado (`/api/reviews?runId=`).
- **Después del hackathon** (la versión mínima, «no sondear si nada está pendiente», podría entrar antes del 4-nov si se prueba con `review-polling.test.mjs`).

### M4 · El laboratorio reenvía `/api/reviews/shown` en cada re-render y contamina la medición «mostrada tras texto» — [Verificado]

- `apps/shared/review-ui.js:37` (`shown=new Set()` es local a cada montaje) y `:57`
  ```js
  if(latest?.status==='completed'&&!shown.has(latest.id)){shown.add(latest.id);void api('/api/reviews/shown',{id:latest.id,elapsedMs:performance.now()-seenAt,context:initialState?'laboratory-history':'live-final'})…
  ```
- `apps/lab/lab.js:44` hace `renderResults()` cada vez que cambia `runs`, y `lab.js:37` vuelve a montar `mountReview` en paneles nuevos.
- `backend/lab.mjs:148` guarda como máximo 10 `uiMeasurements` por revisión.
- PoC `s5-lab.mjs`: con una toma revisada a la vista y otra ejecución en curso que cambia `runs` en cada consulta, salen **10 POST `/api/reviews/shown` en 15 s** desde el laboratorio.
- **Impacto**: cada entrada `laboratory-history` mide el tiempo desde el *montaje del panel*, no desde la llegada del texto, así que no tiene valor de latencia. Además puede llenar el tope de 10 y bloquear mediciones posteriores de `live-final`. Esto va contra los criterios de AGENTS.md (instrumentación fiable y su propio sobrecosto).
- **Riesgo de corregir**: bajo.
- **Propuesta**: no enviar `shown` desde `initialState` (laboratorio), o deduplicar por `reviewId+context` en el servidor. Documentarlo en METRICS.md y marcar como dudosas las entradas `laboratory-history` ya guardadas.
- **Seguro antes del 4-nov.**

### M5 · Texto clínico persistente en `localStorage` sin caducidad; Revisor Meta activado por defecto — [Lectura; cuota verificada]

- `apps/desktop/report-editor.js:36` guarda `localStorage.setItem(key,model.committed())` y `('dicta-report-context-v1',JSON.stringify(activeTemplate))` en **cada** `render`.
- `report-editor.js:5` lo restaura al cargar.
- No hay caducidad ni limpieza al copiar. Solo se vacía con «Reiniciar sesión» o «Conectar» (A1).
- En un PC compartido, el último informe queda legible en texto plano para cualquiera que abra el perfil del navegador. PHASE_9 documenta la persistencia, pero no esta consecuencia.
- `apps/desktop/live.js:13`: `reviewToggle.checked=true`. El texto de la casilla es honesto («envía toma, contexto del informe y plantilla a Meta»), pero el valor por defecto envía hasta 10.000 caracteres del informe (`report-editor.js:10`) a un tercero.
- **Impacto**: privacidad y gobierno de datos. No es un fallo técnico.
- **Riesgo de corregir**: bajo en código, alto en experiencia de uso (requiere decidir el producto).
- **Propuesta**: botón «Limpiar informe de este navegador», aviso visible de persistencia, opción de caducidad, y revisor por defecto según la decisión registrada en EXPERIMENTS.md.
- **Después del hackathon** (decisión de producto). Antes del 4-nov basta con documentar el riesgo en la demo.

### M6 · La copia manual de respaldo (Ctrl+C) lleva HTML con estilos al portapapeles — [Verificado]

- `apps/desktop/report-editor.js:54`: si `navigator.clipboard.writeText` falla, el mensaje dice «Selecciona el informe y copia con Ctrl+C». No hay manejador `copy` en el editor; solo existen `paste` (`:48`, que fuerza texto plano) y `drop`.
- PoC `s6-ctrlc.mjs` (Ctrl+A, Ctrl+C en el editor): portapapeles con `text/plain` y además `text/html` = `<span style="… font-family: &quot;Segoe UI&quot; … font-size: 24px … background-color: rgb(255, 255, 255) …">TÉCNICA\nSin derrame.</span>`.
- **Impacto**: si el RIS acepta texto enriquecido, el informe se pega con fuente, tamaño y fondo de Dicta Libre, contra la promesa de «texto plano».
- **Riesgo de corregir**: bajo.
- **Propuesta**: `editor.addEventListener('copy',e=>{e.preventDefault();e.clipboardData.setData('text/plain',getSelection().toString());})`, y lo mismo para `cut`, actualizando el modelo.
- **Seguro antes del 4-nov.**

---

## Bajo

### B1 · El aviso de fallo de guardado (cuota) se sobrescribe; la plantilla muestra un error del navegador en inglés — [Verificado]

- `report-editor.js:36`: `catch{status.textContent='No se pudo guardar en este navegador. Copia el informe antes de salir.';}`. Después, `finish` (`:67`) pone `status.textContent='Toma incorporada…'`.
- PoC `s3-quota.mjs`, con `localStorage` lleno hasta `QuotaExceededError` (5.242.879 caracteres):
  - Tras escribir, el estado muestra el aviso correcto y `persistido="T"` (desactualizado).
  - Tras una toma, el estado pasa a «Toma incorporada…» y lo persistido sigue en `"T"`, mientras el editor muestra «Texto sintético Nódulo de 5 mm.».
  - Al guardar una plantilla aparece «Failed to execute 'setItem' on 'Storage': … exceeded the quota.» En ese caso no se muestra un éxito falso.
- `event()` (`report-editor.js:35`) traga el error en silencio, lo que es correcto para métricas.
- **Propuesta**: un indicador persistente de «no guardado» hasta el próximo guardado correcto, y traducir `QuotaExceededError`. **Seguro antes del 4-nov.**

### B2 · El panel «Plantillas» abierto tapa Deshacer, A−/A+ y «Revisar informe», y no se cierra al crear el informe — [Verificado]

- `report-editor.js:56-57,61`: el `details.template-library-panel` se inserta en `controls` y no se cierra tras `use.onclick` (`:50`).
- PoC `s1-xss.mjs`: Playwright no pudo pulsar «Revisar informe» («`<details open class="template-library-panel">` intercepts pointer events») y hubo que cerrar el panel por código. Captura: `docs/revision/sondas/poc/panel-open.png`.
- **Propuesta**: `templatePanel.open=false` tras «Crear informe», y no superponer el panel a la barra. **Seguro antes del 4-nov.**

### B3 · Aceptar una propuesta cuando otra toma activa empieza justo al final de la anterior lanza «Destino ocupado por otra toma.» — [Verificado en modelo; UI por lectura]

- `report-model.js:7`: `overlaps` considera solapada una inserción vacía en el borde.
- `report-model.js:9` lanza `Error('Destino ocupado por otra toma.')`.
- `report-editor.js:67`: `review(id,old,next){const change=model.review(id,old,next);…}` no está envuelto en `safe`.
- `m1-model.mjs`: `reviewAdyacente: "THROW: Destino ocupado por otra toma."`.
- Lo que sigue se deduce del código:
  - En `review-ui.js:44-45`, el documento de la toma ya quedó aceptado en el servidor cuando falla `onChange`. La nota muestra el texto de la excepción y no la explicación prevista en `:45`. No hay reintento, porque `doc` ya cambió.
  - Por la vía del sondeo (`:50`), el `throw` termina en «Revisor no disponible: …» (`:70`).
- No hay éxito falso, pero el mensaje confunde y el informe y la toma quedan divergentes.
- **Propuesta**: envolver la llamada en `safe`, devolver `false` y mostrar el mensaje de `:45`. **Seguro antes del 4-nov.**

### B4 · `textDiff` ambiguo bloquea ediciones legítimas fuera de la toma activa o invalida asociaciones — [Verificado en modelo]

- `report-model.js:2` (prefijo/sufijo común) y `:13`.
- `m1-model.mjs`: con texto `'AB AB'`, toma activa en [3,5] y el usuario borrando el primer «AB », el diff es `{start:2,end:5}` y el resultado es «THROW: El fragmento provisional está protegido…».
- Es conservador (no corrompe texto, y `review` comprueba igualdad literal en `:14`), pero rechaza ediciones válidas con texto repetido, frecuente en plantillas («Sin alteraciones.»).
- **Propuesta**: calcular el diff a partir de `beforeinput.getTargetRanges()` o de la selección previa. **Después del hackathon.**

### B5 · Coste por parcial: reconstrucción completa, persistencia y métricas en cada borrador (P2 de CODE_REVIEW, vigente) — [Verificado]

- `report-editor.js:40-41`: `editor.replaceChildren()`, reconstrucción del texto completo, `persist()` (2 `setItem`) y `reportReview?.changed()` (dos `JSON.stringify` del texto, `report-review.js:14,17`).
- `report-editor.js:35`: `event()` serializa hasta 1000 eventos a `localStorage` en cada parcial.
- PoC `s4-perf.mjs` (Chromium headless, 100 parciales, p50/p95 de `preview()` completo):

  | Informe | p50 | p95 |
  |---|---|---|
  | 1.000 caracteres | 0,5 ms | 0,7 ms |
  | 5.000 caracteres | 1,1 ms | 1,5 ms |
  | 20.000 caracteres | 3,2 ms | 4,1 ms |
  | 50.000 caracteres | 8,0 ms | 16,2 ms |

  El modelo solo, sin DOM, queda por debajo de la resolución del reloj (0,1 ms).
- `s5-lab.mjs`: con 5.000 caracteres, después de 1000 parciales (las métricas ya ocupan 95.021 caracteres en `localStorage`), el p50 sube de 1,9 a **4,2 ms** (p95 5,6 ms).
- Para tomas cortas e informes típicos no es crítico. El coste lo dominan la persistencia y las métricas, no el modelo.
- `elapsedMs` de `preview` se calcula antes de `event()` (`:67`), así que excluye la serialización de métricas (P2 de CODE_REVIEW, vigente).
- Otros puntos vigentes:
  - `history` sin límite (`report-model.js:11,13`). `m1-model.mjs` reproduce el dato de CODE_REVIEW: 1000 ediciones dejan 1000 entradas y 5.599.500 caracteres lógicos (49 ms).
  - El mapa `starts` nunca se vacía (`report-editor.js:67`, solo `set/get/has`).
- **Propuesta**: no persistir en `preview` (solo el texto consolidado y con *debounce*), métricas en memoria con volcado al exportar o finalizar, actualizar solo el `span` provisional, y limitar o agrupar el historial. **Después del hackathon**, salvo «no persistir en preview», que es seguro y simple.

### B6 · La inserción en medio de una palabra o frase no añade separador — [Verificado en modelo]

- `report-model.js:8`: `prefix` solo se aplica si `start===this.text.length`.
- `m1-model.mjs`: con «Hígado normal.Bazo normal.», insertar en la posición 14 da «Hígado normal.Páncreas normal.Bazo normal.».
- **Propuesta**: aplicar el separador según el carácter previo y el siguiente, en cualquier posición. **Después del hackathon** (afecta a `review`, que compara `a.prefix+old`).

### B7 · Deshacer funciona por carácter y no hay Rehacer — [Lectura]

- `report-editor.js:44`: cada evento `input` llama a `model.edit`, que hace `history.push` (`report-model.js:13`). Ctrl+Z deshace de a una tecla.
- `report-editor.js:46`: `historyRedo` se previene y no hace nada (Ctrl+Y queda mudo).
- **Propuesta**: agrupar las ediciones manuales por pausa o palabra, y agregar Rehacer o desactivar el atajo con un mensaje. **Después del hackathon.**

### B8 · Un error posterior a `finish` muestra «No se pudo transcribir» aunque el texto ya se insertó — [Lectura]

- `live.js:103-118`: después de `reportEditor.finish(...)` se ejecutan `mountReview`, `run.formatting.elapsedMs.toFixed`, `run.configuration.model`, etc.
- Si alguno lanza, `catch` (`:126`) llama a `reportEditor.cancel` (no hace nada, porque la toma ya está inactiva) y pone «No se pudo transcribir: …».
- Probabilidad baja: requiere un `run` incompleto del servidor.
- **Propuesta**: mover la presentación fuera del `try` de transcripción, o marcar `inserted=true`. **Seguro antes del 4-nov.**

### B9 · `api()` parsea el JSON antes de comprobar `ok` — [Lectura]

- `live.js:70`, `review-ui.js:24`, `report-review.js:2`, `lab.js:7`: `const value=await response.json();if(!response.ok)throw Error(value.error)`.
- Si un proxy o túnel devuelve HTML (502), el usuario ve «Unexpected token '<'…». Si `error` no viene, el mensaje queda vacío («No se pudo transcribir: »).
- **Propuesta**: un `api()` común con mensaje de respaldo. **Seguro antes del 4-nov.**

### B10 · La página `/live` pierde la marca «PROTOTIPO» y conserva textos estáticos obsoletos — [Lectura]

- `apps/desktop/index.html:5` dice `CAPTURA + TRANSPORTE · PROTOTIPO`, pero `live.js:6` lo reemplaza por `'DICTADO · MUSE / WHISPER'`.
- `index.html:19,22,39` («RECONOCIMIENTO PENDIENTE», «El reconocimiento de voz aún no está integrado», «FASES 01 + 02») solo son correctos en la ruta `/` del servidor demo (`backend/server.mjs:11`). En `/live` los parchea `live.js:7-10`.
- En `/live` no queda ningún aviso permanente de «experimental / no validado clínicamente» junto al editor. Solo aparece en el Revisor («experimental», `review-ui.js:27`) y tras la revisión global (`report-review.js:23`).
- **Propuesta**: etiqueta fija «Prototipo de investigación · sin validación clínica» en `/live`. **Seguro antes del 4-nov.**

### B11 · `stream-client.js` usa `ws://` fijo — [Lectura]

- `apps/desktop/stream-client.js:3`: `new WebSocket(\`ws://${location.host}/asr-stream\`)`.
- Funciona en `http://127.0.0.1:8789/live`, que es el uso documentado. Si `/live` se sirviera por HTTPS (túnel), el navegador lo bloquearía como contenido mixto. Otros clientes ya eligen el esquema (`client.js:10`).
- **Después del hackathon.**

### B12 · Mantenibilidad: densidad, duplicación y parches por capas — [Verificado con conteos]

- Líneas largas: `report-editor.js` tiene 68 líneas y la mayor (`:67`) llega a 1.684 caracteres. En `live.js:34` son 909, en `apps/shared/style.css:59` son 3.658 y en `apps/lab/style.css:1` son 3.319. Hay 39 líneas de más de 400 caracteres en los JS revisados.
- Duplicación:
  - `api()` está implementada 4 veces (`live.js:70`, `review-ui.js:24`, `report-review.js:2`, `lab.js:7`), con diferencias sutiles: solo `report-review` tiene mensaje de respaldo.
  - El helper `node/el` aparece 4 veces.
  - La descarga por `createObjectURL` aparece 6 veces (`desktop.js` ×3, `live.js`, `report-editor.js`, `lab.js`).
  - La normalización de acentos está repetida (`report-editor.js:17`, `lab.js:60`).
- Parches superpuestos:
  - `report-editor.js:12` crea el título «Informe · plantillas y dictado» y `:58` lo cambia a «Informe».
  - `status`, `help` y `exportButton` reciben `className` dos veces (`:30,32,63`).
  - `filters` se añade a `section` (`:14`) y luego se mueve (`:57`).
  - `live.js:44-68` reubica DOM de `index.html`.
  - La regla `.report-editor` está definida 3 veces (`style.css:56,59,60`).
- Funciones ausentes: no hay forma de eliminar plantillas propias (no existe `delete`, `eliminar` ni `borrar` en `report-editor.js`, salvo `favorites.delete`). La clave de favorita de una plantilla propia incluye su texto completo (`:16`).
- Sin sincronización entre pestañas: no hay listener de `storage`, así que dos pestañas `/live` se sobrescriben. Está documentado en PHASE_9.
- `renderResults` del laboratorio reconstruye comparación, historial y paneles en cada cambio (`lab.js:22-43`), cerrando `<details>` y reiniciando reproductores. Sigue haciendo dos `JSON.stringify(next.runs)` (`lab.js:44`), punto P2 de CODE_REVIEW vigente.
- **Propuesta**: un módulo `shared/http.js` + `shared/dom.js`, formateo con Prettier sin cambio de lógica, y eliminar los textos estáticos que `live.js` reescribe. **Después del hackathon** (reformatear antes de la entrega cambia los hashes de las mediciones, `sourceHash` en `lab.mjs:67`).

---

## Seguridad DOM / XSS, CSP, portapapeles y localStorage (detalle)

### Inventario de sumideros HTML (`grep innerHTML|insertAdjacentHTML|outerHTML|document.write|on*=|href=|src=`)

| Ubicación | Dato | Escapado | Resultado |
|---|---|---|---|
| `desktop.js:136` `$('qr').innerHTML = qr.createSvgTag({scalable:true,margin:2})` | SVG generado por `qrcode-generator`, a partir del enlace (origen del servidor y token/código del relay) | El dato no se incrusta en el SVG: solo se generan `rect` y `path`. `alt` y `title` no se usan. | **[Verificado]** `s2-editor.mjs` (F): enlace con `"><script>`, el SVG no contiene el dato, no hay `<script>` y 0 violaciones CSP. Es el único `innerHTML` del alcance. |
| `report-editor.js` (todas las cadenas: nombre, texto, categoría, rutas y avisos de plantilla; vista previa; estado) | Plantillas importadas o propias, mensajes | `textContent`, `new Option(text)`, `node(tag,text)` | Seguro. |
| `review-ui.js:60-62` (original, propuesta y motivo del Revisor) | Respuesta de Meta | `el()`→`textContent` | Seguro. |
| `report-review.js:29` (avisos y citas de la revisión global) | Respuesta de Meta | `textContent` | Seguro. |
| `live.js:34,102,106-108,115,121,126` (parciales, texto final, transcripción original, errores del servidor) | ASR y servidor | `textContent` / `createTextNode` | Seguro. |
| `lab.js:10,14,27-40,46,53` (nombres de archivo, textos ASR, diff WER, errores) | Nombres de archivo, ASR | `node()`→`textContent`, `createTextNode` | Seguro. |
| `mobile.js` (mensajes `m.reason`, `m.message`, `error.message`) | Relay | `status()`→`textContent` (`client.js:3-5`) | Seguro. |
| `href`: `live.js:86` `/?audio=${encodeURIComponent(audio.id)}`; `review-ui.js:35` y `lab.js:20` `/api/audio/${id}` sin codificar; `desktop.js:137` `phone-link.href=link` | IDs del servidor; enlace del relay | Mismo origen, IDs `randomUUID` del servidor (`lab.mjs:131`) | Sin riesgo práctico (bajo: codificar el `id` por coherencia). |
| Manejadores `on*` | Todos se asignan desde JS como propiedades, nunca como atributos HTML con datos | — | Seguro. |

**PoC de explotación — [Verificado, descartado]**: `s1-xss.mjs` inyecta `<img src=x onerror=…>` y `<svg onload=…>` en nombre, categoría, texto, ruta y avisos de plantilla (`/api/templates`); en el texto ASR; en original, propuesta y motivo del Revisor; en avisos y citas de la revisión global; en el mensaje de error de `/api/runs` (HTTP 500); y en el nombre de audio del laboratorio. Se ejecutó **con CSP y con `bypassCSP:true`**, para comprobar que el escape no depende de la CSP. Resultado en ambos: `window.__xss=0`, 0 nodos `img`/`svg[onload]` creados, 0 violaciones CSP, y la carga aparece como texto literal (en el editor, la sugerencia, la tarjeta de error y la etiqueta del audio).

### CSP

Existe. **[Verificado]**: la cabecera servida por `createLab` para `/live` es `default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'`, más `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer` (`backend/lab.mjs:103`). `backend/server.mjs:31` añade `img-src 'self' data:`, `worker-src` y `form-action`. Los estilos se aplican por CSSOM (`editor.style.fontSize`, `previewText.style.whiteSpace`), que `style-src 'self'` permite: 0 violaciones en los PoC. Mejora menor posible en lab: `form-action 'self'`.

### Portapapeles

- `report-editor.js:54` usa solo `navigator.clipboard.writeText(model.text)`: texto plano, sin `execCommand` de respaldo. Muestra «✓ Informe copiado» **solo después** de que la promesa se resuelve.
- **[Verificado]** `s2-editor.mjs` (C1): el contenido leído del portapapeles es idéntico al informe y el único tipo es `text/plain`. Antes se ofreció «Este texto no tiene una revisión global vigente…» con «Copiar sin revisar».
- C2 (`writeText` rechaza) y C3 (sin `navigator.clipboard`): el botón muestra «No se pudo copiar» con la instrucción manual. **No hay éxito falso.**
- El botón queda inhabilitado mientras hay tomas pendientes (`:41`, `copy.disabled=model.pending`).
- El respaldo manual sugerido copia HTML: ver M6.
- `desktop.js:139` («Copiar enlace») también confirma solo tras el éxito.

### localStorage

| Clave | Contenido | ¿Texto clínico? | Límite |
|---|---|---|---|
| `dicta-report-v1` | Informe consolidado (nunca el borrador) | **Sí** | Sin límite propio |
| `dicta-report-context-v1` | Nombre, categoría y texto de la plantilla aplicada | Posible (plantillas propias) | — |
| `dicta-templates-v1` | Plantillas propias | Posible | 20.000 caracteres por plantilla, cantidad ilimitada (`:49`) |
| `dicta-template-favorites-v1` | IDs; para las propias, `'own:'+nombre+'|'+texto` | Posible | — |
| `dicta-editor-metrics-v1` | Hasta 1000 eventos (tipo, tiempos, conteos, IDs de toma/run, userAgent). Sin texto del informe; `blocked.reason` son mensajes fijos del modelo | No | ≈95.000 caracteres con 1000 eventos (verificado) |
| `dicta-haptics…` (`mobile.js:13,19`) | Preferencia de vibración | No | — |

`QuotaExceededError` se captura en todos los `setItem` (`report-editor.js:5,9,15,35,36`). En plantillas y favoritas lo hace `safe()`. Los problemas de mensaje están en B1.

---

## Correctitud del editor: comprobaciones que pasan

- **Borrador streaming y protección [Verificado]** (`s2-editor.mjs` E): al seleccionar «Sin derrame pleural.» y recibir el parcial «Pequeño derrame», el editor muestra «A. Pequeño derrame Z.» con `span.dictation-provisional`. Escribir dentro queda bloqueado («El fragmento provisional está protegido…») y el texto no cambia.
- **Cancelación por error [Verificado]**: al cortarse el WebSocket antes del final, se restaura exactamente «A. Sin derrame pleural. Z.», con el estado «Toma cancelada. Se recuperó el texto anterior.» y la tarjeta «No se pudo transcribir: Streaming desconectado…».
- Los casos de selección, finales fuera de orden, deshacer, revisión desactualizada y Unicode los cubren las 8 pruebas de `report-model` (pasan). La UI de copia y revisión global (respuesta tardía y edición que invalida) la cubre `report-review.test.mjs` (pasa).
- **Invalidación por edición**: `report-model.js:14` exige igualdad literal antes de aplicar una propuesta (`review` devuelve `null`). La UI informa «Guardado en esta toma. El informe se editó por separado…» (`review-ui.js:45`). Excepción: B3.
- **Sin acumulación de listeners [Lectura]**: `selectionchange`, `dicta-*` y `MutationObserver` se registran una vez por carga. Los suscriptores de revisión se purgan al desconectarse el panel (probado en `review-polling.test.mjs`). Los temporizadores de copia y emparejamiento se limpian. `pagehide` cancela los streams (`live.js:72`).

---

## Vigencia de CODE_REVIEW_2026-11-01

| Hallazgo previo | Estado actual | Evidencia |
|---|---|---|
| P1 Consultas repetidas por panel | **Corregido en parte**: ya hay un intervalo por página, coalescencia y recorte correcto. Sigue el sondeo completo en reposo. | `review-ui.js:1-22`; `tests/review-polling.test.mjs`; PoC M3 (10 req/15 s) |
| P1 operativa: túnel temporal | Fuera del alcance frontend. El frontend no muestra la URL vigente. Agrava A1 (reconectar borra el informe). | — |
| P2 Escritura síncrona y estado completo | **Vigente** | `lab.mjs:62` `save()` con `writeFileSync` y `JSON.stringify(db,null,2)`; `lab.mjs:114`; `lab.js:44` doble `stringify` |
| P2 Editor reconstruye y guarda de más; historial ilimitado; `starts` | **Vigente** | B5; `m1-model.mjs` repite 1000 entradas / 5.599.500 caracteres |
| P2 La instrumentación excluye su coste; `sourceHash` al inicio | **Vigente** | `report-editor.js:67`; `lab.mjs:67` |

---

## Fortalezas verificadas

1. **Sin XSS en todo el alcance**: todo texto externo (ASR, Meta, plantillas, errores, nombres de archivo) se inserta con `textContent`, `createTextNode` u `Option`. La PoC `s1-xss.mjs` lo confirma incluso sin CSP.
2. **CSP restrictiva**, `nosniff`, `no-referrer` y `frame-ancestors 'none'` en lab y demo. Control de `Host`, `Origin` y `Sec-Fetch-Site` en la API local (`lab.mjs:106-108`).
3. **Copia honesta**: texto plano exacto, confirmación solo tras un éxito real y mensaje de fallo sin falsos positivos (C1–C3).
4. **El borrador nunca se persiste como final**: `persist()` usa `model.committed()`. El texto provisional queda protegido y la cancelación restaura con exactitud (E).
5. **Pegado forzado a texto plano** (`report-editor.js:48`) y arrastre bloqueado.
6. **Copiar sin revisión vigente ofrece revisar o continuar**. Nunca copia automáticamente tras revisar (C1 y `report-review.test.mjs`).
7. **Las propuestas se aplican al informe solo si el fragmento sigue intacto**, por igualdad literal (`report-model.js:14`).
8. **Se corrigió la multiplicación de temporizadores por panel**, con prueba unitaria.
9. **El contexto enviado a Meta está acotado** (200/3000/10000 caracteres, `report-editor.js:10`) y sin rutas de archivo, aunque las rutas sí se muestran localmente en la vista previa.

---

## Textos de producto revisados

| Texto visible | Ubicación | Valoración |
|---|---|---|
| «CAPTURA + TRANSPORTE · PROTOTIPO» | `apps/desktop/index.html:5` (reemplazado en `/live` por `live.js:6` «DICTADO · MUSE / WHISPER») | En `/live` se pierde «prototipo» (B10) |
| «Conecta tu S25 Ultra por Wi-Fi o datos móviles.» | `apps/desktop/index.html:9` | Específico del dispositivo de referencia; puede confundir a otros usuarios |
| «RECONOCIMIENTO PENDIENTE», «El reconocimiento de voz aún no está integrado.», «DICTA LIBRE · FASES 01 + 02» | `apps/desktop/index.html:19,22,39` | Correctos en `/` del servidor demo; en `/live` los sobrescribe `live.js` |
| «✓ Integridad verificada» | `apps/desktop/desktop.js:66` | Se refiere a la coincidencia de hash del transporte, con detalle SHA-256 en `:69`. Aceptable; podría decir «Transporte íntegro» |
| «Descargar WAV sintético» | `apps/desktop/desktop.js:72` | **Engañoso** con voz real (M2) |
| «✓ El PC recibió exactamente el mismo audio.» | `apps/mobile/mobile.js:179` | Correcto (bytes idénticos) |
| «Revisor Meta al terminar cada toma (envía toma, contexto del informe y plantilla a Meta)» (activado por defecto) | `apps/desktop/live.js:13` | Texto honesto; valor por defecto discutible (M5) |
| «Audio y resultados se guardan en el laboratorio local.» | `apps/desktop/live.js:40` | Honesto |
| «Revisor Meta opcional con aprobación humana.» | `apps/desktop/live.js:8` | Honesto |
| «Borrador guardado solo en este navegador. Revisa también el contenido heredado de la plantilla.» | `apps/desktop/report-editor.js:32` | Honesto; queda incorrecto si falla el guardado y se sobrescribe el aviso (B1) |
| «Importada · revisión profesional pendiente.» / «Plantilla propia, guardada en este navegador.» | `apps/desktop/report-editor.js:20` | Honesto |
| «Informe creado. El contenido de plantilla requiere tu revisión…» | `apps/desktop/report-editor.js:50` | Honesto |
| «✓ Informe copiado» / «Informe copiado. Puedes pegarlo en el RIS.» | `apps/desktop/report-editor.js:54` | No afirma integración con RIS; solo aparece tras un éxito real |
| «Revisión opcional del texto completo y contexto de plantilla. Envía texto a Meta; no modifica el informe.» | `apps/desktop/report-review.js:8` | Honesto |
| «Este texto no tiene una revisión global vigente. Puedes revisarlo o copiarlo sin revisión.» | `apps/desktop/report-review.js:11` | Honesto |
| «Meta no señaló inconsistencias. Esto no valida clínicamente el informe.» | `apps/desktop/report-review.js:23` | Buen descargo |
| «Revisor Meta · experimental», «… observación(es) · aplicación manual», «Meta no señaló dudas en esta revisión» | `apps/shared/review-ui.js:27,55` | Honesto; la última frase podría añadir «no garantiza ausencia de errores» |
| «Comprobar dato sensible» / «Sin sustitución propuesta. Escucha y revisa este fragmento.» | `apps/shared/review-ui.js:60-61` | Adecuado |
| «LABORATORIO · LOCAL» | `apps/lab/index.html:3` | Correcto |
| «Búsqueda Whisper (1 validado; otras variantes no disponibles en este runtime GPU)» | `apps/lab/index.html:7` | «validado» se refiere al runtime, no a lo clínico; podría leerse mal («1 probado») |
| «… el WER no evalúa seguridad clínica.» | `apps/lab/index.html:10` | Buen descargo |
| «No hay transcripciones simuladas.» | `apps/lab/index.html:11` | Correcto |
| «Referencia revisada · editar y evaluar precisión» | `apps/lab/lab.js:63` | «precisión» = WER; aceptable dentro del laboratorio |
| «Muse estimado USD … estimación, no factura.» | `apps/lab/lab.js:21` | Honesto |

No encontré en la interfaz afirmaciones de validación clínica, «seguro», precisión garantizada ni integración directa con RIS o PACS.
