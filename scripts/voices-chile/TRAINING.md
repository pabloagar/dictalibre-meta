# Adaptación experimental de Chatterbox y destino Whisper

Objetivo del responsable, 03-11-2026: conservar un TTS de pesos abiertos adaptado al habla chilena, usarlo para producir audios revisados y después entrenar Whisper con esos audios. El adaptador TTS no se carga dentro de Whisper. Son dos modelos y dos etapas de entrenamiento distintas.

Repositorio de trabajo: https://github.com/pabloagar/dictalibre-meta/tree/codex/capture-transport/scripts/voices-chile . Se publica código y metodología; corpus, voces, claves, resultados privados y pesos experimentales quedan en el laboratorio separado. El código propio mantiene la licencia del repositorio; Chatterbox y sus dependencias conservan las suyas. No afirmar que todo el proyecto hereda MIT.

## Estado verificable

- Implementado inventario reproducible de índices SLR71 y separación de hablantes y textos. Ejecutado: 4.374 registros, 31 identificadores de hablante, 2.564 entradas train, 275 validation y 1.535 excluidas por texto compartido entre particiones. No son 4.374 ejemplos ya revisados para entrenar.
- Implementada receta experimental LoRA de 1–20 pasos para Chatterbox Multilingual V3 fijado en config.json. Ejecutada contra el modelo completo en Colab T4: 20/20 pasos y adaptador guardado/recargado. Acento chileno aún no aprobado.
- Pruebas CPU con tensores artificiales verifican gradientes, pesos base intactos, actualización de adaptador, guardado/recarga y pérdida desplazada al siguiente token. No son entrenamiento de una voz ni prueba de memoria GPU.
- El preflight inicial del inventario se detuvo en `training_rights_unverified:tts_adaptation`, antes de importar torch o asignar GPU. El modo privado posterior admite el control del proveedor, explícitamente separado de escucha propia; ver actualización inferior. La descarga/auditoría de audio es lectura local, no entrenamiento.
- Auditoría de audio ejecutada sobre bloque femenino: 1.738 WAV, 10.211,498667 segundos (~2,84 h), todos técnicamente válidos con el criterio del piloto. Corpus masculino, escucha y revisión literal pendientes. ZIP y controles privados conservados.
- Whisper, calidad del acento, identidad nueva y permiso comercial siguen pendientes. Los 20 pasos prueban funcionamiento mecánico; no bastan para declarar aprendizaje del acento.

## Datos y permisos

SLR71 declara CC BY-SA 4.0 y su publicación describe finalidad TTS. Eso es evidencia positiva de uso de datos, no una prohibición. Sigue pendiente cerrar el alcance sobre identidad vocal y derivados para el producto previsto. Conservar la licencia y atribución; no sustituirlas por MIT del motor. No utilizar la referencia mexicana antigua ni la voz del responsable.

`rights.json` separa `tts_adaptation`, `voice_conditioning`, `commercial_use`, `asr_training`, `redistribute`. Los dos primeros son requisitos del entrenamiento experimental. Los demás no se aprueban al completarlo. Cada revisión debe tener evidencia, revisor y fecha, vinculada al hash del manifiesto exacto; editar el manifiesto exige revisar esa vinculación. No llenar `verified` solamente para hacer pasar el comando.

El manifiesto comienza con hashes de audio null y `transcript_reviewed=false`. Tras inspección, seleccionar clips de 1–12 segundos, conservar train/validation, al menos dos hablantes train y dos grabaciones por cada hablante train; completar rutas relativas, SHA256 y revisión literal. No convertir automáticamente un control técnico positivo en revisión humana. Guardar exclusiones y motivo. El futuro test real de Whisper debe ser independiente también de esta validación TTS.

## Comandos

```powershell
python training_data.py --indices female.tsv male.tsv --output INVENTARIO_NUEVO
# Opcional: descarga y auditoría local sin extracción ni síntesis
python audit_slr71_audio.py --output AUDITORIA_NUEVA
# Primero: solo revisión previa, sin importar torch ni descargar modelo
python train_chatterbox.py --manifest DATOS/manifest.json --audio-root DATOS/audio --rights DATOS/rights.json --output PREFLIGHT_NUEVO
```

Usar entorno aislado, `requirements-chatterbox.txt`, y código Chatterbox instalado con `--no-deps` desde el commit de config.json. El entrenador rechaza otra revisión instalada. GPU NVIDIA externa; no instala CUDA ni modifica el servidor de dictado.

```powershell
python train_chatterbox.py --manifest DATOS/manifest.json --audio-root DATOS/audio --rights DATOS/rights.json --output SMOKE_NUEVO --budget budget.json --run --steps 20 --max-seconds 600
```

`budget.json` exige tarifa observada, tasa, tiempo máximo, watchdog externo realmente armado, fuente, fecha y `remaining_cap_usd` dentro del límite original de US$10. Descontar consumo previo; no copiar tarifas históricas como actuales. El script revisa tiempo entre operaciones, pero una operación GPU bloqueada requiere el watchdog externo de Colab. No lanzar GPU mientras preflight no pase; al finalizar, recuperar los archivos y desconectar. El entrenador no compra recursos ni arma por sí solo el watchdog.

