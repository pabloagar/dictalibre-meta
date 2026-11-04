# Piloto privado Qwen3-TTS multivoz

Estado: entrenamiento Qwen completado en L4 y respaldo recuperado/verificado el 04-11-2026. Comparación auditiva pendiente del responsable; no se declara mejora de acento por la pérdida del modelo.

## Alcance autorizado

El responsable eligió un único ajuste multivoz, frente a cuatro ajustes individuales. Qwen3-TTS-12Hz-1.7B-Base, revisión fd4b254389122332181a7c3db7f27e918eec64e3; código QwenLM/Qwen3-TTS 022e286b98fbec7e1e916cb940cdf532cd9f488e; tokenizer 12Hz 7dd38ad4e9bad454aae9cd937d0cd577604fe229. Receta propia LoRA rango 8/alpha 16 sobre q_proj y v_proj de las 28 capas del talker; solo se entrena la predicción del codec principal. El predictor de códigos secundarios, codificador de hablante, decoder y pesos originales permanecen congelados. Es una adaptación experimental más limitada que entrenar todos los componentes. La receta oficial documenta SFT de un hablante: https://github.com/QwenLM/Qwen3-TTS/blob/022e286b98fbec7e1e916cb940cdf532cd9f488e/finetuning/README.md .

## Datos y separación

Cuatro hablantes de SLR71: dos mujeres (F3/F4 de la comparación anterior) y dos hombres (M4 y nuevo M5). 485 grabaciones de unos 45,5 minutos. 425 grabaciones para entrenar, 56 reservadas para validar y cuatro referencias. No incorporar hablantes reservados para evaluación de Chatterbox al entrenamiento. Referencias y textos coincidentes se excluyen de entrenamiento; partición determinista por hash del texto normalizado para conservar variantes juntas. Las cinco frases médicas ficticias de la prueba también se excluyen. La validación usa grabaciones distintas de hablantes vistos: no mide generalización a hablantes nuevos. Los originales están a 48 kHz: se preparan copias FLOAT a 24 kHz mediante scipy.resample_poly, con hashes y tasas antes/después. Se auditan hashes WAV y transcripciones del proveedor; no se presentan como transcripciones escuchadas por el responsable.

El encuadre continúa siendo investigación privada con la base documental del piloto SLR71; permisos comerciales, redistribución y futuro entrenamiento de Whisper pendientes. No se publican datos, audios ni pesos.

## Hipótesis y medidas previas

Hipótesis: el adaptador compartido mejora el acento chileno en cuatro voces sin deteriorar su naturalidad. La pérdida del codec principal solo sirve para elegir un checkpoint; no demuestra acento ni naturalidad.

- Hasta 600 pasos de optimización, alternando hablantes de forma equilibrada; lr 0,00001; seed 20261104. Validar cada 100 pasos sobre 16 grabaciones fijas (cuatro por hablante); conservar también las 56 reservadas para verificaciones posteriores. Detener tras tres validaciones sin mejora mínima de 0,001 o por reserva de tiempo para generación y respaldo. Conservar inicial, mejor y último adaptador.
- Antes de las generaciones, comprobar forward/backward, gradiente no nulo y memoria en L4. La prueba CPU verifica que el adaptador cero conserva la salida, que se actualiza sin cambiar la capa base y que las etiquetas se desplazan exactamente una posición. No usar simultáneamente desplazamiento manual y pérdida automática.
- Generar cuatro voces × cinco frases × dos estados = 40 audios Qwen. Mismas referencias, textos, seed y configuración antes y después. Generación por lotes de cuatro; medir tiempo por lote tras sincronizar CUDA, duración agregada y RTF agregado. Tiempo individual por audio: null; no repartirlo artificialmente. No comparar numéricamente pérdidas de Qwen con pérdidas de Chatterbox.
- Escuchar ciegamente y puntuar acento y naturalidad 0–5. Criterio exploratorio propuesto antes de escuchar: media de acento al menos 0,5 puntos superior al base; naturalidad sin descenso superior a 0,2 puntos. Para aceptar voces se mantiene además la referencia del piloto: media de ambos criterios al menos 4/5 y contenido sin errores. Un oyente exploratorio, no una conclusión estadística ni mejora de Whisper.
- Comparador Chatterbox: usar mismo hablante, referencia y cinco frases. Se reutilizaron quince audios ajustados de F3/F4/M4 y se generaron cinco nuevos para M5 con el checkpoint conservado de 4.020 pasos. Los veinte comparadores ya están completos.
- Conservar WAV FLOAT y NPY, incluso fallos, y hashes. Verificar lectura, valores finitos, no silencio y picos. Preparar escucha con una única ganancia para todo el lote comparativo, preservando originales. No confundir reducción de nivel con reparación de distorsión.

