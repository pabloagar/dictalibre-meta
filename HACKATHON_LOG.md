# Bitácora del hackathon

Zona horaria de referencia: America/Santiago. Registrar hechos ejecutados; planes futuros van en `ROADMAP.md`. No reconstruir retrospectivamente avances no verificables.

## 2026-10-28 · Inicio documental

**Inspección realizada:** exclusivamente la carpeta nueva `C:\Users\pablo\OneDrive\Documentos\ChatGPT\DictaLibre Meta IA`.

- El listado inicial mostró únicamente `.git`.
- `git status --short --branch`: `No commits yet on main`.
- `git log -5 --format=fuller`: informó que la rama no tiene commits; es el estado esperado de este repositorio vacío.
- `git remote -v` y `git ls-files`: sin resultados. No existe remoto configurado ni archivos versionados.
- No había instrucciones `AGENTS.md` dentro de la carpeta inspeccionada.

**Trabajo realizado:** definición documental del MVP, módulos y contratos propuestos; fases y criterios de aceptación; metodología de evaluación; registro preliminar de dependencias y riesgos pendientes. Creación de los siete documentos base, `.gitignore`, `.gitattributes` y directorios vacíos reservados mediante `.gitkeep`.

**Verificación externa:** consulta de la página oficial del evento, fichas de Meta/Llama, repositorios de dependencias y documentación de captura web. Las referencias están en `README.md`, `ARCHITECTURE.md` y `THIRD_PARTY.md`. El enlace de condiciones del evento devolvió una pantalla de carga; no se verificó el reglamento completo.

**No realizado:** implementación funcional, instalación de dependencias, descarga/inferencia de modelos, grabación de audio, corpus, pruebas de rendimiento, commits, publicación pública o envío al concurso. No hay evidencia de mejora clínica o de reconocimiento.

**Siguiente paso previsto:** F1, verificar entorno y acceso con pruebas mínimas antes de construir módulos.

**Comprobación documental:** se verificó la existencia de los siete archivos requeridos y la resolución de sus enlaces Markdown locales. El inventario final contiene esos documentos, dos archivos de configuración de Git y seis `.gitkeep`. `git status --short` muestra los archivos nuevos sin versionar. No se ejecutaron pruebas de aplicación, ya que no existe código funcional.

## 2026-10-28 · Implementación inicial de fases 1 y 2

Tras discusión, el responsable fijó el S25 Ultra, pantalla encendida, interfaz abierta, micrófono preparado sin guardar/enviar fuera de toma, comparación de dos controles táctiles y transporte por Wi-Fi y 4G/5G desde el primer prototipo. Se adoptó navegador en ambos extremos y servidor de enlace WebSocket. Se reemplazó el roadmap inicial por diez fases; no se asumió aprobación de las decisiones de ASR posteriores.

Trabajo realizado: interfaces, AudioWorklet, PCM/WAV, emparejamiento temporal con confirmación, relay Node, validaciones de secuencia y hash, abortos visibles, señal sintética y scripts de demo. Dependencias fijadas e instaladas: ws 8.22.0 y qrcode-generator 2.0.4. cloudflared 2026.10.5 descargado de fuente oficial y verificado mediante SHA-256. Se inició un relay local oculto y un túnel HTTPS temporal, sin instalar servicio ni cambiar reglas del firewall.

Verificación: 17 pruebas automatizadas aprobadas; sintaxis aprobada; smoke test sintético público aprobado; emparejamiento y ambos controles de grabación probados en navegador con tono sintético. Resultados concretos en `EXPERIMENTS.md`.

Limitaciones: no se usó el micrófono del S25 Ultra ni se probó una red 4G/5G física; no se ejecutó ASR/Meta ni evaluación clínica; alojamiento permanente y repositorio público pendientes. La demo depende de que el equipo de desarrollo y el túnel sigan funcionando. No se declara terminada la aceptación en dispositivo.

Trazabilidad: primer commit local `e19577ff75718129b753974c925f33d86c01d9a8`, rama `codex/capture-transport`, creado efectivamente el 28-10-2026. Incluye código, pruebas, lockfile y documentación. `pnpm audit --prod --json` informó cero vulnerabilidades conocidas en las dos dependencias a la fecha de consulta; esto no equivale a una auditoría de seguridad del producto. La carpeta de trabajo quedó limpia tras ese commit; este registro y el resumen experimental se agregan en un commit documental posterior.

## Formato para próximas entradas

Fecha y zona; objetivo; archivos y commit real; pruebas ejecutadas y resultados; contribución nueva; dependencias usadas; fallos y limitaciones; siguiente tarea. Anexar enlaces a ejecuciones o artefactos cuando existan. Distinguir métricas de desarrollo y de prueba final. No registrar una tarea como terminada por haberla descrito.