## Qué entrena y cómo se comprueba

LoRA rango 8, alpha 16 en q_proj/v_proj de T3; congelados pesos base, encoder vocal y S3Gen. Batch 1, AdamW 1e-4, autocast fp16 y GradScaler, checkpointing no reentrante. Cada ejemplo se condiciona con otra grabación del mismo hablante. Selección round-robin para no consumir todos los pasos con una sola voz. No se mezclan embeddings de hablantes ni se presume identidad nueva.

La pérdida propia alinea logits `[batch, tiempo, vocabulario]` con **el siguiente** token acústico, incluido EOS. No usa directamente `T3.loss` del commit inspeccionado, cuya llamada a cross_entropy no transpone los ejes ni desplaza el objetivo. Este hallazgo es revisión estática del código oficial, no un fallo reproducido del proveedor en entrenamiento.

Éxito de la prueba: pérdidas y gradientes finitos/no nulos, ningún gradiente en pesos congelados, adaptador cambia, se guarda y sus logits coinciden tras restauración (atol/rtol 1e-4). Se registran tiempos por paso con sincronización CUDA, memoria allocated/reserved máxima, carga/descarga/preparación por separado, pip freeze, dispositivo, semillas, hashes y errores. Sobrecosto de instrumentación, tarifa facturada y calidad perceptual quedan null/no validados donde no hay medida.

Salidas obtenidas en la prueba privada: `adapter.safetensors`, `adapter_config.json`, `steps.json`, `environment.json`, `status.json`. El adaptador necesita la revisión exacta del modelo base y wrappers LoRA; no es un motor autónomo. La recarga de esta prueba ocurre sobre el mismo proceso y base restaurada: también se completó recarga en proceso nuevo y generación de cuatro WAV comparativos (ver resultado inferior). La calidad de voz reutilizable sigue pendiente de evaluación.

## Después de la prueba técnica

1. Medir validación en hablantes reservados, generar textos nuevos y comparar base/adaptado con las mismas referencias; no decidir por pérdida train.
2. Escucha ciega de acento, naturalidad y fidelidad; comprobar diversidad de voces y estabilidad. Si falla, preservar fallos y revisar datos/receta.
3. Solo después de permisos y aprobación, generar corpus ficticio con WAV original, copia 16 kHz, transcripción literal y trazabilidad.
4. Entrenar Whisper como experimento separado; comparar B0 original, B1 glosario, B2 sintético general y B3 sintético chileno, con textos/cantidades comparables y test real independiente. No afirmar mejora clínica por WER sintético.

