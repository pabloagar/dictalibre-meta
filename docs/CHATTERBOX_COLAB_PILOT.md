# Piloto Chatterbox V3 en Colab

Fase autorizada el 03-11-2026: 12 guiones originales sintéticos, una voz incorporada, una repetición por guion, condición limpia. No incluye pacientes, referencias de voz personales, variantes con ruido ni validación clínica.

Notebook reproducible público: `experiments/chatterbox-colab-pilot.ipynb` (sin salidas ni metadatos personales). El notebook ejecutado y sus audios permanecen privados.

El script reproducible es `scripts/chatterbox-colab-pilot.py`; se ejecuta en la GPU de Colab, no en el backend de Dicta Libre. Requiere instalar Chatterbox desde la revisión `5de7a54aa4e5e2baadb0182dde554908b48b85c2` del repositorio oficial resemble-ai/chatterbox. Usar un entorno aislado con virtualenv; el módulo venv del Python 3.13 de esta sesión falló al crear el entorno. Las dependencias resueltas se conservan en pip-freeze.txt.

## Protocolo previo

Hipótesis de factibilidad: V3 produce doce WAV técnicamente íntegros y conserva la lectura del texto. Aceptación técnica: 12/12 archivos finitos, no silenciosos, legibles y con duración positiva. Aceptación auditiva pendiente: 12/12 conservan términos, cifras, negaciones y comandos, sin omisiones ni repeticiones. No escalar antes de revisar los audios. Una voz sintética no representa hablantes humanos ni demuestra precisión ASR.

Tiempo directo de generación en segundos: perf_counter, después de sincronizar CUDA y antes de generate, hasta sincronización CUDA posterior. Excluye carga/descarga del modelo y escritura/hash del WAV. Duración directa = muestras/frecuencia. RTF derivado = segundos de generación/duración. No se comparan variantes ni se fija umbral de velocidad. La primera muestra puede incluir calentamiento; no se interpreta como rendimiento estable.

Se guardan configuración, semilla por caso, revisión del checkpoint descargado, commit de Chatterbox, versiones, GPU, plataforma, resolución del reloj, SHA-256, errores y resumen. Los metadatos no observados y la aprobación humana son null. La precisión efectiva y el sobrecosto de sincronización no están caracterizados: tarea pendiente antes de un benchmark. Las semillas no garantizan identidad entre versiones o dispositivos.

Los WAV, manifiestos y exportaciones permanecen privados y excluidos de Git. Cada ejecución crea una carpeta propia en /content/dictalibre_pilot; descargar el ZIP antes de liberar la sesión. El almacenamiento /content es temporal.

## Estado

Piloto generado: run_20261103T033052Z, 12/12 WAV técnicamente íntegros, 53,64 segundos en total. Se verificaron los hashes de las 12 copias PCM16 del ZIP entregado por el responsable. Evidencia de entorno: Tesla T4, 15360 MiB, driver 580.82.07, Python 3.13.16. Sin atribución a un commit de Dicta Libre.

Revisión cualitativa comunicada por el responsable el 03-11-2026: percibe pronunciación anglófona, dificultad con la ele y tropiezos al hablar. La voz no queda aprobada. No es una escucha independiente del agente; puntuaciones, casos afectados y recuentos de errores: null. Se conservan los originales como resultado desfavorable.

Prueba correctiva en Colab: casos p02, p03 y p09, una repetición por condición, semillas originales y mismo checkpoint general V3 fijado a 5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18. A usa referencia española pública de la demo oficial es-MX y parámetros originales; B usa esa misma referencia con exaggeration=0.35, cfg_weight=0.3 y temperature=0.65. B es un conjunto de ajustes, sin atribución causal a un parámetro. No se ha cambiado al checkpoint especializado LatAm.

Hipótesis: la referencia española reduce el acento anglófono percibido; B puede reducir tropiezos. Métricas humanas por WAV completo, después de una escucha de inicio a fin: naturalidad 1–5, cantidad de términos mal pronunciados y cantidad de repeticiones/cortes involuntarios. Criterio por muestra: naturalidad >=4/5, cero errores de términos, cifras o negaciones, cero tropiezos. Resultados humanos null hasta revisión. No se escala el corpus por la mera integridad técnica. El protocolo y hash de referencia se guardan antes de generar en /content/dictalibre_pronunciacion/comparison_protocol.json. Sin benchmark de velocidad ni validación ASR.


## Preferencia humana A/B · 03-11-2026

El responsable indicó «la a siempre en todas»: A preferida en p02, p03 y p09 (3/3 comparaciones). Fuente: comunicación del usuario, no escucha independiente del agente. Se selecciona A como base para la siguiente prueba: V3 general, referencia oficial es-MX, exaggeration=0.5, cfg_weight=0.5, temperature=0.8. B se conserva como resultado desfavorable relativo. Puntuaciones de naturalidad, conteos de errores/tropiezos y cumplimiento del criterio absoluto: null. Preferencia no equivale a aprobación de pronunciación perfecta ni validación ASR.


## Lote completo con A · 03-11-2026

Autorizado tras la selección de A: 12 guiones originales, una toma por guion, mismos parámetros y semillas; referencia comprobada contra SHA256 ee61089324b429371ae5562e1070283b34e220e742b60bff2457569f74484be4. Run run_20261103T040001Z, completado 04:01:30 UTC. Se conserva el protocolo previo de integridad y aceptación humana.

Resultado técnico directo: 12/12 correctos, mono 24 kHz, 64,52 s de audio; suma de intervalos de generación 71,1913 s, sin comparar velocidad con otras ejecuciones. Referencia y archivos sin saturación de pico en esta toma; conversión PCM16 con ganancia 1,0 en todos. Pista de revisión: 75,52 s, con 11 pausas de 1 s. Se recuperaron los WAV desde las salidas del notebook mediante Drive; hashes de las 12 copias y de la pista concatenada coinciden con Colab. Originales float, referencia y ZIP completo permanecen en Colab; la entrega local contiene PCM16 y evidencia.

Entorno observado: Tesla T4, Python 3.13.16, CUDA 12.4, torch/torchaudio 2.6.0, chatterbox-tts 0.1.7; las revisiones de código y modelo son las registradas arriba. Hash del generador ejecutado: 85ad5877aeaf8e7fed737db4fafa2709c7623c51386323d1d0592edc21d38f19. No se atribuye la ejecución a un commit posterior de Dicta Libre. Advertencia del modelo conservada: longitud mel de referencia no coincide con dos veces la longitud de tokens; no detuvo la generación. Efecto auditivo no determinado.

Revisión de pronunciación, naturalidad y tropiezos del lote completo: pendiente, mediciones humanas null. No se escalan 100 guiones ni se afirma precisión ASR. El notebook público conserva código de instalación, piloto, A/B y extensión A, sin outputs, audio embebido ni metadatos de cuenta.
