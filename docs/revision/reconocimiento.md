# Revisión técnica · Reconocimiento de voz, formato y Revisor Meta

Fecha: 02-11-2026. Revisión **solo lectura** de `/home/user/dictalibre-meta`, HEAD `654bed8` (árbol limpio salvo `CLAUDE.md` y `docs/` sin seguimiento). No se modificó ningún archivo del repositorio. Todos los scripts auxiliares y resultados están en el scratchpad (`docs/revision/sondas/`).

Entorno de esta revisión: contenedor Linux, Node v22.23.4, 4 vCPU Intel Xeon 2,10 GHz. **Sin** credencial Meta, GPU, modelo Whisper ni `scipy` (el worker Python no puede ejecutarse aquí). No se llamó a ningún servicio externo. Las mediciones de tiempo de esta máquina **no** representan el PC de referencia (Windows + Intel Arc).

Convención: **[verificado]** = ejecutado aquí (se indica el comando); **[código]** = leído en el código con cita exacta, sin ejecutar; **[inferido]** = depende del comportamiento del proveedor o del hardware, no comprobable aquí.

## Pruebas ejecutadas

| Comando | Resultado |
|---|---|
| `node --test tests/muse-stream.test.mjs tests/lab.test.mjs tests/number-format.test.mjs tests/dictation-commands.test.mjs tests/speech-turns.test.mjs tests/meta-review.test.mjs tests/report-review.test.mjs tests/meta-key.test.mjs tests/review-polling.test.mjs` | 37/37 aprobadas |
| `python3 -m unittest discover -s tests -p 'test_*.py'` | 5/5 aprobadas |
| `node docs/revision/sondas/fmt-cases.mjs [frases…]` | 72 frases sintéticas por `formatNumbers` → `formatDictation` (el mismo orden que `lab.mjs:92-93` y `:197`) |
| `node docs/revision/sondas/guard-cases.mjs` + `node -e` (negación movida) | 20 propuestas sintéticas pasadas por `validateReview` |
| `node docs/revision/sondas/stream-probe.mjs` | 5 escenarios de streaming con un proveedor WebSocket falso local |
| `node docs/revision/sondas/worker-probe.mjs docs/revision/sondas/fakepy.sh` | `LocalWorker` con un intérprete falso: cae, se reinicia, se cuelga, recibe llamadas concurrentes |
| `node docs/revision/sondas/save-bench.mjs` | Costo de `save()` (stringify + write + rename) sobre catálogos sintéticos |
| `node -e` (bench de formato) | Latencia de formato según el largo del texto |

---

## Estado de los hallazgos de CODE_REVIEW_2026-11-01

| Hallazgo previo | Estado hoy | Evidencia |
|---|---|---|
| P1 · consultas repetidas de `/api/state` y recorte de tarjetas roto | **Mitigado en parte.** `sharedState` deja una sola petición en vuelo con caché de 150 ms y un temporizador compartido (`apps/shared/review-ui.js:3-17`). `trimTakeCards` cuenta solo `.clip` y protege las tarjetas pendientes o editadas (`review-ui.js:18-22`); `tests/review-polling.test.mjs` lo cubre. **Sigue vigente**: cada consulta devuelve el catálogo completo (`lab.mjs:114`) y una toma pendiente consulta cada 250 ms (`live.js:98,123`). | [código] + [verificado] (las pruebas pasan) |
| P1 operativa · túnel temporal | Fuera de este alcance; no verificado. | — |
| P2 · escritura síncrona y respuesta con todo el historial | **Vigente sin cambios** (`lab.mjs:62`, `:114`). Además crece más rápido de lo descrito (ver M3). | [código] + [verificado] (bench) |
| P2 · editor reconstruye y guarda de más | Fuera de este alcance (`report-editor.js` / `report-model.js`); no reverificado. | — |
| P2 · la instrumentación no mide su propio costo; `sourceHash` se calcula solo al iniciar | **Vigente**: `sourceHash` se calcula una vez al arrancar (`lab.mjs:67`). | [código] |

---

## Hallazgos por severidad

### CRÍTICO

#### C1 · «punto»/«coma» entre dos cardinales siempre se convierte en decimal y no deja advertencia: se fabrican cifras silenciosamente
- `backend/number-format.mjs:8`: ``const pattern=new RegExp(`…${sequence}(?:[ \\t]+(?:coma|punto)[ \\t]+${sequence})?…`)``. También `:23`: `const pieces=spoken.split(/\s+(?:coma|punto)\s+/iu);`
- La heurística `possible_decimal` de comandos (`backend/dictation-commands.mjs:16`) nunca alcanza a actuar: cuando corre, la etapa numérica ya consumió el «punto». En vivo los números están siempre activos: `stream-client.js:6` envía `numbersEnabled:true` fijo, y `live.js:93` no envía el campo, así que se usa el valor por defecto `true` (`lab.mjs:170`).
- **[verificado]** (`fmt-cases.mjs`), sin ninguna advertencia en `numWarn` ni en `cmdWarn`:
  - «segmento ocho punto dos quistes simples» → `Segmento 8,2 quistes simples`
  - «nódulos tres punto uno de ellos calcificado» → `Nódulos 3,1 de ellos calcificado`
  - «hiperintenso en T dos punto dos lesiones más» → `Hiperintenso en T 2,2 lesiones más`
  - «quistes en segmento siete punto Dos imágenes quísticas» → `… segmento 7,2 imágenes quísticas` (la mayúscula del ASR no evita la conversión)
  - «segmentos seis coma siete» (enumeración) → `Segmentos 6,7`
  - «lesiones de dos coma tres coma cinco milímetros» → `Lesiones de 2,3 coma 5 milímetros`. Aquí sí hay una advertencia, pero solo sobre la segunda «coma»; la primera ya quedó convertida en 2,3.
