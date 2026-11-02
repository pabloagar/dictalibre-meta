# Verificación en navegador del diseño final de /live

Scripts de Playwright usados el 2-nov-2026. Solo usan plantillas **sintéticas** (`plantillas-sinteticas.json`); no hay datos de pacientes ni plantillas reales.

1. Copiar `plantillas-sinteticas.json` a `<WORK_DIR>/no-templates.json` y arrancar el laboratorio con `WORK_DIR=<carpeta>/ node docs/propuesta-ui/actual/scripts/lab-wrapper.mjs` (puerto 8789; no escribe en `data/local`).
2. `node recorrido-1.cjs <carpeta de salida>`: selector sin plantilla, sexo F/M con aviso, Ajustes, tema día, desbordes a 1366, 1440 y 1920 px.
3. `node recorrido-2.cjs <carpeta de salida>`: lista rápida con plantilla, aplicar, resumen, persistencia tras recargar, A1, diagnóstico.
4. `node a1-conectar-conserva-informe.cjs`: una sesión nueva del teléfono no vacía el informe.

Estos recorridos no sustituyen pruebas con el teléfono real ni con las plantillas reales.
