# Evaluación ampliada del laboratorio

Implementada el 2 de noviembre de 2026. El panel **04 · Evaluación y comparación** añade estudios locales sin cambiar motores, prompts ni reglas clínicas. Los resultados se actualizan mediante **Actualizar ejecuciones y registros** para evitar que un sondeo destruya una anotación en curso.

## Recorridos

1. **Comparar ejecuciones:** filtrar audio, modo y carga; consultar todas las repeticiones/fallos, errores y tiempos. Exportar las filas seleccionadas como JSON. Para un par explícito elegir A y B; la diferencia es B menos A. Se rechazan audio, modo o referencia distintos y cargas frías/calientes conocidas distintas. Una carga no observable permite comparación exploratoria, sin afirmar igualdad de condiciones. No empareja automáticamente repeticiones ni declara ganador.
2. **Fidelidad clínica:** indicar código de evaluador, confirmar material sintético, cargar ejecución y etapa. Añadir oportunidades con ID estable y categoría negación/lateralidad/medida; registrar esperado, observado y juicio. Guardar añade un snapshot. Repetir con otro evaluador y guardar adjudicación separada. La ausencia de filas de una categoría no significa cero errores: exactitud null.
3. **Edición humana:** cargar etapa, comenzar, editar y aprobar o abandonar. El original permanece intacto. Se mide tiempo de pared monotónico, eventos input y ocultaciones de pestaña. El motor queda oculto durante la tarea, pero pudo verse antes: cegamiento parcial. Descargar edición en curso permite conservar un borrador si falla el guardado. La recarga advierte sobre una tarea activa; no hay recuperación automática tras cierre forzoso.
4. **Errores residuales:** elegir etapa Edición humana aprobada y su ID; anotarla con el mismo esquema clínico, idealmente por evaluador independiente. WER/CER del texto editado contra referencia oral son métricas léxicas; los comandos y números formateados pueden contar distinto.
5. **Calidad del revisor:** cargar etapa Revisado, elegir revisión y juzgar cada propuesta. Registrar errores previos, detectados, corregidos, introducidos y residuales. Los campos comienzan vacíos, no en cero. El snapshot conserva propuestas, decisiones e historial del documento. Un documento revisado puede incluir edición manual: atribuir causalidad requiere inspección humana del historial.
6. **Usabilidad:** tareas A–H, variante, inicio y final explícitos, resultado y errores observados. Cuenta clics desde después de iniciar hasta el clic de finalizar, incluido este. Permite usar el resto de la interfaz; no ejecutar ASR durante la tarea. Tiempo incluye pausas y cambio de panel; ocultaciones se cuentan. No representa rendimiento de motores.
7. **Registros:** historial local y exportación JSON completa/CSV resumen. Cada guardado añade una evaluación; no sobrescribe juicios previos. JSON general del laboratorio también incluye studyRecords. Los registros contienen texto sintético: no utilizar pacientes ni identificadores personales.

## Contratos y trazabilidad

Rutas nuevas, sin retirar contratos existentes: GET /api/study, POST /api/study/snapshot, POST /api/study, POST /api/study/compare, GET /api/study/export[?format=csv]. Se mantienen las guardas Host/Origin del servidor loopback. La colección studyRecords se añade al catálogo; catálogos antiguos funcionan sin migración destructiva. Original ASR, formato, revisión y edición son campos/snapshots diferentes.

Cada snapshot registra runId, etapa, hash, referencia/version, configuración y procedencia del run, versión de estudio, build/hash del servidor que lo guarda, fecha, evaluador y entorno declarado. Los datos desconocidos son null. Dispositivo/red declarados no son detección instrumental. El hash se verifica al guardar; si cambió el objetivo/referencia debe cargarse nuevamente. Reintentos de edición/UX reutilizan clientId y el intervalo final ya congelado; no duplican el registro.

La selección pareada exporta ambos resultados completos y deltas; el CSV general conserva columnas anteriores y añade precisión y tiempos. JSON mantiene null; CSV representa ausencia con celda vacía. No sumar peticiones, carga, generación y total: pueden contenerse entre sí.

## Corpus y reproducción sin proveedor

En Windows con una voz española de System.Speech:

```powershell
powershell.exe -NoProfile -File scripts/build-study-corpus.ps1 -OutputDirectory data/local/corpus-nuevo
node scripts/study-noise.mjs data/local/corpus-nuevo data/local/ruido-nuevo
node scripts/verify-study-corpus.mjs data/local/corpus-nuevo data/local/ruido-nuevo
node scripts/import-study-corpus.mjs data/local/corpus-nuevo http://127.0.0.1:8789
```

Cada destino debe ser nuevo. El importador sube WAV y guarda el mapeo caseId/audioId/hash; no ejecuta motores ni convierte automáticamente el guion TTS en referencia validada. Conservar manifiestos/mapeos junto al JSON de resultados. Escuchar y validar referencias antes de evaluar. Los scripts de corpus no envían datos a Meta.

Hay seis frases base y cinco variantes por frase: limpia, muletilla, pausa solicitada 500/2000 ms, voz lenta. Añade ruido uniforme determinista a 20/10 dB SNR digital sobre las seis limpias. El RMS incluye silencios; no es SNR acústica ni ruido hospitalario representativo. La ganancia común evita saturación, se registra y conserva la relación señal/ruido. Las pausas solicitadas al TTS no equivalen a pausas acústicas medidas. No contabilizar 42 variantes como 42 muestras independientes.

## Verificación y límites

Pruebas: node --test tests/*.test.mjs; node scripts/check.mjs; python -m unittest discover -s tests -p 'test_*.py'. Fixture visual aislada: node scripts/preview-lab-study.mjs (8794, directorio nuevo), sin credenciales, inferencias ni catálogo de trabajo.

Las pruebas técnicas no sustituyen ensayos humanos. Pendientes de ejecución: anotación por profesionales, adjudicación, tiempos humanos con orden contrabalanceado, escucha de referencias, corpus independiente más amplio, inferencia pareada de variantes acústicas y prueba física de los nuevos intervalos en celular. Resolución efectiva y sobrecosto completo de instrumentación permanecen null. No hay nueva afirmación de superioridad, seguridad clínica ni reducción de tiempo.


## Cierre técnico
Aceptación real completada el 02-11-2026; informe en experiments/results/2026-11-02-lab-acceptance/README.md. El laboratorio está listo para estudios exploratorios. Las anotaciones clínicas y productividad humana siguen pendientes de participantes; no se han sustituido por evaluación del agente.