- **Impacto**: una cifra que no se dictó (8,2 o 6,7) y una oración perdida llegan al informe sin acción del usuario. El original solo se ve en «Ver transcripción original» (`live.js:106`). Es un cambio de cifra y de conteo de lesiones. `DICTATION_COMMANDS.md` afirma que las heurísticas «conservan posibles decimales («3 punto cinco»)», pero eso solo ocurre con los números desactivados.
- **Riesgo de corregirlo**: alto. «uno punto cinco centímetros» → `1,5 centímetros` es el caso correcto y frecuente, y está fijado en `tests/number-format.test.mjs` (`'tres punto cinco'` → `3,5`). Cualquier regla nueva puede romperlo.
- **Propuesta**: (1) no tocar el texto; marcar `possible_sentence_boundary` / `possible_enumeration` cuando lo que sigue al decimal no es una unidad (mm, cm, milímetros, %, «por») o es un sustantivo o una palabra con mayúscula del ASR, y mostrar el aviso en la tarjeta; (2) después, evaluar dejar de convertir «punto» y aceptar como decimal solo «coma», o solo cuando sigue una unidad, con un corpus del responsable.
- **Seguro antes del 4-nov**: solo documentar la limitación en `DICTATION_COMMANDS.md`/`EXPERIMENTS.md`, agregar estas frases al guion de prueba y recomendar en la demo no encadenar «punto» con una oración que empieza con un número. **Cambio de regla o de advertencias: después del hackathon**, con pruebas y aprobación del responsable.

### ALTO

#### A1 · El validador del Revisor deja pasar como reemplazo de un clic inversiones semánticas, órganos intercambiados, hallazgos añadidos y negaciones movidas
- `backend/meta-review.mjs:10`: `const sensitiveTokens=text=>(text.toLowerCase().match(/\b(?:no|sin|con|ni|ausencia|presencia|derech\w*|izquierd\w*|…|cien|mil)\b|\d+(?:[.,]\d+)*/gu)…`
- `meta-review.mjs:20`: `const protectedChange=s.replacement!==null&&sensitiveTokens(s.original)!==sensitiveTokens(s.replacement);`
- **[verificado]** (`guard-cases.mjs`): todas estas propuestas salen con `guarded:false` y un botón de reemplazo:
  - hipodensa→hiperdensa, lóbulo superior→inferior, segundo→tercer arco, dieciséis→diecisiete milímetros
  - Aumento→Disminución, ausente→presente, Proximal→Distal, positivo→negativo, benigna→maligna, 40 UH→40 HU
  - «Derrame pleural leve.» → «Derrame pleural leve. Neumotórax a tensión.» (grammar)
  - «No hay derrame. Hay neumotórax.» → «Hay derrame. No hay neumotórax.» (grammar: los tokens se igualan porque se compara la secuencia `no`)
  - «Quiste renal derecho y nódulo hepático» → «Quiste hepático derecho y nódulo renal»
- Sí quedan protegidos: derecho→izquierdo, T2→T1, C5→C6, «T dos»→«T uno», 50 %→5 %, «normal»→«no normal».
- **Impacto**: la protección «cifras/negaciones/lateralidad» es más estrecha de lo que parece. Faltan los numerales 16-29 y 31-99 escritos, los ordinales, hipo/hiper, la ubicación anatómica, benigno/maligno, presente/ausente, UH/HU/cc, la adición de hallazgos y el cambio de posición de una negación. Requiere aprobación humana (un clic), pero el motivo lo redacta el LLM («concordancia», etc.). `META_REVIEW.md` ya dice que es una «defensa parcial»; estos casos concretos no están documentados.
- **Riesgo de corregirlo**: bajo técnicamente, porque solo agrega alertas. El costo es más falsas alertas y menos reemplazos útiles.
- **Propuesta**:
  - ampliar la lista con todos los cardinales que reconoce `number-format.mjs:6`, ordinales, `hipo|hiper|iso`, `superior|inferior|anterior|posterior|medial|lateral|proximal|distal`, `benign|malign`, `presente|ausente|positiv|negativ`, `aumento|disminu`, `UH|HU|cc|%`;
  - pasar a «sensitive» cualquier reemplazo que agregue más de N palabras de contenido o cuyo largo supere 1,5× el original;
  - comparar la negación junto a la palabra que la sigue (bigramas «no hay X»), no como un token aislado;
  - agregar estos casos a `tests/meta-review.test.mjs` y a `scripts/evaluate-meta-review.mjs`.