## Presupuesto y evidencia

Máximo USD 5 de cómputo. Verificar tarifa actual L4, saldo y vigilancia externa antes de iniciar el worker. Una ventana de dos horas solo es admisible si su coste máximo a la tarifa observada cabe en el saldo autorizado; no reutilizar una tarifa histórica como actual. El entrenador reserva tiempo para generación y respaldo; el watchdog externo debe cubrir también instalación y descargas. Recuperar y verificar el respaldo antes de liberar la GPU. El worker no compra recursos ni arma por sí solo el watchdog.

Registrar GPU/controlador, entorno Python y dependencias efectivas, configuración, hashes de entradas, código ejecutado e intervalos de descarga, carga, tokenización, entrenamiento, validación, generación, transferencia y asignación. Factura, red y sobrecosto de instrumentación ausentes: null. No atribuir una inferencia a un commit posterior. Publicar solo código/documentación conforme a PUBLICATION.md y anotar qué sigue pendiente.


## Resultado técnico Qwen verificado · 04-11-2026

600 pasos completados, checkpoint elegido en 600; 1.605.632 parámetros entrenables en un adaptador compartido. Se vieron 313 grabaciones distintas de las 425 disponibles para entrenamiento. Validación fija: 16 grabaciones, 1.129 tokens; pérdida del codec principal de 9,43025193 a 2,47792039 nats/token. Esto no es una puntuación perceptual ni se compara con la pérdida de Chatterbox. Acento y naturalidad aún no evaluados.

40 WAV/NPY recuperados, 20 originales y 20 ajustados, todos legibles, finitos, no silenciosos y con pico original inferior a 1. Duración conjunta Qwen: 382,00025 s. Inferencia original: cinco lotes, 121,92248 s de generación para 187,200125 s de audio (RTF agregado 0,65129). Inferencia ajustada: 123,40608 s para 194,800125 s (RTF agregado 0,63350). No son intervalos por audio ni una prueba repetida de velocidad.

Intento exitoso con caché de modelo: descarga/verificación 0,24479 s; carga 2,83254 s; intervalo de preparación/tokenización 20,32833 s; entrenamiento y validaciones periódicas 170,81946 s; función completa 444,29868 s. Los intentos fallidos, instalaciones y transferencias quedan fuera de esos intervalos y sí consumen tiempo de sesión. La prueba de backward tardó 0,27399 s y alcanzó 4.274.126.848 bytes asignados; ese pico no describe toda la inferencia ni reserva total del dispositivo.

Se conservaron dos intentos fallidos: faltaba convertir el corpus de 48 a 24 kHz y el registro de parámetros LoRA alteraba la precisión inferida por Qwen durante generación. Se corrigieron ambos, se añadió una regresión de dtype y las dos pruebas pequeñas del adaptador pasaron en el entorno Colab. El tokenizador independiente y el incluido en el modelo tienen pesos con el mismo hash. La prueba local de partición verifica texto compartido, referencias y exclusión de frases de evaluación.

Qwen base fd4b254389122332181a7c3db7f27e918eec64e3; código 022e286b98fbec7e1e916cb940cdf532cd9f488e; L4 23.034 MiB, controlador 580.82.07; Python 3.13.16, torch 2.8.0. Configuración efectiva y dependencias completas privadas. Los tres archivos propios ejecutados (entrenador, núcleo del adaptador y regresión) coinciden con sus fuentes de trabajo; no se atribuyen inferencias a un commit posterior.

Adaptador SHA-256 d122ba46a549cc2758ccb001fab5112fc974e55850d4aaa4bddc1d235c731708. Respaldo privado SHA-256 ccdff06b38c5914e1aa49dd81187353e4247dfbaf235db0a13a2a9634e04ad12 (59.089.083 bytes), recuperado y verificado localmente. No contiene los pesos completos descargados ni WAV del corpus fuente; sí código, manifiestos privados, resultados, conversiones y evidencia de fallos.


## Entrega y gasto verificados

