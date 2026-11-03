# Piloto Chatterbox V3 en Colab

## Prueba de cuatro voces completada · 03-11-2026

Solicitud explícita: cinco audios por Aldo, Dave, Joe y Kathleen en Colab. Ejecución run_20261103T052215Z, completada 05:24:24 UTC (02:24:24 America/Santiago). Resultado técnico 20/20, una toma por voz y caso, guiones p01-p05; Aldo/Dave en español y Joe/Kathleen con traducciones inglesas guardadas en el protocolo. Sin datos de pacientes, sin referencia del responsable y sin entrenamiento Whisper.

Duración directa por voz: Aldo 28,24 s; Dave 21,92 s; Joe 22,96 s; Kathleen 22,80 s. Total 95,92 s. Suma de intervalos sincronizados de generación: 103,8124 s; no es tiempo total de sesión ni benchmark comparativo. Tesla T4, Python 3.13.16, CUDA 12.4, chatterbox-tts 0.1.7, torch/torchaudio 2.6.0. Código Chatterbox 5de7a54aa4e5e2baadb0182dde554908b48b85c2 y modelo 5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18. SHA256 del generador ejecutado: f6936806ef22673647d131b4af6e0218e4f889d560e2dc45fd82b71e1228549d. No atribuir ejecución al commit posterior de documentación.

Referencias: clips completos OHF Dave 8,496 s, Joe 8,424 s y Kathleen 3,336 s; Aldo, miembro «6 (enhanced).wav» del ZIP del dataset, 8,44 s. Decodificados a mono PCM16 24 kHz, sin recorte. URLs y hashes originales, procesados y ZIP se conservan en references.json privado. Parámetros iguales a A, semilla 20261103 + número de caso. Los avisos del modelo quedan en Colab; no se interpretan como validación de pronunciación.

Entrega local privada: 20 WAV PCM16 mono 24 kHz recuperados de las salidas del notebook vía Drive y verificados contra sus hashes de Colab; ZIP con copias PCM16, manifiesto, protocolo, entorno y generador. Los originales FLOAT y referencias permanecen en Colab, cuyo disco es temporal; no se afirma que estén en el ZIP local. Audición humana, errores y aceptación siguen en null. Conservar muestras desfavorables; no escalar por el solo éxito técnico.

Código reproducible: scripts/chatterbox-four-voices.py y experiments/chatterbox-four-voices.ipynb. No se publican audios, referencias, exportaciones privadas ni notebook con salidas/metadatos de cuenta. El script usa las URLs de referencia publicadas; una reproducción debe contrastar sus hashes con la evidencia privada porque esas URLs pueden cambiar.

## Licencias y alcance de uso · revisión 03-11-2026

### Referencias alternativas investigadas · 03-11-2026

Selección documental, todavía sin descargar, generar, escuchar ni entrenar. El responsable busca español e inglés, uso comercial y entrenamiento Whisper, sin clonar su voz.

- Dave (es_ES), Joe y Kathleen (en_US): OHF-Voice/voice-datasets publica estas grabaciones expresamente como datasets de síntesis de voz bajo CC0: https://github.com/OHF-Voice/voice-datasets . Son candidatos a referencias directas para el Chatterbox ya disponible, no una aprobación general de todos los checkpoints Piper derivados.
- Aldo (español mexicano): https://huggingface.co/datasets/rmcpantoja/Ald_Mexican_Spanish_speech_dataset . Etiqueta Unlicense y declaración expresa de uso para ajustar modelos Speech To Text y Text To Speech; 535 archivos. Candidato a referencia y a datos ASR directos. No se auditó cada archivo ni se obtuvo documentación individual adicional del hablante.
- Alcance: CC0 permite copia, modificación y explotación comercial sin solicitar permiso de copyright; no elimina derechos de privacidad/personalidad ni permite insinuar respaldo del hablante. https://creativecommons.org/publicdomain/zero/1.0/ . La compatibilidad de generación comercial y entrenamiento se interpreta a partir de la licencia y finalidad publicada; no es una garantía jurídica universal ni una autorización que nombre específicamente Whisper.
- Alternativa sin grabaciones de referencia: Kokoro-82M (Apache-2.0), voces españolas ef_dora, em_alex, em_santa y 28 inglesas. Catálogo: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md . No se encontró una cláusula específica que autorice entrenamiento sobre salidas; no confundir licencia del modelo con auditoría independiente de cada voz.
- Otra alternativa sin referencia: Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign, Apache-2.0, español e inglés, crea voces por descripción. https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign . Capacidad documentada, sin prueba local ni garantía de acento chileno o calidad médica.
- No seleccionar automáticamente Piper davefx/ald por la licencia del dataset: sus fichas indican una cadena de ajuste desde lessac, cuya ficha enlaza una licencia de datos de investigación. Se deja esa cadena pendiente de aclaración; no se concluye que todos los pesos derivados estén prohibidos comercialmente. https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/lessac/medium/MODEL_CARD