- **Seguro antes del 4-nov**: documentar los casos y, si el responsable lo aprueba, ampliar la lista. Es endurecimiento puro, pero requiere pruebas y aprobación. Mientras tanto, presentar cada propuesta como «hipótesis a escuchar». La heurística de largo y bigramas: **después del hackathon**.

#### A2 · Una segunda toma Muse-streaming iniciada mientras la anterior espera su final se rechaza destruyendo el socket, sin registro
- `backend/muse-stream.mjs:12`: `if(req.headers.origin!==origin||…||wss.clients.size>=1){socket.destroy();return;}`
- **[verificado]** (`stream-probe.mjs`, escenario `concurrent-second-stream`): la segunda conexión termina en `socket hang up`. No se crea ningún run, así que el intento fallido no queda en el catálogo.
- En el cliente, `stream-client.js:16` muestra «No se pudo conectar con Muse streaming.». `live.js:87` lanza ese error y la toma no entra al informe. El audio sí se guarda (`live.js:84` sube el WAV antes de la verificación de `:87`).
- **Impacto**: en el uso real (soltar y volver a presionar enseguida) la ventana de rechazo dura lo que tarda el final: 1,0-1,7 s según `EXPERIMENTS.md` (replay multivoz). El mensaje confunde (parece un fallo de red o de Meta). No hay riesgo clínico, pero es un riesgo alto para la demo. `live.js:24` ya avisa «Espera el resultado final antes de otra toma».
- **Riesgo de corregirlo**: medio. Permitir dos sesiones toca la cancelación (`cancellations`), el límite de cola y el orden de inserción en el editor.
- **Propuesta**: (1) un mensaje específico («La toma anterior aún espera su final de Muse») en vez de destruir el socket en silencio; (2) registrar los intentos rechazados; (3) después, permitir 2 sesiones o encolar el inicio.
- **Seguro antes del 4-nov**: solo pauta operativa en la demo («esperar el texto antes de la siguiente toma») y anotarlo en el guion. **Cambio de código: después del hackathon.**

### MEDIO

#### M1 · Un resultado vacío se registra como `completed`, también cuando el proveedor no detectó ningún turno
- `backend/speech-turns.mjs:23`: `get complete(){return this.turns.every(t=>t.text!==null);}`. Con cero turnos vale `true`, y `muse-stream.mjs:99-101` termina como `completed` con `turns.text===''`. `tests/speech-turns.test.mjs:37-38` lo afirma de forma explícita (escenario `silence`).
- PUSH_TO_TALK: `muse-stream.mjs:86-89` acepta `final:true` con `transcript:''`. **[verificado]** en el escenario `empty-final`: `{"status":"completed","text":""}`.
- Por archivo: `lab.mjs:55` solo exige `typeof data.transcript==='string'`; Whisper devuelve `''.join(result.texts)` (`lab-worker.py:38`). **[verificado]** con `LocalWorker` falso: `''` se resuelve como éxito.
- Lo que está bien: la UI dice «(El motor devolvió texto vacío.)» (`live.js:102`) y la revisión se marca `skipped` (`meta-review.mjs:45`).
- **Impacto**: no se puede distinguir silencio real de una toma perdida por el VAD o el proveedor. Las métricas y el CSV cuentan esa toma como completada. `TRANSCRIPTION_PLAN.md` exige no tener «texto vacío falsamente exitoso».
- **Riesgo de corregirlo**: bajo si solo se agrega una bandera; medio si cambia el estado (las pruebas lo fijan y el laboratorio filtra por `completed`).
- **Propuesta**: guardar `emptyText:true`, `turnCount`, `sentAudioMs` y `providerAudioProcessedMs` en el resumen, y una columna en el CSV. No cambiar el estado sin aprobación.
- **Después del hackathon** (o antes solo la bandera, con aprobación).

#### M2 · PUSH_TO_TALK: gana el primer `final`; cualquier final posterior se descarta
- `muse-stream.mjs:89`: `return complete('completed',null,e.transcript);`. Después de eso `done=true` y se ignora el resto.
- **[verificado]** con un proveedor falso que envía dos finales tras `endStream`: `{"status":"completed","text":"nódulo de tres milímetros"}`; «en el lóbulo superior derecho» se pierde sin ningún aviso.
- **[inferido]**: no se sabe si Muse llega a enviar varios finales en PUSH_TO_TALK. Las pruebas reales registradas muestran un solo final, pero con tomas de 5-45 s.
- **Impacto**: si el contrato cambia, o con tomas largas, se pierde el final de la toma en silencio.
- **Riesgo de corregirlo**: medio (hay que definir cuándo cerrar).
- **Propuesta**: contar `finalCount` en las métricas ahora (instrumentación) y, si alguna vez es mayor que 1, marcar error en vez de truncar.
- **Instrumentación: después del hackathon**, o antes con aprobación. **Seguro antes del 4-nov**: no tocarlo.

