# Ocho voces chilenas: comparación privada en L4

Estado: ajuste completado; generación comparativa en curso el 03-11-2026. La evaluación perceptual sigue pendiente del responsable.

## Hipótesis y diseño

El ajuste adicional de Chatterbox puede mejorar la pérdida de validación en hablantes no vistos y el acento percibido sin empeorar naturalidad ni fidelidad al texto. La línea anterior es el adaptador de 4.020 pasos, SHA-256 `314c213a0bbc10883968b29d331200182d2930056277276d8398d8209883787e`. Se continúan hasta 1.500 pasos con tasa de aprendizaje `1e-5`, validación cada 250 pasos y parada tras tres evaluaciones seguidas sin mejora. Se conserva la mejor versión, aunque ocurra antes del último paso. El optimizador se reinicia; no se afirma continuidad exacta del estado de Adam.

La métrica técnica es entropía cruzada ponderada por tokens, en nats/token, sobre los mismos 40 audios reservados y las mismas referencias. Inicio: carga del adaptador de 4.020 pasos; final: evaluación de cada checkpoint. Criterio previo: reducción mínima de 0,5 % frente a 2,4516755846784126. Un resultado técnico favorable no demuestra acento chileno ni mejora de Whisper.

El protocolo privado fija ocho referencias, cuatro etiquetadas F y cuatro M, y las cinco frases literales solicitadas por el responsable. Cada frase se genera con el adaptador anterior y el nuevo, semilla `20261103`: 80 WAV previstos. Se añaden ocho controles del modelo base, con la frase 03. Cinco referencias proceden de hablantes ausentes del entrenamiento y tres de hablantes vistos; se indica esta distinción en cada tarjeta. La selección fue reproducible: todos los hablantes reservados primero, luego los primeros hablantes de entrenamiento en orden alfabético; dentro de cada hablante, el clip de 2 a 12 segundos más cercano a cinco segundos. Los rasgos de edad, ritmo, aspiración de /s/, estilo clínico y acento de cada referencia no están verificados y se registran como `null`.

La regla de parada actuó a los 750 pasos adicionales por tres validaciones sin mejora: 2,4546363 a 250, 2,4542270 a 500 y 2,4529886 a 750, frente a 2,4518693 del adaptador de 4.020 pasos evaluado en la misma L4. El mejor checkpoint por pérdida sigue siendo el anterior; el checkpoint final de 4.770 pasos se conserva como variante exploratoria para escucha y **no se denomina mejora técnica**. La medición anterior del padre en T4 fue 2,4516756; la pequeña diferencia entre dispositivos se informa sin atribuir causa. La preparación de datos medida fue 91,709 s y la suma de intervalos de pasos, 204,171 s; excluyen carga, validación y escritura.

La revisión humana es ciega para la identidad del checkpoint por cada pareja A/B. Se escuchan los audios completos y se puntúan, de 1 a 5, acento chileno, naturalidad, inteligibilidad y fidelidad literal; se anotan errores de contenido. Se conservarán resultados favorables y desfavorables. Criterio exploratorio por voz: medias de al menos 4/5 en acento y naturalidad y ningún error de contenido en las cinco frases del checkpoint nuevo. Se informará que es una evaluación de un oyente, sin inferencia estadística de población. No se aprobará exportación de corpus por esta puntuación.

Para evitar saturación del reproductor se crearán copias de escucha con **una sola ganancia constante para todo el lote**, calculada respecto al pico máximo estimado con sobremuestreo 4× y margen de −2 dBFS. Se conservan los WAV originales y sus estados técnicos; la ganancia no repara distorsión ya presente en la síntesis. El revisor identifica por hash ambas versiones y muestra la misma copia corregida para A y B.

## Entorno, gasto y límites

Colab Pro mostró NVIDIA L4, 23.034 MiB de memoria de GPU, 52,96 GB de RAM de sistema, 146,38 unidades disponibles y una tasa aproximada de 1,94 unidades/hora. Se ejecutó una celda que armó `runtime.unassign` a los 3.600 segundos y verificó GPU L4 antes de iniciar. A la tarifa de reposición documentada de US$9,99 por 100 unidades, el máximo estimado de esa sesión es US$0,193806. Es estimación, no factura ni débito observado; saldo final y consumo exacto pendientes. Se detendrá dentro del límite solicitado de US$5. El sobrecosto de instrumentación no está calibrado (`null`). El código registra descarga, carga de modelo, preparación, entrenamiento, validación, generación, duración de audio y factor de tiempo real por separado.

El corpus SLR71 se usa en investigación privada y conserva atribución y licencia. La licencia del motor no resuelve por sí sola los permisos sobre corpus, voces, audios generados o pesos. No se exportarán audios o pesos al repositorio público ni se entrenará Whisper en este ciclo. La interfaz de dictado y Studio permanecen fuera de este experimento.

## Artefactos

Código reproducible: `scripts/voices-chile/train_extended.py`, `compare_eight.py`, `worker_eight.py`, `correct_eight_levels.py` y `build_eight_player.py`. El manifiesto, las grabaciones, los pesos y el reproductor con audio residen en el laboratorio privado. La publicación del código no publica ni activa la interfaz local.