Referencias técnicas inspeccionadas: [T3 oficial fijado](https://github.com/resemble-ai/chatterbox/blob/5de7a54aa4e5e2baadb0182dde554908b48b85c2/src/chatterbox/models/t3/t3.py), [carga y condicionamiento V3](https://github.com/resemble-ai/chatterbox/blob/5de7a54aa4e5e2baadb0182dde554908b48b85c2/src/chatterbox/mtl_tts.py), [SLR71](https://openslr.org/71/), [publicación del corpus](https://aclanthology.org/2020.lrec-1.801/).

## Actualización: prueba privada con revisión del proveedor (03-11-2026)

El responsable solicitó ejecutar el entrenamiento. Se incorpora `--research-source-qc`, limitado al smoke privado SLR71. La base documental es la licencia pública CC BY-SA 4.0 y la publicación del corpus específicamente para TTS; esto permite fundamentar el experimento sin afirmar permisos universales de identidad o producto comercial. Se preservan atribución y licencia. El registro de derechos conserva comercialización, redistribución y ASR pendientes; no se rellenan como verificados.

La transcripción conserva `transcript_reviewed=false` y añade `transcript_provenance=provider_manual_qc`: OpenSLR declara control manual, con posibles errores. La opción exige propósito privado, fuente e índices. Sin ella sigue vigente la revisión propia. La exportación de corpus conserva sus requisitos humanos. No usar esta opción para etiquetar una voz como aprobada.

Subconjunto determinista preparado localmente: inventario femenino con semilla 20261103, primeras cuatro entradas por hablante tras excluir textos compartidos entre particiones: 52 WAV de 13 hablantes; 44 train y 8 validation. WAV sin transformar, SHA256 comprobados, controles técnicos aprobados. Los 20 pasos usan selección round-robin del entrenador; validation aún no mide acento. Estado GPU y resultados se registrarán al terminar la ejecución, sin sustituir resultados por preparativos.


Resultado real: 20/20 pasos completados en Tesla T4, torch 2.6.0+cu124, Python 3.13.16. Tiempo de pasos 6,095640 s (no incluye instalación, descarga, carga ni preparación); descarga 17,695528 s, carga 19,085028 s, preparación 22,070645 s. Pérdidas 2,022552–3,968077 entre ejemplos diferentes; no es una curva de validación ni evidencia de mejora. Pico allocated 3.359.423.488 bytes. Adaptador de 3.944.904 bytes, SHA256 dc41ed85a39d33f5bbee6d18f39563ce41ab7f0c2baf615cb36103954739061f. Trainer SHA256 78c68721ecc8057dfad85aac48d9a0822039f43f9ee0f6af7839bf7d3cfdb7a2 (árbol de trabajo; no atribuido retrospectivamente a commit).

Recarga en proceso nuevo y comparación base/adaptado: dos frases médicas ficticias por variante, misma referencia de hablante reservado y semilla. 4/4 WAV técnicos correctos; escucha, acento, fidelidad e identidad nueva no validados. Las referencias del corpus no se convierten en identidades artificiales por entrenar LoRA. Advertencias de diferencia entre longitud mel y tokens del referente conservadas en logs; no se consideran revisión de calidad aprobada.

ZIP privado descargado y comprobado: SHA256 151f4cb01993775d1645c5fe8697299d1700aa6e4264c34ea4d466b7ebd35ecf. Incluye pesos, código ejecutado, manifiestos, licencia/atribución, métricas y WAV. Saldo visible 147,71→147,67 unidades: estimación US$0,003996 por diferencia mostrada, provisional por redondeo/latencia del panel; no factura. Techo estimado del watchdog de una hora US$0,114885 a tasa observada. GPU desconectada verificada: cero sesiones, tasa cero. No se entrenó Whisper ni se exportó un corpus comercial.


## Continuación ampliada con validación

`train_extended.py` continúa los pesos del adaptador anterior (verifica SHA256, rango y base), con optimizador nuevo. No es reanudación exacta del estado AdamW del smoke. Admite hasta 5.000 pasos y techo propio US$5; esta prueba solicita 2.000 adicionales, lr 3e-5, evaluación cada 250 y máximo 2.400 s. Plan y fuentes se registran antes de actualizar pesos. `schedule` cubre cada clip train antes de repetir; ningún clip validation entra al optimizador.

Se retienen en CPU tokens y condiciones sin gradientes, transfiriendo únicamente el ejemplo actual a GPU. Validación eval/no_grad sobre conjunto fijo elegido por semilla, pérdida ponderada por tokens. Se preservan checkpoints y optimizador del último control; mejor y último adaptador se guardan separados. Tres controles sin un nuevo mínimo detienen el entrenamiento. El mínimo puede ser el adaptador inicial; no se fuerza una mejora. La validación se utiliza para seleccionar y no es un test independiente.

El modo documental `private_research_adaptation` extiende el experimento privado solicitado; comercialización y exportación continúan pendientes. No se cambia el significado de transcript_reviewed=false.

`compare_extended.py` se ejecuta después en otro proceso y genera cinco frases idénticas por variante: base, 20 pasos, mejor adaptador. Guarda también resultados técnicamente defectuosos. `build_comparison.py --source CARPETA_COMPARISON --output REPRODUCTOR.html --description TEXTO` verifica hashes y crea un reproductor portátil de tres columnas. La lectura JSON es UTF-8 explícita para conservar tildes en Windows; archivos WAV y manifiesto original no cambian. La evaluación visible es exploratoria, no ciega ni aprobación automática para exportar corpus.


Ejecución ampliada completada: 2.000 pasos adicionales sobre 1.264 clips / 2,04 h. Mejor adaptador: 1.520 pasos acumulados, pérdida de validación 2,154837 frente a 2,256562 a los 20 pasos. Comparación recargada en proceso nuevo: 15 WAV, 12 técnicamente correctos, una saturación por variante; revisión perceptual pendiente. Coste estimado por saldo ~US$0,048; GPU desconectada, cero sesiones. Checkpoints y muestras privados respaldados; metodología, hashes y límites en EXPERIMENTS.md y HACKATHON_LOG.md.


La continuación mixta incorpora --balance-speakers: igual cantidad de actualizaciones por hablante (diferencia máxima de una), reciclando cada lista barajada cuando se agota. Esto puede repetir clips de hablantes con pocos datos antes de consumir todos los de quienes tienen más; cobertura real se registra y no se presupone. Validación round-robin sin repetir clips hasta completar la cantidad pedida. --references permite comparación de varios hablantes reservados; pasos del adaptador anterior se leen de su configuración. Para esta prueba se seleccionan dos mujeres y dos hombres, con 60 generaciones totales. Las voces son referencias reales del corpus, no identidades artificiales nuevas.

Resultado mixto: 4.000 pasos nuevos, parada por tres controles sin mejora; mejor 4.020 acumulados. Usó 2.737 clips de 26 hablantes. Validación 0,949 % menor que el adaptador 1.520; no demuestra acento. Comparación 60 WAV, 45 técnicamente correctos, 15 con picos fuera de rango (base 4, anterior 5, mixto 6). Respaldo privado verificado y GPU apagada; coste estimado US$0,081. Detalles, hashes y límites en EXPERIMENTS.md.
