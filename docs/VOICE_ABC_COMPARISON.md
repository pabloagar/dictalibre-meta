# Comparación privada A/B/C de ocho voces

## Hipótesis y condiciones

El ajuste puede cambiar el acento y la naturalidad respecto del modelo original. La comparación incluye un único motor con ocho referencias vocales, cinco frases idénticas por referencia y tres estados: original (0 pasos propios de ajuste), 4.020 y 4.770 pasos. El último estado no se considera superior por haber entrenado más: no mejoró la pérdida de validación. Cinco hablantes fueron reservados y tres vistos durante el ajuste; edad y estilos de los perfiles son objetivos sin certificar.

Se completan únicamente los 32 controles originales pendientes (p01, p02, p04, p05); p03 ya existe para las ocho voces. El nuevo proceso nunca carga adaptadores. Modelo, código, dependencias, semilla 20261103 y referencias se fijan en los archivos del piloto. Los controles se generaron en dos sesiones: conservar sus entornos por separado, sin atribuirles un único tiempo de carga.

## Medición y decisión

- Evaluación exploratoria de un oyente: acento chileno y naturalidad, 0–5 por audio. Sin selección es pendiente; 0 es una respuesta válida. Notas subjetivas libres y marcas de tiempo.
- Orden determinista aleatorio A/B/C por frase. Las letras no representan un checkpoint fijo. Revelar después de completar 120 escuchas y puntuaciones; la página local no constituye ocultación criptográfica.
- Informar diferencias pareadas entre estados por voz y por frase, además de medias globales. Criterio exploratorio del piloto: media mínima 4/5 en acento y naturalidad, sin errores de contenido en las muestras revisadas; cualquier fallo de contenido anotado impide aprobar esa muestra para un futuro corpus. La aprobación de estabilidad con frases nuevas sigue siendo una fase posterior. No confundir este criterio exploratorio con evidencia independiente de mejora en Whisper.
- Verificación técnica: hashes del WAV FLOAT y NPY, igualdad de señales, valores finitos, no silencio total y pico sobremuestreado 4x. Conservar todos los originales y fallos. Una ganancia constante para los 120 archivos de escucha evita superar el margen de −2 dBFS estimado; no repara una distorsión previa ni certifica true peak.
- Generación medida desde sincronización CUDA previa hasta sincronización posterior, antes de escribir archivos; segundos y RTF = segundos de generación / duración de audio. Descarga y carga separadas. Coste estimado a partir del intervalo de asignación, tarifa observada y conversión documentada del piloto; no equivale a factura.
- Sobrecosto de instrumentación, velocidad de red y tiempos de interacción humana: null, no medidos. El tiempo de instalación y la GPU ociosa también consumen presupuesto.

## Reproducción y almacenamiento

`generate_missing_base.py` produce 32 resultados. `worker_base32.py` instala las revisiones fijadas y empaqueta la evidencia. El notebook debe activar primero el apagado automático y verificar tarifa, L4 y presupuesto. El worker por sí solo no limita la duración de asignación de Colab.

`merge_base32.py` verifica los 88 resultados previos y los 32 nuevos antes de crear otra carpeta. `correct_eight_levels.py` prepara copias de escucha; `build_eight_player.py --three-way` construye el reproductor de 120 audios. La interfaz conserva las vistas Voces, Evaluar, Resultados y Método.

El borrador A/B/C usa una clave independiente del borrador A/B; no se transfieren puntuaciones entre letras con distinto orden. Resultados incluye un enlace a la evaluación anterior. Exportar JSON conserva notas, escala y mapa de condiciones.

Los datos del laboratorio, audios, referencias, pesos y exportaciones son privados y quedan fuera del repositorio. Permisos de SLR71 para las distribuciones previstas pendientes de resolver. Ningún resultado de esta comparación está aprobado automáticamente para uso comercial o entrenamiento de Whisper.

## Estado de ejecución

Completado el 04-11-2026: 32/32 generaciones, 24 originales sin sobrepasar el pico y 8 con `error_recorte`; todos legibles, finitos y no silenciosos. Se conservan los 120 WAV FLOAT y NPY. Las 120 copias de escucha pasan el control de pico 4x con una ganancia común de 0,7275195281; esta prueba no acredita naturalidad ni ausencia de distorsión audible.

L4 de 23.034 MiB, controlador 580.82.07, Python 3.13.16. Instalación 198,99 s; descarga del modelo 11,65 s; carga 15,50 s; generación 253,44 s para 289,20 s de audio (RTF ponderado 0,8763). El conjunto completo dura 1.117 s (18 min 37 s), mayor que la estimación inicial del plan. Worker 502,88 s, excluyendo transferencia posterior. Registro de 129 dependencias efectivas en respaldo privado.

Entre watchdog y solicitud de apagado: 872,29 s. Tarifa visible 1,94 unidades/h, saldo inicial visible 144,93 unidades. Conversión estimada del piloto 0,0999 USD/unidad: 0,04696 USD, aproximadamente 0,05 USD. Tiempo de asignación anterior al watchdog y factura efectiva: null. Watchdog de una hora (unos 0,194 USD a esa tarifa); apagado manual verificado en Colab al finalizar el respaldo. Hubo errores de visualización y descarga que prolongaron la sesión; no se repitieron las generaciones.

Respaldo SHA-256 `a44a8ffb561fc04b29ef5c2561d9f37f4aef986c1213fdb8bfe21f730a067e8c`; manifiesto combinado `f76410c2b14e4d9150ba16b5b8977289297e0fc8f2c079131561c97500604f4f`. Código ejecutado conservado dentro del respaldo, generado desde archivos de trabajo; no se atribuye la inferencia a un commit posterior.

Reproductor activo privado: http://127.0.0.1:8805/abc/ESCUCHAR_OCHO.html?v=abc1. Se verificaron por HTTP los hashes de las 120 copias de escucha y se probó una reproducción en el navegador integrado, sin introducir puntuaciones humanas. A/B anterior intacto. `pnpm check` y 282 pruebas pasan; prueba específica A/B/C cubre 120 archivos únicos, las tres condiciones por frase, puntuación 0 válida, navegación, notas y aislamiento del borrador anterior. Acento y naturalidad pendientes del responsable.