#### M3 · Persistencia síncrona del catálogo completo, que crece por eventos parciales acumulativos y contexto duplicado
- `lab.mjs:62`: `const save=()=>{…fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,dbPath);};`. Se llama en cada inicio, término, medición, revisión y decisión.
- Cada run streaming guarda `events` con el texto de cada parcial (`muse-stream.mjs:84`). Con `partialMode:'CUMULATIVE'` (`:63`) cada parcial repite todo lo dictado, así que el tamaño crece de forma cuadrática con la duración [inferido]. Además `reviewContext`, de hasta unos 13 000 caracteres, se guarda en el run (`lab.mjs:170,183`) y otra vez en `review.input.context` (`meta-review.mjs:44`). Todo vuelve en `/api/state` (`lab.mjs:114`) cada 250 ms mientras una toma está pendiente.
- **[verificado]** (`save-bench.mjs`, catálogo sintético más pesado que el real de 1,5 MB; 15 repeticiones; contenedor, no el PC de referencia):

  | Runs | Bytes | Serializar (mediana) | save total (mediana) | máx. |
  |---|---|---|---|---|
  | 170 | 5,9 MB | 11,9 ms | 20,8 ms | 63,7 ms |
  | 500 | 17,9 MB | 105,8 ms | 163,5 ms | 258,8 ms |
  | 1000 | 36,1 MB | 129,3 ms | 243,5 ms | 400,5 ms |

- **Impacto** [inferido]: cada `save()` bloquea el bucle de eventos. El pacing de streaming funciona con un `setInterval` de 20 ms y apenas 20 ms de adelanto (`muse-stream.mjs:21,39`). Un bloqueo de 100-400 ms crea huecos de envío a Muse y retrasa la recepción del audio del teléfono. No hay pérdida de datos, pero sí jitter y latencia. No está medido el lag del bucle durante una toma real.
- **Riesgo de corregirlo**: medio/alto (durabilidad y orden). El hallazgo previo P2 ya advertía que no basta con escribir en paralelo.
- **Propuesta**: medir primero (ver Instrumentación). Luego: estado resumido con detalle bajo demanda, eventos streaming en un archivo aparte por run, y guardar parciales como deltas o con muestreo.
- **Seguro antes del 4-nov**: no ejecutar lotes del laboratorio durante la demo y partir con un catálogo limpio o archivado. **Cambio de código: después del hackathon.**

#### M4 · Las tomas en vivo Muse-Normal y Whisper comparten una cola FIFO serial con los lotes del laboratorio; Muse-Normal depende del worker Python
- `lab.mjs:74`: `const r=db.runs.find(r=>r.status==='queued')`, sin prioridad. Un lote puede tener hasta 100 runs (`:163`).
- `lab.mjs:83`: `await worker.call({command:'prepare',…})` también para Muse, así que Muse-Normal falla si falta Python o `scipy`.
- `lab.mjs:39`: el abort hace `child.kill()`. Cancelar una toma Muse durante `prepare` mata el proceso que tiene Whisper cargado, y la siguiente toma Whisper vuelve a ser fría.
- **[verificado]** con el worker falso: el cuelgue más abort termina en 301 ms, `child=null`, y la siguiente llamada lanza un proceso nuevo.
- La fetch de Muse por archivo (`lab.mjs:52`) no tiene timeout propio: hereda los 300 s del pump (`:77`) y bloquea toda la cola.
- **Impacto**: dictado en vivo detenido hasta 360 s (`live.js:96,125`), seguido de «Tiempo de espera agotado», si hay un lote en curso o Meta se cuelga.
- **Riesgo de corregirlo**: medio.
- **Propuesta**: cola prioritaria para `source` en vivo; preparar Muse en Node (ya existe `StreamResampler`); un timeout de 60 s para la petición Muse por archivo, registrado aparte.
- **Seguro antes del 4-nov**: pauta operativa (no lanzar lotes mientras se dicta). **Código: después del hackathon.**

#### M5 · «punto y aparte» y «punto y seguido» no existen; «punto de …» se deja literal
- **[verificado]**:
  - «sin derrame pleural punto y aparte pulmones…» → `Sin derrame pleural. Y aparte pulmones bien expandidos`
  - «… punto y seguido …» → `. Y seguido …`
  - «… punto de forma incidental …» → `punto de forma incidental` se conserva (`possible_literal`) por `dictation-commands.mjs:17` (`/^\s+(?:de|focal|…)\b/`)
- **Impacto**: texto basura frecuente para usuarios que vienen de Dragon. El riesgo clínico es bajo, pero aumenta la edición. «Punto aparte» ya figura en `EXPERIMENTS.md` como no soportado.
- **Riesgo de corregirlo**: bajo-medio (hay que mantener el orden de las alternativas en `:7`).
- **Propuesta**: agregar «punto y aparte» → `.\n\n`/`.\n` (definir con el responsable) y «punto y seguido» → `.` antes de «punto y coma».
- **Después del hackathon** (cambio de comportamiento de comandos).

