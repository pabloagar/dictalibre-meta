# Corpus sintético para cierre del MVP

Estado actualizado: evaluado contra ASR y revisor reales el 02-11-2026; resultados abajo. La referencia de los 15 archivos sigue sin escucha/validación humana. No sustituye pruebas de Samsung/iPhone ni voces humanas.

Se reutiliza System.Speech de Windows, sin servicios externos, voces clonadas ni datos de pacientes. `scripts/build-mvp-corpus.ps1` genera cinco textos por cada voz española seleccionada disponible: Microsoft Helena Desktop, Microsoft Laura y Microsoft Pablo. En este equipo se generaron 15 WAV, tres voces nominales, cinco frases base compartidas; no son 15 casos lingüísticos independientes. Las tres voces son es-ES, no una validación de acento chileno.

Casos: comandos punto/nueva línea, contraste afirmación-negación, izquierda frente a derecha, medidas de milímetros/centímetros y decimal, encabezados/dos puntos/nuevo párrafo. Los comandos están escritos como palabras para que se pronuncien. `expectedFormatted` representa un resultado de formato propuesto; abreviaturas equivalentes y capitalización deben evaluarse por separado de errores de contenido.

## Reproducir

Desde la raíz, ejecutar en Windows PowerShell:

```powershell
./scripts/build-mvp-corpus.ps1 -OutputDirectory data/local/mvp-synthetic-otra-serie
```

El destino debe ser nuevo. El script guarda inventario de voces, voz/cultura/rate por archivo, texto de entrada, referencia propuesta, SHA-256, commit observado y estado de cambios, tiempo de generación y fallos. Un commit observado no atribuye el script nuevo sin commit a esa versión: también se registra el hash del script. Red, navegador y teléfono son null porque no intervienen en la síntesis. La duración de generación es una medida de software, no latencia de dictado.

La generación efectuada está en `data/local/mvp-synthetic-v1/`, excluida de Git junto con los WAV. Verificación independiente con Python wave/hashlib: 15 archivos PCM mono, 16 kHz, 16 bits, muestras no vacías y hashes coincidentes. `verification.json` conserva duración calculada a partir de muestras; no mide silencio acústico ni calidad de pronunciación. Primera orden de verificación tuvo un error de sintaxis Python y no se ejecutó; corregida, pasó.

## Ensayo posterior, cuando termine la sesión física

Hipótesis: la configuración congelada mantiene negación, lateralidad, cantidad/unidad y convierte los comandos sin duplicación. Ejecutar una repetición por archivo con el mismo motor/configuración, conservar originales y resultados favorables/desfavorables. Criterio por caso: todos los datos protegidos y comandos correctos; cualquier fallo se registra, no se elimina de la serie. Medir exactitud por caso y por voz, errores de datos protegidos, estado terminal y tiempos ya instrumentados del laboratorio. No mezclar latencia por archivo con latencia de teléfono.

Antes de puntuar reconocimiento literal, escuchar las voces y confirmar lo efectivamente pronunciado: el guion TTS es referencia provisional. Registrar versión activa real, red, configuración, repeticiones y datos ausentes como null. No se ha importado el corpus ni se han lanzado inferencias mientras el responsable prueba su teléfono. No requiere reiniciar ni desplegar la aplicación.

## Resultados de la evaluación del 02-11-2026

Se ejecutaron 15 audios, una repetición por archivo, con llamadas reales a Muse Voice Transcribe 1.0 y revisión global de Muse Spark 1.3. Se archivó y verificó el código de ecf0da79ba76dac272eadf721bf01adeed316999 (versión de demo seleccionada) y se levantó una instancia loopback aislada. No se reinició el laboratorio ni Render. No es una prueba física del teléfono ni una medición de la red de Render.

**Estado actualizado:** inferencias completadas; referencias de estos 15 WAV siguen pendientes de escucha humana. Los resultados siguientes comparan con los guiones TTS y no certifican fidelidad a lo efectivamente pronunciado. La referencia humana guardada para otro audio no se transfirió a estos casos. Cinco guiones por tres voces es-ES no equivalen a 15 casos independientes ni prueban acento chileno.

| Caso | Helena | Laura | Pablo | Coincidencias |
| --- | --- | --- | --- | --- |
| Comandos, nódulo de 3 mm, lado derecho | Coincide | Coincide | Coincide | 3/3 |
| No se observa neumotórax | neuromotor ax | Coincide | Coincide | 2/3 |
| Se observa neumotórax | neuromotorax | Coincide | Se observan eumotorax | 1/3 |
| Lesión de 2,5 cm, lado izquierdo | Coincide | Coincide | Coincide | 3/3 |
| Hallazgos / impresión / párrafos | Hallazgos 2. | Coincide | Coincide | 2/3 |

Coincidencia de texto final: **11/15**, ignorando mayúsculas, espacios horizontales repetidos y espacios exteriores; conservando puntuación y saltos de línea. 15/15 inferencias terminaron sin error de transporte/proveedor. No se excluyeron fallos de contenido.

### Qué se perdió, sustituyó o añadió

Tres resultados sustituyen el término neumotórax por formas incorrectas; uno también cambia observa por observan. Son diferencias presentes ya en el ASR, no cambios introducidos por Spark. No se observaron hallazgos completos nuevos, cambios de lado o cambios de cantidad/unidad en esta serie. Eso no demuestra ausencia general de invenciones.

