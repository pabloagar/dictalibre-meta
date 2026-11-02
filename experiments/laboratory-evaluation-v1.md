# Protocolo de ampliación · 2026-11-02

Estado: instrumentación léxica implementada; ensayos humanos y acústicos pendientes. No hay resultados clínicos nuevos. Separar implementación visual, evaluación de motores y evaluación humana.

## Corpus sintético v1 (guiones, no audios medidos)

| ID | Guion | Oportunidades para anotación |
| --- | --- | --- |
| neg-01 | No se observa neumotórax. | Negación |
| neg-02 | Se observa neumotórax. | Control afirmativo |
| lat-01 | Nódulo pulmonar derecho. | Lateralidad |
| lat-02 | Nódulo pulmonar izquierdo. | Lateralidad |
| med-01 | Lesión de tres milímetros. | Valor y unidad |
| med-02 | Lesión de tres centímetros. | Valor y unidad |

Estos guiones no son referencias humanas validadas de grabaciones existentes. Antes de ejecutar: producir WAV, registrar SHA-256, voz/fuente, frecuencia, duración, versión y referencia validada escuchando. Ampliar a 30 audios distintos; reservar casos no usados para ajustar reglas. Variantes: limpio, ruido añadido a 20/10 dB SNR, muletillas y pausas de 0,5/2 s. Registrar semilla, algoritmo, hash del ruido, RMS y posiciones; no atribuir SNR a grabaciones sin medirlo. La generación acústica y su verificación siguen pendientes.

## Comparación pareada

Hipótesis: la configuración cambia precisión/latencia sobre el mismo audio. Misma entrada/hash, configuración congelada, orden AB/BA alternado, tres repeticiones técnicas; separar frío/caliente y archivo/streaming. Unidad independiente: audio o hablante, no repetición. Conservar fallos y resultados desfavorables. Registrar HEAD observado y dirty, hash de fuentes, runtime, modelo, dispositivo, navegador, red y fuente; desconocidos null. Criterio técnico: errores calculados coinciden con fixtures y no cambia original. Umbral de superioridad clínica pendiente de profesional; no declarar ganador global.

## Anotación humana y edición (pendientes de captura integrada)

Por ejecución y etapa (ASR, formato, revisión, edición), guardar snapshot/hash separado, referencia/version, oportunidad ID, categoría negación/lateralidad/medida, esperado/observado y juicio correcto/sustituido/omitido/añadido/no evaluable. Dos evaluadores con identificadores de estudio no personales, discrepancias adjudicadas; no usar el LLM como referencia. Registrar cada denominador y añadidos por separado. Conservar historial sin sobrescribir ASR.

Edición: presentar motores ocultos en orden alternado, iniciar reloj monotónico cuando el participante pulsa Comenzar con texto visible; finalizar al aprobar. Guardar duración, eventos input (no pulsaciones inferidas), pausas/abandono y snapshot final separado. Evaluador independiente anota errores residuales. Comparar por audio; contrabalancear aprendizaje. No sumar intervalos solapados para obtener tiempo usable.

Revisor: anotar errores presentes antes, corregidos, no detectados, propuestas incorrectas y errores introducidos después. Aceptar/rechazar no equivale a acertar/fallar. Sensibilidad=errores detectados/errores previos anotados; precisión=propuestas correctas/propuestas evaluadas. Sin anotación o denominador cero: null. Panel de anotación, persistencia de juicios y cálculo clínico pendientes.

## Usabilidad independiente

Tareas A/B del documento de rediseño y C localizar mejor WER, D detectar lateralidad, E identificar menor petición, F exportar, G interpretar fallo, H encontrar revisión pendiente. Inicio explícito→respuesta confirmada; segundos, clics, errores y éxito humano. Tres repeticiones por variante, mismo viewport/navegador/zoom/datos, orden alternado. Criterio exploratorio A: mediana al menos 15% menor sin más errores; B no empeora. No mezclar con tiempos ASR. Ensayo humano y captura integrada pendientes.


## Actualización de implementación
La captura integrada antes descrita como pendiente está implementada en LAB_STUDIES.md. También generador/importador y variantes acústicas reproducibles. Siguen pendientes los ensayos humanos y validación de referencias. El corpus de arranque tiene seis frases base; 30 variantes TTS más 12 de ruido no cumplen aún el objetivo de 30 audios base independientes. No usar el fixture de UI como evidencia clínica.
