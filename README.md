# Dicta Libre

**Estado al 28 de octubre de 2026:** captura/transporte con pruebas automáticas y lotes del usuario en redes móvil y Wi-Fi; Wi-Fi es la opción principal de demo. Nuevo [laboratorio local](LABORATORY.md) para archivos: Whisper large-v3/OpenVINO ejecutado en GPU Intel Arc y adaptador Muse pendiente de validar con clave real. Whisper conectado a las tomas completas en receptor local; correcciones de IA sin implementar.

Dicta Libre es un proyecto de dictado médico cuya idea y exploración conceptual precedieron al Meta AI Developer Hackathon 2026. La implementación presentada para el concurso comenzó desde cero el 28 de octubre de 2026, dentro del período oficial del evento.

La investigación y las exploraciones técnicas previas informan el problema; no se presentan como contribuciones implementadas durante el concurso. Esta declaración no implica que nunca hayan existido prototipos o experimentos anteriores. La bitácora distingue avances efectivos de propuestas.

## Propósito

Permitir que un profesional sanitario use su celular como micrófono de un computador y revise una transcripción asistida por IA, con especial atención a vocabulario médico y radiológico en español. Es investigación para profesionales, no diagnóstico ni recomendaciones para pacientes. No se afirma novedad absoluta, superioridad ni validación clínica.

## Lo implementado ahora

- Dictado al terminar cada toma: abrir [receptor local con Whisper](http://127.0.0.1:8789/live) en el PC, conectar el S25 Ultra mediante su QR y grabar. Muestra texto por toma y latencia, preserva el audio en el laboratorio. Muse todavía no conectado al flujo en vivo.

- Dos vistas web: emisor móvil y receptor de escritorio.
- S25 Ultra como dispositivo de referencia acordado, con pantalla encendida e interfaz abierta.
- Emparejamiento directo por QR con token temporal de un uso; el código manual conserva la confirmación del número en el PC.
- Controles comparables de mantener pulsado y pulsar para iniciar/parar.
- Micrófono preparado durante la sesión: fuera de cada toma, el audio se descarta sin guardarlo ni transmitirlo.
- Captura AudioWorklet, PCM mono de 16 bits a la frecuencia efectiva del contexto de audio; bloques de aproximadamente 100 ms y vaciado del último bloque.
- Relay Node.js por WebSocket; HTTPS/WSS público temporal mediante Cloudflare Tunnel.
- Recepción, reproducción y descarga voluntaria de WAV en el PC; secuencias, ACK del receptor y SHA-256 de extremo a extremo.
- Tono sintético de diagnóstico sin micrófono. Fallos y tomas incompletas visibles.

El servidor de esta demo se ejecuta en el equipo de desarrollo. Los dos usuarios acceden por navegador, pero ese equipo debe permanecer encendido mientras aloja el relay. No es todavía un servicio permanente en la nube.

## Cómo probar

Ver [RUNNING.md](RUNNING.md) para requisitos e instrucciones completas.

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test
.\scripts\Start-Demo.ps1
```

Abrir la URL HTTPS que imprime el script en el PC, crear sesión y escanear el QR desde el teléfono. Tras confirmar, preparar el micrófono, grabar y escuchar en el PC. Para detener servidor y túnel: `scripts/Stop-Demo.ps1`.

Las tomas duran hasta tres minutos, la sesión hasta treinta. Una pérdida de conexión requiere nuevo emparejamiento; no hay recuperación automática. El audio pasa por el relay/proxy: el cifrado de transporte no equivale a cifrado de extremo a extremo frente a sus operadores. Usar solo material sintético. La demo no persiste audio en el servidor.

## Lo que sigue

El desarrollo se organiza en diez fases, acordando y validando cada una antes de continuar. El alcance detallado de las fases 3–10 sigue en discusión: segmentación, ASR, reconstrucción, transcripción híbrida, terminología, propuestas de IA, editor/inserción y evaluación.

La contribución principal prevista de IA es comparar hipótesis terminológicas con contexto y modelos de Meta, con abstención y revisión humana. No está implementada ni medida. Las elecciones anteriores de ASR y exclusión de streaming no se consideran acuerdos definitivos.

## Verificación realizada y pendiente

- Pruebas automatizadas de captura, protocolo, integridad, roles, códigos y fallos: ejecutadas.
- Prueba sintética a través del enlace público HTTPS/WSS: ejecutada, bytes idénticos.
- Prueba en navegador con tono sintético y ambos controles: ejecutada.
- Lotes reales aportados por el responsable en móvil y Wi-Fi: analizados; aceptación completa de ambos controles/interrupciones aún pendiente.
- Precisión médica, WER, latencia clínica y aporte de Meta: sin evaluar.

Ver [EXPERIMENTS.md](EXPERIMENTS.md) para resultados y límites, y [pruebas en dispositivo](tests/DEVICE_CHECKLIST.md) para aceptación. La identidad de los bytes no demuestra que el micrófono haya capturado toda la voz sin cortes.

## Documentación

[Arquitectura](ARCHITECTURE.md) · [Diez fases](ROADMAP.md) · [Bitácora](HACKATHON_LOG.md) · [Contribuciones](CONTRIBUTIONS.md) · [Experimentos](EXPERIMENTS.md) · [Terceros](THIRD_PARTY.md)

## Consideraciones clínicas

No incorporar información identificable de pacientes. Usar datos sintéticos o expresamente autorizados y sin identificadores; para esta etapa se usan solo sintéticos. Las futuras propuestas deberán identificar incertidumbre y conservar el original. Ningún modelo podrá cambiar silenciosamente negaciones, lateralidad, medidas, hallazgos o términos relevantes.

## Evento y trazabilidad

La [página oficial](https://dev.meta.ai/events/global-hackathon), consultada el 28-10-2026, publica inicio el 26 de octubre y cierre el 4 de noviembre a las 21:00 ET. Objetivo interno: 4 de noviembre a las 18:00, America/Santiago; reconfirmar en el portal antes de enviar.

Las reglas completas siguen pendientes: el [enlace oficial](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver) devolvió una pantalla de carga. Se adoptan las restricciones comunicadas por el responsable —trabajo nuevo durante el evento, repositorio público, atribución, uso significativo de Meta y demo del trabajo concursante— sin afirmar verificación de cada cláusula oficial.

Pendiente: inscripción/elegibilidad, categoría, modelos admitidos, condiciones sobre ideación previa, licencia exigida y formato de entrega. La URL de demo no equivale a un repositorio público: aún no se configuró un remoto. La licencia del código propio está pendiente de elección.