#### M6 · La puntuación del propio ASR rompe decimales: «dos, cinco» → `2, 5`
- **[verificado]** como transformación: «Mide dos, cinco centímetros.» → `Mide 2, 5 centímetros.`. Además «mide 2.5 cm» queda con punto decimal anglosajón.
- **[inferido]**: depende de si Muse o Whisper transforman la palabra «coma» en «,». `EXPERIMENTS.md` registra a Whisper produciendo «2.9» junto a un encabezado.
- **Impacto**: una medida decimal puede quedar como una enumeración, o con formato mixto (`2.5` y `2,5` en el mismo informe).
- **Riesgo de corregirlo**: alto (no se puede saber qué se pronunció).
- **Propuesta**: solo una advertencia `asr_punctuated_number` cuando aparezca `\d, \d` o `\d\.\d`, y medir su frecuencia en el corpus.
- **Seguro antes del 4-nov**: documentar. **Advertencia: después.**

#### M7 · Privacidad y volumen: el Revisor viene activado por defecto y reenvía en cada toma hasta 10 000 caracteres del informe más 3000 de la plantilla
- `live.js:13`: `reviewToggle.checked=true` (la etiqueta lo advierte). `report-editor.js:10`: `reportText:model.committed().slice(0,10000)`. Se recortan los **primeros** 10 000 caracteres, no los cercanos al punto de inserción.
- `meta-review.mjs:27` envía `JSON.stringify(input)` con `originalText`, `formattedText`, `keywords` y `context` completos. No hay filtro de identificadores: si el usuario escribe nombre o RUT en el informe, se envía a Meta en cada toma posterior.
- **Impacto**: (a) privacidad (documentado en general, pero no el reenvío acumulativo); (b) los tokens enviados crecen de forma aproximadamente cuadrática con el número de tomas [inferido]; `usage.prompt_tokens` se guarda, pero no hay totales.
- **Riesgo de corregirlo**: bajo para la medición; medio para cambiar el valor por defecto o el recorte (cambia lo que ve el LLM).
- **Propuesta**: medir `inputChars` por revisión; decidir con el responsable el valor por defecto (¿apagado salvo demo?) y una ventana alrededor del cursor en vez del inicio.
- **Seguro antes del 4-nov**: decidir el valor por defecto del checkbox en la demo como configuración del usuario (desmarcarlo), sin tocar código. **Código: después.**

#### M8 · Se descartan los diagnósticos de los fallos del proveedor y del worker
- `muse-stream.mjs:69`: `if(e.type==='error')return complete('error','Muse rechazó el streaming. Revisa acceso, cuota y formato.');`. **[verificado]** en el escenario `provider-error`: el código `QUOTA_EXCEEDED` no se guarda.
- `lab.mjs:32`: `child.stderr.on('data',()=>{})`. `:34` no registra el código ni la señal de salida del worker.
- **Impacto**: no se puede distinguir cuota, formato o autenticación en streaming, ni OOM de GPU frente a un fallo de driver en Whisper.
- **Riesgo de corregirlo**: bajo. Guardar solo un enum saneado, como ya hace `checkMetaKey` con `safe()` (`meta-key.mjs:24`).
- **Propuesta**: ver Instrumentación. **Después del hackathon** (o antes con aprobación; no cambia el reconocimiento).

### BAJO

