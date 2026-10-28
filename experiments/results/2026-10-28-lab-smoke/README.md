# Prueba de integración local, no benchmark clínico

Fecha: 28-10-2026. Corpus de control generado por `scripts/New-Lab-Fixtures.ps1`: frase de Microsoft Helena Desktop (5,5425 s, PCM16 mono 22050 Hz) y silencio digital (2 s, PCM16 mono 16 kHz). No se incluyen WAV ni voz de pacientes. Texto de referencia de la frase: «No se observa derrame pleural. Nódulo de tres milímetros en el pulmón derecho.»

Hardware observado: Intel Arc integrada, Core Ultra 7 155H. OpenVINO 2026.4.1, GenAI 2026.4.1.0, modelo y revisión fijados en cada ejecución. API real Muse no invocada. Red celular/Wi-Fi no forma parte de este experimento de archivo local. Las primeras dos ejecuciones preceden la incorporación de metadatos de entorno/RTF; no se rellenaron retroactivamente.

`runs.json` conserva las ejecuciones completas con hashes, configuración, referencias y hash de fuentes. `build` es el commit base anterior a los cambios; NO se atribuye el código nuevo a ese commit. La revisión efectiva queda identificada por `sourceHash`.

| Caso | Carga local | Generación | Total sin cola | Resultado |
| --- | ---: | ---: | ---: | --- |
| Frase, primera ejecución UI | 10,785 s | 2,541 s | 14,566 s | Original correcto salvo formato tres→3, WER literal 1/13 |
| Silencio, pipeline ya cargado | 0 s | 1,126 s | 1,140 s | «Gracias.», inserción sin voz |
| Frase, después de reinicio | 12,803 s | 2,568 s | 16,690 s | Igual texto |
| Frase repetida, pipeline cargado | 0 s | 2,220 s | 2,250 s | Igual texto; request RTF ~0,402 |

Un control directo anterior a la UI cargó el modelo en 24,060 s y generó «Gracias.» sobre silencio en 1,649 s. Diferencias de caché/condiciones no controladas: no usar estos tiempos como un benchmark de arranque.

Se verificó por interfaz la carga de ambos archivos, referencia versionada, ejecución real, resultados, persistencia tras reinicio, repetición y creación de variante. WER literal detecta tres/3 aunque la cantidad sea equivalente; el usuario deberá revisar medidas, negación y lateralidad independientemente del score. El resultado sobre silencio obliga a estudiar detección de voz o abstención antes de integración clínica. No se silenció ni corrigió automáticamente.

La variante num_beams=3 falló en GPU con `remote_tensor / Not Implemented`; se conserva como ejecución fallida. Es compatible con el problema descrito en [OpenVINO GenAI #2746](https://github.com/openvinotoolkit/openvino.genai/issues/2746). Un fallo no se excluye del denominador de ejecuciones; no demuestra menor precisión del modelo.

Se comprobó adicionalmente `GPU_ENABLE_SDPA_OPTIMIZATION=False` con la frase sintética: persistió `remote_tensor / Not Implemented`. No se adoptó ese cambio. La entrega bloquea nuevas ejecuciones con beams > 1 y conserva el resultado adverso anterior; no modifica el dispositivo ni cae silenciosamente a CPU. Pruebas automatizadas finales: 31 aprobadas, incluidas validación de esta restricción y contrato multipart de Muse con transporte simulado.

Pendiente: contraste real Muse, corpus de dictados de 2–10 s del S25 Ultra, repetición suficiente y separación desarrollo/reserva. Ninguna cifra aquí mide sensibilidad clínica, precisión de vocabulario médico ni superioridad de un motor.