Propuesta siguiente, no ejecutada: comparar referencias Dave, Aldo, Joe y Kathleen con guiones sintéticos propios. Definir protocolo y conservar licencia, revisión y hashes antes de generar. Coste de licencia cero según las fuentes; disponibilidad de GPU gratuita no garantizada. No se ha cambiado el estado pendiente de permisos del lote A anterior.

Conclusión: el motor Chatterbox Multilingual V3 puede usarse comercialmente sin pagar licencia MIT. No se encontró una restricción de entrenamiento de otros modelos en MIT ni en la ficha revisada. Esta es una lectura del alcance del motor, no una autorización independiente sobre cada audio de referencia o identidad vocal. El costo de GPU/Colab es independiente; no se garantiza entrenamiento ni cómputo gratuito.

Fuentes primarias consultadas:

- Ficha del modelo general, etiqueta MIT: https://huggingface.co/ResembleAI/chatterbox
- Licencia del código: https://raw.githubusercontent.com/resemble-ai/chatterbox/master/LICENSE — permite uso, modificación, distribución y venta; exige conservar avisos al redistribuir software o partes sustanciales y no ofrece garantía de no infracción.
- Fuente de la referencia A: https://huggingface.co/spaces/ResembleAI/Chatterbox-Multilingual-TTS-es-mx-latam/blob/main/app.py

Separación de lotes:

- Piloto inicial run_20261103T033052Z: voz incorporada, sin referencia personal aportada; 12 WAV. No confundirlo con A ni atribuirle la referencia es-MX. La licencia del motor está confirmada; no se realizó una auditoría independiente de la procedencia de la voz incorporada.
- A/B y lote A run_20261103T040001Z: referencia pública es_mx_f1.wav de la demo oficial. URL: https://storage.googleapis.com/chatterbox-demo-samples/mtl-v3-single-language-prompts/es-latam/es_mx_f1.wav. SHA256: ee61089324b429371ae5562e1070283b34e220e742b60bff2457569f74484be4. No se localizó una licencia específica de esta grabación ni autorización del hablante que confirme generación comercial y entrenamiento de ASR comercial. Que sea pública y oficial no demuestra esos permisos. Estado: pendiente, no prohibición demostrada.

Decisión de trazabilidad: conservar evidencia privada del laboratorio; no marcar el lote A como corpus comercial con derechos verificados. Antes de ese uso, obtener confirmación documentada o regenerar con una fuente cuyos derechos cubran los usos previstos. La conversión PCM16 no cambia el estado de permisos. No se ha entrenado Whisper con este lote. La licencia MIT de Whisper tampoco subsana permisos ausentes de los datos.

Preferencia del responsable: no usar ni clonar su voz personal. Aprobación auditiva cualitativa posterior del lote A comunicada por el usuario: «Esta perfecto ningun cambio». Esto actualiza el estado de escucha pendiente descrito históricamente abajo; puntuaciones y conteos de errores siguen en null. No equivale a validación ASR ni autorización de derechos.

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