- **B1 · Una sola sugerencia inválida anula la revisión completa.** `meta-review.mjs:18` lanza un error para todo el lote. **[verificado]**: una sugerencia válida y otra inexistente dan `Fragmento inexistente, ambiguo o solapado.` y el estado queda `error`. Es una falla segura, pero se pierden las propuestas útiles. Propuesta: rechazar por sugerencia y registrar `rejectedSuggestions`. Después.
- **B2 · El worker Python se apoya en un `message` obsoleto o inexistente si llega JSON inválido.** `lab-worker.py:48`: `print(json.dumps({'id':message.get('id'),…}))`. Si la primera línea es inválida hay `NameError` y el worker termina; si es otra línea, el error se atribuye al id anterior, Node lo ignora y la llamada pendiente espera 300 s. **[código]**; no se pudo ejecutar porque falta `scipy`. Node siempre escribe JSON válido, así que el riesgo es teórico. Después.
- **B3 · `pipe.generate(raw.tolist(), …)`** (`lab-worker.py:37`) convierte el arreglo numpy en una lista Python antes de inferir; con 180 s son 2,9 M floats. El costo no está medido [inferido]. No hay `max_new_tokens` ni guarda contra alucinaciones en silencio. Medir antes de cambiar. Después.
- **B4 · Mayúscula forzada al inicio de cada toma**, aunque se inserte en medio de una oración. `dictation-commands.mjs:32` (`^[ \t]*`). **[verificado]**: «en el lóbulo superior derecho» → `En el lóbulo superior derecho`; «coma en el lóbulo superior» → `, en el lóbulo superior`, y con el prefijo de espacio del editor queda « , en». Cosmético. Después.
- **B5 · Formato cosmético de cifras** **[verificado]**: «uno de ellos» → `1 de ellos`; «los dos riñones» → `los 2 riñones`; «T dos» → `T 2`; «C cinco C seis» → `C 5 C 6`; «L cinco S uno» → `L 5 S 1`; «BI-RADS cuatro A» → `BI-RADS 4 A`; «nueve línea» (error del ASR) → `9 línea` (ya registrado en EXPERIMENTS). «mide punto cinco centímetros» → `Mide. 5 centímetros`. No cambia el valor de las cifras salvo en este último caso, poco habitual. Después.
- **B6 · El formato crece de forma superlineal.** `dictation-commands.mjs:13-17` aplica regex sobre todo el prefijo en cada comando. **[verificado]** (200 repeticiones): 141 caracteres → 0,022 ms; 1410 → 0,76 ms; 8460 → 26,2 ms (mediana, p95 35,8 ms). Es irrelevante para tomas de 2-10 s y notorio en tomas de 180 s o al reformatear informes completos. Después.
- **B7 · Clave Meta.** Se guarda en texto plano en `ROOT/.env.local` (`lab.mjs:58`, `meta-key.mjs:12-15`). El modo `0o600` solo se aplica al crear el archivo y no tiene efecto en Windows (el PC de referencia usa `.venv/Scripts/python.exe`, `lab.mjs:25`). La excluye `.gitignore` (`.env.*`), no se loguea (los únicos `console.log` del backend imprimen la URL) y no se exporta (prueba `streaming:` comprueba `!exported.includes('test-secret')`). Viaja solo a `api.meta.ai` por HTTPS/WSS (`lab.mjs:52`, `muse-stream.mjs:63`, `meta-review.mjs:27`). `/api/key` solo valida Host y Origin (`lab.mjs:106-108`): un proceso local que no sea navegador puede reemplazarla, aunque no leerla. Aceptable para un piloto local. Documentar.
- **B8 · Prompt injection.** El texto dictado y la plantilla van como datos (`JSON.stringify(input)`, `meta-review.mjs:27`), y el validador limita los fragmentos a literales únicos. Pero el **contenido** del reemplazo (hasta 1000 caracteres) no se limita salvo por los tokens sensibles (ver A1). `scripts/evaluate-meta-review.mjs:12` tiene un solo caso de inyección y una repetición, y **no compara** con `expected`: solo imprime los resultados. Proponer una puntuación automática. Después.
- **B9 · `speech-turns.mjs:11-12`**: el parcial `transcript` se asigna a `this.current` sin mirar `e.turnId`. Si el proveedor intercala turnos, el borrador mostrado puede quedar en el turno equivocado; el final no se ve afectado, porque `speechComplete` sí usa `turnId`. **[código]**. Después.
- **B10 · Si `finish()` lanza un error** (disco lleno, `wavInfo`) dentro de `complete()` (`muse-stream.mjs:27`), el run queda `running` hasta reiniciar y el cliente no recibe `done`. **[código/inferido]**. Después.
- **B11 · `scripts/download-lab-model.py`**: la revisión está fijada (`:7`), pero no hay verificación propia de hashes. `modelReady()` (`lab.mjs:20-23`) solo comprueba el manifiesto y `size>0`, y se ejecuta (8 `statSync` más una lectura) en cada `/api/state`. Bajo.

---

## Tabla de casos de formato probados (medidos)

Comando: `node docs/revision/sondas/fmt-cases.mjs`, con la tubería `formatDictation(formatNumbers(x).text)`. La columna «Avisos» muestra lo que reportan `numWarn`/`cmdWarn`. La salida es literal; `\n` es un salto de línea.

