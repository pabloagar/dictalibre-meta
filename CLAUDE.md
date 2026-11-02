# CLAUDE.md

Antes de proponer o hacer cambios, leer completo `docs/CONTEXTO_COMPLETO.md` (qué es Dicta Libre, qué está implementado, probado y pendiente) y seguir `AGENTS.md` (criterios de desarrollo, medición y evidencia).

Recordatorios breves:

- Distinguir implementado, probado y pendiente. No presentar propuestas como funciones existentes ni afirmar validación clínica.
- No incorporar audio clínico, texto de pacientes, credenciales ni plantillas con permisos de redistribución pendientes. El repositorio es público.
- No cambiar captura, transporte ni reconocimiento sin pruebas y aprobación del responsable.
- El recorrido acordado termina en copiar y pegar al RIS.
- Textos en español de Chile.
- Regla permanente: los cambios grandes se publican en GitHub y se activan en la web. Ver «Publicar los cambios grandes» en `AGENTS.md`.
- Pruebas: `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `python3 -m unittest discover -s tests -p 'test_*.py'`.
- Revisión técnica vigente: `docs/REVISION_TECNICA.md`. Propuesta de interfaz: `docs/PROPUESTA_UI.md`.
