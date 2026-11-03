# Dicta Libre: criterios de desarrollo

## Contexto persistente: voces y licencias (revisado 03-11-2026)

- Chatterbox Multilingual V3: código y ficha del modelo bajo MIT; uso comercial del motor sin regalías de licencia. Esto no garantiza cómputo gratuito ni derechos sobre cualquier voz de referencia.
- No afirmar que todos los WAV del laboratorio están autorizados comercialmente o para entrenar una IA solo por la licencia MIT. El lote A aprobado usa la muestra pública oficial es_mx_f1.wav: permiso específico de esa grabación/voz para esos usos no localizado; estado pendiente, no prohibición demostrada.
- Antes de exportar un corpus comercial o entrenar un modelo destinado a comercialización con esa referencia, resolver su permiso o regenerar con una fuente de derechos documentados. El usuario no quiere clonar su voz. Detalles y fuentes en docs/CHATTERBOX_COLAB_PILOT.md, sección «Licencias y alcance de uso».
- Alternativas investigadas, aún no probadas: Dave, Joe y Kathleen de OHF-Voice/voice-datasets (CC0, destinados a TTS); Aldo mexicano de rmcpantoja (Unlicense, uso STT/TTS declarado). Considerar las grabaciones directamente como referencias, sin asumir la licencia de todos los modelos Piper derivados. Fuentes y límites en el documento del piloto; no presentar selección documental como corpus generado o autorización universal de identidad vocal.

- Avanzar por fases acordadas; no presentar propuestas como funciones implementadas.
- En cada cambio con un efecto medible, incorporar instrumentación y una prueba reproducible cuando sea viable. Si no se puede medir todavía, registrar el punto de medición, el motivo y la tarea pendiente en METRICS.md o EXPERIMENTS.md.
- Antes de comparar variantes, definir hipótesis, métrica, unidades, inicio/final del intervalo, condiciones y criterio de aceptación. Conservar resultados favorables y desfavorables.
- Registrar versión/commit, configuración, dispositivo, navegador, red, fuente de audio y cantidad de repeticiones. No inventar metadatos ausentes ni atribuir una ejecución a un commit sin evidencia.
- Diferenciar medidas directas, estimaciones e información comunicada por el usuario. Usar null para mediciones ausentes. Documentar precisión y sobrecosto de la instrumentación.
- Conservar evidencia reproducible sin audio clínico, texto de pacientes, secretos ni identificadores personales. No incorporar servicios externos de analítica por defecto.
- Mantener trazabilidad en HACKATHON_LOG.md y metodología en METRICS.md/EXPERIMENTS.md. La funcionalidad y la instrumentación deben revisarse juntas.

## Publicar los cambios grandes (regla permanente del responsable, 02-11-2026)

Un cambio grande, como una función, un rediseño o una unión de ramas, no está terminado mientras exista solo en un computador o en un chat. Al terminarlo:

1. **Revisar:** pasan `pnpm check` y `pnpm test`, y el repositorio público no recibe credenciales, audios, plantillas privadas ni exportaciones del laboratorio. Detalle en PUBLICATION.md.
2. **Subir a GitHub:** commit y push a la rama principal `codex/capture-transport`, sin forzar y sin borrar el trabajo de otras sesiones.
3. **Actualizar la web:** GitHub no despliega solo. Traer el cambio a la carpeta del servidor y recargar las páginas; si cambió el backend, reiniciar. No reiniciar durante una sesión de dictado sin coordinarlo.
4. **Comprobar y registrar:** verificar la versión activa y anotarlo en HACKATHON_LOG.md.
5. **Informar:** decir qué quedó en GitHub, qué está activo en la web y qué sigue solo en local.

Una propuesta o maqueta no cuenta como implementada: debe decirlo y enlazarse desde su documento.