| Entrada | Salida observada | Avisos | Riesgo |
|---|---|---|---|
| cinco coma dos milímetros | `5,2 milímetros` | — | OK |
| nódulo de dos coma cinco por uno coma ocho centímetros | `Nódulo de 2,5 por 1,8 centímetros` | — | OK |
| mide uno punto cinco centímetros | `Mide 1,5 centímetros` | — | OK (es el caso que hay que preservar) |
| mide uno punto cinco centímetros punto | `Mide 1,5 centímetros.` | — | OK |
| quiste renal derecho de nueve punto cinco milímetros | `… de 9,5 milímetros` | — | OK |
| **segmento ocho punto dos quistes simples** | `Segmento 8,2 quistes simples` | **ninguno** | **Crítico: cifra fabricada y oración perdida** |
| **nódulos tres punto uno de ellos calcificado** | `Nódulos 3,1 de ellos calcificado` | **ninguno** | **Crítico: cifra fabricada** |
| **hiperintenso en T dos punto dos lesiones más** | `Hiperintenso en T 2,2 lesiones más` | **ninguno** | **Crítico** |
| **segmentos seis coma siete** | `Segmentos 6,7` | **ninguno** | **Alto: una enumeración se vuelve decimal** |
| lesiones de dos coma tres coma cinco milímetros | `Lesiones de 2,3 coma 5 milímetros` | coma: possible_decimal (solo la 2.ª) | Alto: medidas alteradas |
| lesiones de dos coma tres y cinco milímetros | sin cambio (palabras) | número no soportado + possible_decimal | Seguro (conservador) |
| mide 5 milímetros punto dos nódulos más | `Mide 5 milímetros. 2 nódulos más` | — | OK (la unidad separa) |
| Mide dos, cinco centímetros. (coma del ASR) | `Mide 2, 5 centímetros.` | — | Medio: decimal convertido en lista (depende del ASR) |
| mide 2.5 cm | `Mide 2.5 cm` | — | Bajo: formato mixto |
| dos coma seis cinco | sin cambio | número + comando | Seguro (conservador) |
| dos coma cero cinco | `2,05` | — | OK |
| dieciséis coma cinco milímetros | `16,5 milímetros` | — | OK |
| ciento veinte coma cinco | `120,5` | — | OK |
| dos por tres centímetros | `Quiste de 2 por 3 centímetros` | — | OK |
| entre dos y tres centímetros | sin cambio | número no soportado | Seguro, sin convertir |
| treinta y cinco milímetros | `35 milímetros` | — | OK |
| veinte y cinco milímetros | sin cambio | número no soportado | Seguro |
| cien milímetros | `Mide 100 milímetros` | — | OK |
| mil doscientos mililitros | sin cambio | número no soportado | Seguro, sin convertir |
| cincuenta por ciento | `50 por ciento` | «ciento» no soportado | Bajo |
| hiperintenso en T dos | `Hiperintenso en T 2` | — | Bajo (cosmético; se esperaría T2) |
| discopatía C cinco C seis | `Discopatía C 5 C 6` | — | Bajo (cosmético) |
| discopatía C cinco coma C seis | `Discopatía C 5, C 6` | — | Bajo |
| L cinco S uno / BI-RADS cuatro A | `L 5 S 1` / `BI-RADS 4 A` | — | Bajo |
| fractura del segundo arco costal | sin cambio (ordinal) | — | OK |
| un nódulo de una lesión / nódulo de un centímetro | sin cambio | — | OK (artículo protegido) |
| uno de ellos mide tres milímetros | `1 de ellos mide 3 milímetros` | — | Bajo (estilo) |
| un coma cinco centímetros / uno coma cinco | `1,5 centímetros` / `1,5` | — | OK |
| los dos riñones | `Los 2 riñones` | — | Bajo (estilo) |
| no se observa derrame pleural | `No se observa derrame pleural` | — | OK (negación intacta) |
| sin derrame pleural punto no se observa neumotórax | `Sin derrame pleural. No se observa neumotórax` | — | OK |
| riñón izquierdo normal coma riñón derecho con quiste | `Riñón izquierdo normal, riñón derecho con quiste` | — | OK (lateralidad intacta) |
| **sin derrame pleural punto y aparte pulmones…** | `Sin derrame pleural. Y aparte pulmones bien expandidos` | — | Medio: comando Dragon no soportado |
| sin derrame pleural punto y seguido pulmones… | `Sin derrame pleural. Y seguido …` | — | Medio |
| sin derrame pleural nueva línea pulmones… | `Sin derrame pleural\npulmones …` | — | Bajo: sin mayúscula tras salto |
| no hay neumotórax punto nuevo párrafo conclusión dos puntos sin hallazgos | `No hay neumotórax.\n\nConclusión: sin hallazgos` | — | OK |
| conclusión dos puntos nódulo | `Conclusión: nódulo` | — | OK |
| sin derrame pleural punto de forma incidental quiste renal | `… punto de forma incidental …` | punto: possible_literal | Medio: «punto» queda literal |
| paciente en coma / punto de sutura | sin cambio | possible_literal | OK |
| sin derrame pleural. Punto. Pulmones | `Sin derrame pleural. Pulmones` | — | OK (deduplica) |
| sin derrame pleural punto punto | `Sin derrame pleural.` | — | OK |
| mide tres punto | `Mide 3.` | — | OK |
| mide punto cinco centímetros | `Mide. 5 centímetros` | — | Bajo (expresión poco habitual) |
| en el lóbulo superior derecho (toma a mitad de oración) | `En el lóbulo superior derecho` | — | Bajo: mayúscula forzada |
| coma en el lóbulo superior | `, en el lóbulo superior` | — | Bajo |
| nueve línea (error del ASR) | `9 línea` | — | Bajo (ya documentado) |
| grado tres dos lesiones | sin cambio | número no soportado | Seguro |

---

## Fortalezas verificadas

- **Fallos explícitos en streaming** ([verificado], `stream-probe.mjs` y `tests/speech-turns.test.mjs`):
  - error del proveedor → `error`;
  - cierre 1000 sin final → `error` («Muse cerró sin completar la toma (código 1000).»);
  - hash incorrecto → `error` con `text:null`;
  - cierre anormal o anticipado → `error`;
  - final antes de `endStream` → `error` (`muse-stream.mjs:87`);
  - cancelación → `cancelled`, distinto de `error`, `timeout` e `interrupted` (`:115`).
