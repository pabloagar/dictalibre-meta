# Adaptación experimental de Chatterbox y destino Whisper

Objetivo del responsable, 03-11-2026: conservar un TTS de pesos abiertos adaptado al habla chilena, usarlo para producir audios revisados y después entrenar Whisper con esos audios. El adaptador TTS no se carga dentro de Whisper. Son dos modelos y dos etapas de entrenamiento distintas.

Repositorio de trabajo: https://github.com/pabloagar/dictalibre-meta/tree/codex/capture-transport/scripts/voices-chile . Se publica código y metodología; corpus, voces, claves, resultados privados y pesos experimentales quedan en el laboratorio separado. El código propio mantiene la licencia del repositorio; Chatterbox y sus dependencias conservan las suyas. No afirmar que todo el proyecto hereda MIT.

## Estado verificable

- Implementado inventario reproducible de índices SLR71 y separación de hablantes y textos. Ejecutado: 4.374 registros, 31 identificadores de hablante, 2.564 entradas train, 275 validation y 1.535 excluidas por texto compartido entre particiones. No son 4.374 ejemplos ya revisados para entrenar.
- Implementada receta experimental LoRA de 1–20 pasos para Chatterbox Multilingual V3 fijado en config.json. No se ha ejecutado contra el modelo completo en GPU ni existe checkpoint chileno aprobado.
- Pruebas CPU con tensores artificiales verifican gradientes, pesos base intactos, actualización de adaptador, guardado/recarga y pérdida desplazada al siguiente token. No son entrenamiento de una voz ni prueba de memoria GPU.
- Preflight real del inventario se detiene en `training_rights_unverified:tts_adaptation`, antes de importar torch o asignar GPU. Los audios y transcripciones también necesitan revisión antes de entrenamiento. La descarga/auditoría de audio es lectura local, no entrenamiento.
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

Salidas previstas, aún no obtenidas: `adapter.safetensors`, `adapter_config.json`, `steps.json`, `environment.json`, `status.json`. El adaptador necesita la revisión exacta del modelo base y wrappers LoRA; no es un motor autónomo. La recarga de esta prueba ocurre sobre el mismo proceso y base restaurada: queda pendiente comprobar un proceso nuevo e inferencia WAV antes de declararlo reutilizable.

## Después de la prueba técnica

1. Medir validación en hablantes reservados, generar textos nuevos y comparar base/adaptado con las mismas referencias; no decidir por pérdida train.
2. Escucha ciega de acento, naturalidad y fidelidad; comprobar diversidad de voces y estabilidad. Si falla, preservar fallos y revisar datos/receta.
3. Solo después de permisos y aprobación, generar corpus ficticio con WAV original, copia 16 kHz, transcripción literal y trazabilidad.
4. Entrenar Whisper como experimento separado; comparar B0 original, B1 glosario, B2 sintético general y B3 sintético chileno, con textos/cantidades comparables y test real independiente. No afirmar mejora clínica por WER sintético.

Referencias técnicas inspeccionadas: [T3 oficial fijado](https://github.com/resemble-ai/chatterbox/blob/5de7a54aa4e5e2baadb0182dde554908b48b85c2/src/chatterbox/models/t3/t3.py), [carga y condicionamiento V3](https://github.com/resemble-ai/chatterbox/blob/5de7a54aa4e5e2baadb0182dde554908b48b85c2/src/chatterbox/mtl_tts.py), [SLR71](https://openslr.org/71/), [publicación del corpus](https://aclanthology.org/2020.lrec-1.801/).