Comparación final de 60 muestras: Qwen original (20), Qwen ajustado a 600 pasos (20) y Chatterbox ajustado a 4.020 pasos (20). Duración total 579,20025 s. Cincuenta y cinco originales pasan el nivel de pico y cinco Chatterbox lo exceden; todos son legibles, finitos y no silenciosos. Se conservan los originales y fallos. Las 60 copias de escucha usan ganancia común 0,7449119934, pico sobremuestreado máximo 0,79432826. No se certifica true peak ni reparación de distorsión.

Activo privado: http://127.0.0.1:8805/qwen/QWEN_VS_CHATTERBOX.html?v=qwen1 . Cuatro voces, cinco frases, tres estados aleatorios; puntuaciones de acento y naturalidad 0–5 y observaciones. Borrador separado por hash del manifiesto; no mezcla puntuaciones A/B/C anteriores. Los 60 archivos se verificaron por HTTP y hash; una muestra ajustada se cargó y reprodujo en el navegador integrado. No se introdujeron puntuaciones humanas. HTML SHA-256 857a90e41fb0c664ec82438aa9f664880d675d6174c95d4117cfe07e01064318; manifiesto 97495a9e7626a705520512079c2445b7efb1081dc722254ade005140b50d986c.

Sesión principal L4: watchdog iniciado en epoch 1793770157,7198067; solicitud de apagado 1793771894,8903112; intervalo 1.737,170505 s (28,95 min). Tarifa actual observada: 1,94 unidades/h; conversión estimada del piloto 0,0999 USD/unidad: 0,09352 USD, aproximadamente 0,10 USD. Watchdog de dos horas: máximo estimado 0,387612 USD, dentro del límite autorizado de 5 USD. Asignaciones de conexión anteriores al watchdog y factura efectiva no medidas por separado: null. La GPU se verificó desconectada después de recuperar y validar ambos respaldos. No confundir el intervalo de sesión con los 170,82 s de entrenamiento y validación.

Respaldo adicional Chatterbox M5 SHA-256 219f73291e7568f327706128d162593538539dbe4c9df71199f5fe178cc22efc (13.314.053 bytes), recuperado y verificado. Pruebas: pnpm check, 284 pruebas Node, una prueba local de separación y dos regresiones CPU del adaptador en Colab. La prueba de la interfaz cubre cuatro voces/60 archivos distintos, condiciones completas, puntuación cero, notas, navegación y aislamiento de borradores. Precisión de cronómetros no calibrada y sobrecosto de instrumentación null. Los resultados no validan reconocimiento médico, acento, derechos comerciales ni mejoras en Whisper.


## Comparación directa y estado comercial · 04-11-2026

Por solicitud del responsable, Mostrar modelos/Ocultar modelos permite revelar Qwen original, Qwen ajustado (600 pasos) y Chatterbox (4.020 pasos) sin puntuar las 60 muestras. No cambia el orden A/B/C ni la clave de borrador ni modifica calificaciones al revelar. Se recuerda la visibilidad en el navegador. El JSON v2 conserva eventos de exposición y, para cada campo modificado, si se veían los nombres y si se habían revelado desde que comenzó este registro. La exposición histórica anterior a este cambio es null; no se presume ciega. Ocultar después no convierte una evaluación expuesta en ciega. Las medias completas siguen requiriendo puntuaciones completas, sin rellenar pendientes con cero.

El 04-11-2026 se verificaron la fuente SLR71 (https://openslr.org/71/) y el resumen de CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). La licencia permite compartir y adaptar incluso comercialmente, con atribución y ShareAlike según corresponda; también advierte que pueden intervenir otros derechos de privacidad, imagen/voz y derechos morales. No es una prohibición comercial demostrada. El alcance sobre voces sintetizadas, pesos adaptados, obligaciones de distribución y permisos adicionales continúa pendiente en este proyecto. Los 60 audios usan referencias de SLR71; ninguno tiene uso comercial confirmado en el registro. La licencia Apache-2.0 del motor Qwen no resuelve por sí sola los permisos de las voces de referencia. No se han publicado ni autorizado automáticamente audios ni pesos por activar la comparación directa.

Verificación: pruebas de interfaz conservan puntajes al revelar, muestran los tres modelos sin evaluación completa, permiten ocultarlos y registran exposición por campo. Reproductor regenerado/recargado y nombres visibles con 0/60 escuchas; se restauraron voz M5 y frase 04 del responsable, sin introducir puntuaciones. Tiempo de interacción humana y sobrecosto de instrumentación: null. Versión HTML 131b8bc479c4f7a3d04a8ce4b34b2ee0677354a7972432703e211ded2afeee7c. No hubo ejecución GPU ni cambios en los WAV.