- **Integridad del audio**: hash SHA-256 del PCM del cliente antes de `endStream` (`muse-stream.mjs:108`). El audio original y el derivado se guardan aunque la toma falle (`lab.mjs:188-193`).
- **Originales inmutables**: `text`, `numberFormatting` y `formatting` quedan separados, con offsets y versión; el Revisor nunca sobrescribe y trabaja sobre `reviewDocuments` con historial y deshacer.
- **Worker local robusto ante caídas** ([verificado], `worker-probe.mjs`):
  - caída → «El proceso local terminó.» y nuevo proceso en la siguiente llamada;
  - cuelgue con abort → rechazo en 301 ms y proceso terminado;
  - llamada concurrente → «Worker ocupado.»;
  - las respuestas con id antiguo se ignoran (`lab.mjs:31`).
- **Reinicios**: los runs y revisiones `queued`/`running` pasan a `interrupted` y no se reenvían (`lab.mjs:64`, `meta-review.mjs:38`).
- **Números conservadores en casos ambiguos** [verificado]: secuencias con «y» no válidas, «mil», «dos coma seis cinco», «tres dos» y artículos «un/una» se dejan sin convertir y con advertencia. «dos puntos» se protege como dos puntos (`number-format.mjs:22`).
- **Validador del Revisor** [verificado]:
  - rechaza JSON inválido, fragmentos inexistentes, repetidos o solapados, y más de 8 propuestas;
  - convierte en alerta los cambios de lateralidad derecho/izquierdo, no/sin/con, dígitos (T2, C5, 50 %), cardinales 0-15 y decenas, y mm/cm/ml;
  - la revisión global prohíbe reemplazos y exige evidencia literal (`review-context.mjs:49`);
  - timeout de 30 s y cancelación; un fallo del Revisor no invalida la transcripción.
- **Clave**: no aparece en exportaciones ni en el estado (solo `metaConfigured`); los errores de Muse no reenvían el cuerpo del proveedor (`lab.mjs:53`, prueba «Muse: contrato multipart…»).
- **Superficie local**: Origin y Host comprobados en HTTP y WS (`lab.mjs:106-108`, `muse-stream.mjs:12`); CSV protegido contra fórmulas; la UI usa `textContent` (el único `innerHTML` es el SVG del QR, `desktop.js:136`).
- **Mejora del sondeo** respecto al 01-11 (petición compartida y recorte correcto de tarjetas), cubierta por `tests/review-polling.test.mjs`.
- **El formato es barato en tomas reales**: 0,02 ms con 141 caracteres y 0,76 ms con 1410 (mediana) [verificado].

## Instrumentación propuesta (sin cambiar el reconocimiento)

Cada punto se registraría en `METRICS.md` con unidad, intervalo y precisión antes de implementarlo. Los campos ausentes van como `null`.

1. **Formato de riesgo (C1, M6)**: en cada evento de `formatNumbers`, agregar `separator:'coma'|'punto'|null`, `nextToken` (solo su clase: unidad, sustantivo, mayúscula, fin) y `asrPunctuatedNumber`. Contar por toma la frecuencia de decimales con «punto» no seguidos de unidad. Solo metadatos; el texto no cambia.
2. **Corpus de regresión de formato**: congelar la tabla anterior como fixture (entrada → salida actual → riesgo), separando las salidas actuales de las deseadas, y registrarla en `EXPERIMENTS.md`. Las salidas deseadas solo las fija el responsable.
3. **Streaming**:
   - `finalCount` y `emptyText` (M1, M2);
   - `rejectedConnections` con instante relativo y motivo (A2; hoy no se registran);
   - código de error del proveedor saneado como enum (M8);
   - `maxTickGapMs` / jitter del `setInterval` de 20 ms y `perf_hooks.monitorEventLoopDelay` durante la sesión (M3).
4. **Persistencia**: `saveMs` y `saveBytes` por llamada (anillo de N muestras), bytes y ms de serialización de `/api/state`, y su sobrecosto medido con y sin instrumentación sobre la misma fixture.
5. **Worker**: `exitCode`/`signal`, número de reinicios, `loadMs` después de un reinicio (distinguir la carga fría provocada por una cancelación) y duración de `tolist()` por separado de `generate`.
6. **Cola**: `queueMs` separado por `environment.source` (vivo frente a lote) y la posición en la cola al encolar.
7. **Revisor**:
   - `inputChars` y `contextChars` por revisión, y suma de `prompt_tokens` por sesión (M7);
   - razón de guarda por sugerencia (qué token disparó la alerta);
   - contador de sugerencias rechazadas por el validador (B1);
   - en `evaluate-meta-review.mjs`, comparación automática contra `expected` y casos de A1 (hipo/hiper, superior/inferior, negación movida, hallazgo añadido) con tres repeticiones.

## Límites de esta revisión

- No hubo audio real, Muse, Whisper ni GPU. Todo lo que depende del proveedor está marcado como [inferido].
- La latencia de `save()` se midió en un contenedor Linux con un catálogo sintético, no en el PC de referencia ni con el catálogo real.
- No se reejecutó la suite completa del repositorio, solo las 9 pruebas Node del alcance y las 5 de Python.
- No se revisaron `report-editor.js`, `report-model.js` (salvo `finish`/`preview`) ni el relay.
