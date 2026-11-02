# Corpus sintético para cierre del MVP

Estado: generado localmente el 02-11-2026; no ejecutado contra ASR ni escuchado/validado por una persona. No sustituye pruebas de Samsung/iPhone ni voces humanas.

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
