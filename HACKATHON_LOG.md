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

## 2026-10-28 · Interfaz compacta e instrumentación
Por solicitud del responsable se retiró la casilla de uso sintético de ambas vistas, se redujo el espacio de cabecera y controles, y se dio prioridad visual al área de transcripción. Es una revisión provisional; no se registra aprobación del diseño final. El área de texto informa que ASR aún no está integrado.

Se implementaron calibración temporal celular/PC contra relay, telemetría por bloque, resúmenes P50/P95, tiempos de preparación/inicio/parada/hash/entrega y exportación JSON. Campos futuros ASR/Meta reservados como null. Ver METRICS.md para límites de precisión.

Verificación realizada: 22 pruebas automatizadas aprobadas; sintaxis aprobada; smoke público sintético aprobado el 28-10-2026 a las 18:57:38 UTC; prueba de navegador con tono 440 Hz, modos mantener (19 bloques) e inicio/parada (30 bloques), ambas con integridad verificada y métricas visibles. No se usó teléfono físico, micrófono real ni red celular. Se reinició únicamente el relay de la demo, conservando el túnel y su URL.

## 2026-10-28 · Criterio transversal de medición y primera evidencia del usuario
Se añadió AGENTS.md para mantener el requisito de instrumentación/comparación en cambios futuros y se amplió METRICS.md con metodología y metadatos pendientes. Se revisó y conservó dicta-metricas-4.json, con ficha de resultados y límites en experiments/results/2026-10-28-user-take-4. La audición satisfactoria y facilidad de conexión/QR son observaciones del usuario, no pruebas auditivas del agente. Se revisó el emparejamiento en backend/server.mjs para explicar la confirmación adicional; no se modificó ese flujo. Solo documentación y evidencia: no se ejecutaron nuevas pruebas de aplicación.

## 2026-10-28 · QR directo y tiempos de emparejamiento
Implementados token QR de 256 bits, caducidad/consumo conjunto con código manual, conexión automática al abrir enlace, confirmación exclusiva para código manual y exportación de tiempos de emparejamiento. 25 pruebas automatizadas aprobadas. Sin validación física de QR/S25 Ultra en esta revisión.
La revisión automática de permisos rechazó detener/reiniciar el relay de la demo, sin motivo específico adicional. No se reintentó la acción bloqueada. Activación del nuevo backend pendiente; interfaz compatible con backend previo para mantener el flujo manual existente.

## 2026-10-28 · Reinicio autorizado, nuevamente bloqueado
El usuario autorizó expresamente el reinicio. La revisión automática volvió a rechazar la acción antes de ejecutarla, sin motivo específico. El backend nuevo no quedó activado. Se creó scripts/Restart-Relay.ps1 para ejecución manual, con validación del proceso y carpeta, conservación del túnel y comprobación de salud; sintaxis PowerShell validada, ejecución pendiente. Las 25 pruebas locales pasan. La demo existente pasó la prueba pública de audio sintético a las 19:12:49 UTC; esto no valida QR directo en el backend público anterior.

## 2026-10-28 · Comprobación pública tras aviso de reinicio
Se añadió scripts/smoke-pairing.mjs para comprobar ambos accesos, bloqueo de audio previo a aprobación manual, consumo del token y envío de métricas. La ejecución contra la URL pública falló porque created no contiene token: sigue respondiendo el backend anterior. Inspección de solo lectura: PID 46512, iniciado 15:57:10 America/Santiago; backend/server.mjs modificado 16:10:01. No se afirmó activación ni validación del QR directo público.
La prueba pública manual con confirmación y audio sintético sí pasó (19:17:36 UTC, 10 bloques, 16000 muestras, hash coincidente). Las 25 pruebas locales pasan. Pendiente ejecutar correctamente el reinicio y repetir prueba pública de emparejamiento; no se reintentó detener el proceso tras los bloqueos anteriores.

## 2026-10-28 · Activación pública verificada tras reinicio manual
El usuario ejecutó correctamente Restart-Relay.ps1 desde CMD mediante powershell.exe -NoProfile -File. Se repitió smoke-pairing.mjs contra la URL pública: PASS QR y manual a las 19:19:12 UTC. QR autorizado sin approve; manual recibió pending, bloqueó inicio de audio antes de autorización y conectó después de approve. El token consumido fue rechazado y las métricas llegaron al receptor sin incluir el secreto.
Mediciones de clientes sintéticos: creación → autorización QR 292,6 ms, manual 447,5 ms; solicitud → autorización QR 0,162 ms, manual 160,785 ms. Son pruebas de protocolo con confirmación automatizada, no tiempos humanos ni de escaneo; el intervalo cliente de esta prueba comienza antes de enviar join y no antes de abrir WebSocket. No comparar directamente con métricas de la interfaz.
Prueba pública de transporte PASS a las 19:19:18 UTC: 10 bloques, 16000 muestras, hash coincidente. Pendiente comprobar escaneo físico y ergonomía en S25 Ultra. Se conserva el enlace de la demo.
