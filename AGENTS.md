# Dicta Libre: criterios de desarrollo

- Avanzar por fases acordadas; no presentar propuestas como funciones implementadas.
- En cada cambio con un efecto medible, incorporar instrumentación y una prueba reproducible cuando sea viable. Si no se puede medir todavía, registrar el punto de medición, el motivo y la tarea pendiente en METRICS.md o EXPERIMENTS.md.
- Antes de comparar variantes, definir hipótesis, métrica, unidades, inicio/final del intervalo, condiciones y criterio de aceptación. Conservar resultados favorables y desfavorables.
- Registrar versión/commit, configuración, dispositivo, navegador, red, fuente de audio y cantidad de repeticiones. No inventar metadatos ausentes ni atribuir una ejecución a un commit sin evidencia.
- Diferenciar medidas directas, estimaciones e información comunicada por el usuario. Usar null para mediciones ausentes. Documentar precisión y sobrecosto de la instrumentación.
- Conservar evidencia reproducible sin audio clínico, texto de pacientes, secretos ni identificadores personales. No incorporar servicios externos de analítica por defecto.
- Mantener trazabilidad en HACKATHON_LOG.md y metodología en METRICS.md/EXPERIMENTS.md. La funcionalidad y la instrumentación deben revisarse juntas.