El encabezado incorrecto muestra una cadena de dos etapas: el ASR entrega «hallazgos dos punto» (singular); el formateador numérico convierte dos en 2; el de comandos convierte punto en un punto ortográfico. Resultado: «Hallazgos 2.». Es un número espurio procedente de un comando, no una medida clínica dictada.

Comparación textual del agente: 6/6 lados y 6/6 cantidades/unidades preservados. Los 12 marcadores de polaridad (no/sin/afirmación) permanecen, pero una entidad mal transcrita invalida igualmente la frase completa. Neumotórax correcto en 3/6 oportunidades. Revisión clínica humana pendiente.

### Qué aporta Spark y qué ruido añade

15 resultados de revisión completados corresponden a **9 llamadas únicas y 6 reutilizaciones** de textos idénticos. No contarlos como 15 inferencias independientes. Los cuatro casos con errores tienen un aviso útil; Spark no corrige automáticamente ninguno y los 15 originales se conservan.

Hay ocho avisos al contar cada caso: cuatro asociados a errores observados y cuatro adicionales de completitud. Estos últimos piden lado/tamaño de un neumotórax no especificados en el guion o reclaman que la ausencia de derrame de la impresión se describa también en hallazgos. Tres de los 11 textos coincidentes reciben alguno de estos avisos. No son errores de dictado; pueden tener otra utilidad al revisar un informe completo. La interfaz debe distinguir comprobación de transcripción, contradicción interna y posible información ausente, sin inventar los datos ni exigir normalidad de una plantilla. No se estima sensibilidad/especificidad clínica con esta muestra.

### Tiempos y límites

Cierre recibido por servidor → texto final: mediana **772 ms**, mínimo 448 ms, máximo 955 ms, n=15. Incluye el vaciado del audio en cola. Envío endStream al proveedor → final: mediana 220 ms. Petición de Spark: mediana **3.53 s**, rango 1.83–5.62 s, n=9 solicitudes únicas. No son tiempos de teléfono → pantalla ni tiempo ahorrado al informar. Red, navegador, teléfono, precisión del reloj y sobrecosto: null. Audio total: 70.76 s.

### Cobertura frente a las plantillas del responsable

El catálogo local tiene 285 plantillas: 104 ecografía/Doppler, 75 tomografía, 55 resonancia, 6 radiografía y 45 en otros/por clasificar. Solo se examinaron estructura y cobertura localmente; no se enviaron plantillas privadas a Meta ni se publicaron sus textos. Los cinco guiones de tórax no cubren esa biblioteca. Se reutilizan los ejes de la planilla de estudio (negación, lateralidad, medidas; sustitución, omisión, inserción y no evaluable), ampliando la descripción a terminología/comandos y avisos del revisor. No había anotaciones humanas guardadas en /api/study al inicio.

Falta probar el recorrido dentro de una plantilla: dictado nuevo frente a normalidad heredada, reemplazo de un fragmento, informe largo, campos vacíos y medidas múltiples. No debe atribuirse al modelo como invención texto que ya estaba en la plantilla; hay que registrar procedencia y comprobar que no queda una afirmación previa contradictoria.

### Condiciones para cerrar el MVP de demostración

1. Resolver el comando «dos punto(s)» en encabezados sin convertirlo en una cifra; añadir controles donde dos sí sea una cantidad real. Repetir los casos conservando esta línea base.
2. Evaluar la terminología problemática con voz humana validada y, si se propone glosario, compararlo con configuración congelada y frases nuevas. No ajustar y volver a puntuar solo la misma frase como prueba final.
3. Separar los avisos de completitud de los errores de transcripción; mantener propuestas sin aplicación automática y evidencia visible. Un caso correcto debe servir como control de avisos innecesarios.
4. Completar prueba con plantilla y corregir cualquier pérdida/duplicación o normalidad contradictoria; añadir silencio, ruido, autocorrección verbal y varias medidas/lados. El corpus actual carece de estos controles.
5. Escucha/validación de referencias, prueba iPhone a cargo del responsable, congelar versión que pase las regresiones y grabar el recorrido final. Samsung y tres tomas consecutivas tienen aceptación comunicada previamente, no repetida aquí.

**Decisión:** flujo técnico ejecutable; criterio de calidad de esta serie aún no cerrado. No se añadieron funciones ni se modificó el motor para ocultar los errores.

### Evidencia y reproducción

Resumen público sin audio ni datos privados: experiments/results/2026-11-02-mvp-synthetic/summary.json. Evidencia detallada local: data/local/lab/reports/mvp-evaluation-1793644425774/ (protocol.json, results.json, summary.json, completion.json). El protocolo se guardó antes de inferir; incluye configuración, hashes de fuentes/manifest/script, voz y condiciones. Un primer intento falló antes de inferir por puerto ocupado y se conservó aparte, luego se eligió un puerto libre.

Para otra ejecución, archivar un commit explícito en un directorio nuevo y pasar esa ruta y SHA completo a `node scripts/evaluate-mvp-synthetic.mjs <directorio-fuentes> <sha>`. Requiere los WAV sintéticos locales y clave de Meta ya configurada; hace llamadas reales. No lleva ni imprime la clave. El resumen anotado se reproduce con `node scripts/summarize-mvp-synthetic.mjs <directorio-resultados>` y verifica el hash exacto de la serie: otros resultados requieren nueva anotación, sin reutilizar juicios a ciegas. Los scripts de evaluación no fueron parte del commit de aplicación probado; su hash se registra por separado.
