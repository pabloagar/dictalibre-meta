# Piloto MOSS / Stable Audio Small-SFX

Prueba de inferencia, sin entrenamiento: los mismos cinco textos, cinco segundos
y una semilla por caso para cada motor. No se usan voces ni audios de referencia.
Hipótesis y criterios se definen antes de generar en protocol.json. No se afirma
idoneidad terapéutica ni exclusividad sobre las salidas.

## Demos oficiales sin gasto

En un entorno Python aislado, instalar requirements.txt. Ejemplo desde la raíz:

```
python scripts/sfx-ai/run_demo.py --engine moss --output data/local/sfx-demo-moss
python scripts/sfx-ai/run_demo.py --engine stable --output data/local/sfx-demo-stable
```

No se aceptan APIs pagadas; no se envían tokens implícitos ni telemetría añadida.
Se verifica la revisión del Space antes de enviar las solicitudes. Se guardan
resultados y errores; ante cuota/autenticación se detiene, sin tormenta de
reintentos. Los Spaces no fijan públicamente la revisión de pesos cargados:
served_model_revision es null. El head del modelo observado no prueba qué pesos
sirvió la demo. Request wall incluye cola, carga, generación y transferencia;
no debe compararse con tiempo de generación GPU sincronizado.

## Ejecución propia en Colab L4

run_gpu.py exige L4 y un presupuesto autorizado externo: cap 3 USD, watchdog
armado, tarifa conservadora y plazo de sesión. El responsable autorizó expresamente
esta ejecución posterior: el campo paid_services_allowed=false del protocolo de
demos no autoriza cómputo; la autorización GPU viene del presupuesto separado.
No basta con ejecutar el script para asignar ni contratar una GPU.

Antes de instalar/cargar: preparar temporizador de desconexión en el notebook,
verificar dispositivo/tarifa/saldo y registrar budget.json. Los bootstrap fijan
revisiones de código y entornos separados (MOSS y Stable usan versiones distintas
de NumPy/Torch/Transformers). MOSS fija sus dependencias declaradas y conserva
freeze efectivo; Stable usa uv.lock oficial congelado y conserva freeze. No se
promete resolución idéntica de transitivas MOSS en futuras instalaciones.

El modelo y su codificador se descargan por revisión, se registran hashes y
se cargan desde esa instantánea. Para Stable, el responsable debe aceptar en
Hugging Face las condiciones de acceso y Gemma; un token de lectura se guarda
como HF_TOKEN en Colab Secrets y se pasa solo por entorno a la descarga oficial.
Nunca se imprime, exporta ni introduce en código, manifiestos o Git. La credencial
se pasa explícitamente para que el modo anónimo del cliente de demos no la inhiba.

bootstrap_moss.py prepara y genera MOSS. bootstrap_stable.py solo prepara el
entorno; finish_stable.py genera después de que MOSS termine. Cada entorno GPU
genera cinco WAV FLOAT originales, conservando valores incluso fuera de [-1,1],
sin normalización ni limitación oculta. Los archivos originales de las demos
pueden venir ya normalizados/cuantizados por el proveedor; no son salida cruda.

## Medición y revisión

Descarga, hashing de pesos, carga y generación se miden aparte con perf_counter;
generación sincroniza CUDA al inicio/final e incluye la llamada completa al modelo.
La copia CPU y escritura WAV ocurren después y no se incluyen en ese intervalo.
RTF = segundos de generación / duración WAV. Pico de memoria: máximo asignado por
PyTorch desde antes de generar, incluye pesos cargados. Resolución no calibrada;
sobrecosto de instrumentación null. No medir eficacia por estos valores.

Audio: tasa, canales, duración, finitud, silencio, RMS, pico muestral y número de
muestras cerca de escala completa. Este último contador no demuestra por sí solo
recorte audible. Aceptación técnica no equivale a aceptación humana de contenido,
comodidad o calidad. No se mezclan puntuaciones ausentes con cero.

```
python scripts/sfx-ai/test_sfx.py
python scripts/sfx-ai/build_review.py --moss RUTA/manifest.json --stable RUTA/manifest.json --output CARPETA_PRIVADA_DEL_PANEL
```

build_review conserva originales verificados por SHA-256 y crea copias de escucha:
objetivo RMS -24 dBFS, techo de pico muestral -3 dBFS, ganancia máxima 8. No cambia
duración, canales, tasa o textura; no garantiza igual sonoridad percibida. El visor
ai-compare.html permite escuchar sin puntuar, anotar y exportar evaluación parcial.
Los faltantes se muestran pendientes. No hay una API propia de producción aún.

Si Colab no permite descargar resultados, exportar el notebook privado que
contenga el respaldo stdout delimitado y usar recover_notebook.py --notebook
RUTA.ipynb --output CARPETA_PRIVADA. El recuperador no ejecuta celdas: verifica
longitud y SHA-256 antes de escribir los ZIP. No publicar ese notebook. Revisar
sus salidas antes de compartir: excepciones de bibliotecas HTTP pueden incluir
credenciales. El runner conserva solo la clase del error y suprime la cadena
original al fallar; esa protección es posterior al piloto registrado.

## Licencias y publicación

MOSS declara Apache-2.0 para los pesos; Stable usa licencia Community y condiciones
Gemma, independientes del código MIT de su motor. Consultar fichas exactas:

- https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0
- https://huggingface.co/stabilityai/stable-audio-3-small-sfx
- https://stability.ai/community-license-agreement

No aplicar a estas salidas el permiso de los sonidos procedurales de apps/bilateral.
Conservar procedencia y condiciones aplicables. El permiso comercial de un motor
no prueba exclusividad ni ausencia de derechos de terceros en cada salida.
Se publica código/documentación/pruebas, excluyendo WAV, pesos, tokens, notebooks
con resultados y exportaciones privadas. La documentación de ejecución real y
sus limitaciones se registra en EXPERIMENTS.md y HACKATHON_LOG.md.
