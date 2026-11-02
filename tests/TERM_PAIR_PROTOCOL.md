# Neumotórax / hemotórax · piloto de reconocimiento

02-11-2026. Hipótesis: un glosario equilibrado con neumotórax, hemotórax y hemitórax mejora reconocimiento sin introducir términos ausentes. Muse ya recibe languageBias Spanish y admite keywords; no se cambia modelo ni se usa Spark para corregir la transcripción. Documentación oficial: https://dev.meta.ai/docs/speech-to-text y https://dev.meta.ai/resources/blog/meet-muse-voice-transcribe-streaming-speech-to-text.

Comparación previa a decidir: siete audios de una voz sintética (Laura) y cinco segundos de silencio digital; dos variantes, dos repeticiones, 32 solicitudes. Dos audios exactos reutilizan la línea base; los otros son controles nuevos. Orden alternado, mismo PCM en cada par. Referencias TTS aún no escuchadas por una persona; no representan la voz de Pablo. Una toma contiene hemotórax y hemitórax juntos para evitar evaluar solo palabras aisladas.

Medidas: secuencia exacta de los tres términos sin diferencias de tilde, omisiones/inserciones, secuencia de negación/lateralidad, texto original y WER descriptivo. Registrar errores, timeouts y latencias, no descartar fallos. Aceptación exploratoria: menos errores de términos, sin degradar pares correctos ni negación/lateralidad, sin palabras en silencio ni términos nuevos en control neutro. La muestra es pequeña; cero fallos no demuestra ausencia general de invenciones.

Si pasa, siguiente fase: escuchar referencias, grabar ambos términos con voz humana en frases nuevas y repetir comparación congelada. No activar glosario por resultado sintético favorable. No corregir hemotórax automáticamente por neumotórax; una palabra plausible equivocada puede no ser detectable por Spark sin audio. Las advertencias por desacuerdo, si se implementan después, requerirán validación y nunca sustitución automática.

Artefactos: scripts/build-term-pair-corpus.ps1 y scripts/evaluate-term-pair.mjs. Audio, protocolo con hashes y resultados completos quedan en data/local; no se suben plantillas ni claves. El experimento usa servidor aislado y no reinicia ni modifica la demo. Precisión/sobrecosto del reloj, red y dispositivo ausentes se registran null.

## Siguiente control con voz humana, fijado antes de recibir grabaciones

Puede grabarse en PC o Samsung; no depende de iPhone. Dos tomas de cada frase, a ritmo habitual, guardando el audio sintético de contenido y la referencia realmente pronunciada. No usar informes de pacientes. Confirmar por escucha antes de puntuar. No cambiar el glosario entre tomas según el resultado esperado.

1. «Pequeño neumotórax apical derecho.»
2. «Sin signos de neumotórax en el estudio actual.»
3. «Persiste hemotórax izquierdo de escasa cuantía.»
4. «No se identifica hemotórax.»
5. «En el hemitórax derecho no se observan alteraciones.»
6. «Neumotórax derecho y hemotórax izquierdo.»
7. «Sin derrame pleural. Tráquea centrada.»
8. «Lesión de dos coma cinco centímetros en el pulmón izquierdo.»

Son frases reservadas respecto al piloto sintético actual; no son un conjunto independiente si después se ajusta el glosario usando sus errores. En ese caso fijar otro conjunto antes de la comprobación final. Reutilizar cada mismo audio en ambas variantes, conservar ambos resultados y exigir mejora sin nuevas sustituciones/inserciones, cambios de lado/negación/medida. Registrar dispositivo, navegador, red, versión, audio hash y repeticiones; no sustituirlos por valores supuestos.

## Resultado exploratorio

32/32 solicitudes completadas, sobre siete WAV y un silencio digital, con dos repeticiones por variante. Código del adaptador comprobado contra bfa21f4a2cbf8d392af1e76012e0621be364ab09; scripts experimentales identificados por hash separado. Evidencia completa local: data/local/lab/reports/term-pair-1793646614453. Resumen público: experiments/results/2026-11-02-term-pair/summary.json.

Secuencia correcta de términos en los casos que los contienen: sin glosario 8/12; lista equilibrada 12/12. Cuatro pares mejoraron y ninguno empeoró en los ejes medidos. Se conservaron marcadores de negación/lateralidad en ambas variantes; cero términos objetivo añadidos al control neutro y silencio vacío en ambas repeticiones/variantes. Las tildes no cuentan como cambio de término. Persisten diferencias de puntuación/comandos en ASR crudo: no confundir 12/12 términos con 12 transcripciones literalmente idénticas.

Pasa el criterio exploratorio, NO el de adopción. La muestra usa una sola voz sintética y referencias todavía no escuchadas; no garantiza cero invenciones ni representa voz humana. Glosario no activado en producción, no se modificó postprocesamiento ni Spark. Probar los controles humanos anteriores antes de decidir. Meta no entrega puntuaciones de confianza por palabra en esta API; no se inventará una para ocultar esta incertidumbre.

Generación reproducible en PowerShell 7 con voz Laura instalada. Primer intento con Windows PowerShell 5 no encontró esa voz y falló antes de generar/inferir; se conservó su directorio vacío y se usó otro destino (term-pair-v1-pwsh). Las pruebas automatizadas locales corrieron durante parte de la reproducción; no se infiere mejora de latencia.
