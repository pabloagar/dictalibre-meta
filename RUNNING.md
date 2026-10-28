# Ejecutar la prueba de las fases 1 y 2

Implementación inicial del 28-10-2026. Solo audio sintético; sin ASR ni corrección. El receptor y el teléfono usan navegador. El servidor de enlace se ejecuta como un proceso aparte: en esta demo se aloja temporalmente en el equipo de desarrollo y se publica por un túnel HTTPS. No es aún un servicio permanente en la nube.

## Requisitos

- Node.js 22 o superior; verificado aquí con 24.19.0.
- pnpm 11.25.0; versiones fijadas en `pnpm-lock.yaml`.
- S25 Ultra con Chrome, pantalla encendida y página visible. La versión exacta de Android/One UI/Chrome y la prueba física están pendientes de registrar.
- Internet en ambos dispositivos para la demo pública; no necesitan estar en la misma red.

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test
```

Si la sesión de Codex dispone de Node pero no de `pnpm` en PATH, puede usar el ejecutable que devuelve su herramienta de dependencias. Para uso fuera de Codex, instalar Node y pnpm normalmente. No se modifica PATH ni la política de ejecución del sistema.

## Prueba por Wi-Fi o 4G/5G

En PowerShell, desde la raíz del proyecto:

```powershell
.\scripts\Start-Demo.ps1
```

El script descarga `cloudflared` oficial 2026.10.5 en `.tools/` si falta, verifica SHA-256 y abre procesos ocultos para el relay y el túnel. No lo instala como servicio. Imprime la URL HTTPS temporal que debes abrir **también en el PC**. Si PowerShell bloquea scripts por una política local, no cambiarla automáticamente: ejecutar desde un entorno autorizado o usar los comandos de despliegue manual siguientes.

1. En el PC, abrir la URL HTTPS, pulsar **Conectar teléfono**.
2. En el S25 Ultra, escanear el QR. Alternativa: abrir la misma URL con `/mobile` e introducir el código de diez caracteres. El código vence a los dos minutos y es de un solo uso.
3. Pulsar **Conectar con el PC**. Comparar el número de cuatro cifras de ambos dispositivos y confirmar en el PC.
4. En el teléfono, pulsar **Preparar micrófono** y aceptar el permiso para ese sitio. Esperar a que indique que está preparado. Para revisar solo transporte, usar **Probar con tono sintético, sin micrófono**.
5. Probar **Mantener pulsado** con una frase; soltar. Luego probar **Inicio / parada**. No cambiar de modo durante una toma.
6. En el PC, esperar **Integridad verificada**, escuchar y, opcionalmente, descargar el WAV. Se conservan las últimas tres tomas en memoria del navegador.
7. Repetir desactivando Wi-Fi en el teléfono y usando 4G/5G. Hacer el cambio entre sesiones: si se cambia de red durante una toma, se espera que se interrumpa y requiera un nuevo emparejamiento.

Una toma se limita a tres minutos; una sesión, a treinta minutos. Al dejar de estar visible la página móvil se interrumpe cualquier toma y se libera el micrófono. Al volver, preparar de nuevo explícitamente. El bloqueo automático se intenta prevenir con Screen Wake Lock cuando está disponible; mantener la pantalla encendida sigue siendo requisito.

Al soltar se detiene la captura nueva, pero se entrega el bloque final ya capturado. El micrófono permanece preparado entre tomas, descartando audio sin almacenarlo ni enviarlo. **Finalizar sesión** lo libera. Las claves/códigos de sesión no se escriben en logs ni en almacenamiento persistente.

```powershell
.\scripts\Stop-Demo.ps1
```

Este comando detiene exclusivamente los procesos registrados de esta demo. La URL deja de funcionar al detener el túnel, apagar/suspender el equipo o perder conexión. La siguiente ejecución puede generar otra URL.

## Ejecución local y alojamiento posterior

```powershell
node backend/server.mjs
```

Abrir `http://127.0.0.1:8787` sirve para probar dos ventanas en el mismo computador. Esa dirección no permite conectar el teléfono. El micrófono móvil requiere HTTPS confiable.

Para alojar el relay en un servidor con proxy HTTPS/WebSocket:

```powershell
$env:PUBLIC_ORIGIN = 'https://dominio-del-relay.example'
$env:HOST = '0.0.0.0'
$env:PORT = '8787'
node backend/server.mjs
```

Usar una única instancia: las sesiones están en memoria y no se comparten entre réplicas. `PUBLIC_ORIGIN` debe ser el origen HTTPS exacto, sin barra final. Sin esta variable se aceptan únicamente WebSockets de origen localhost. El archivo `.env.example` documenta variables; no se carga automáticamente. Hay un `Dockerfile` de preparación para despliegue; **no se ha construido ni validado la imagen Docker**.

## Comprobaciones reproducibles

```powershell
node --test tests/*.test.mjs
node scripts/check.mjs
node scripts/smoke-remote.mjs https://URL-DE-LA-DEMO
```

La última prueba crea dos clientes sintéticos, genera un segundo de tono PCM, lo envía por WSS y verifica identidad de los bytes en el receptor. No valida un teléfono físico, una red 4G/5G ni precisión médica. Ver la [lista de pruebas en dispositivo](tests/DEVICE_CHECKLIST.md).

## Datos y límites

- Sin persistencia de audio en disco del relay. Mantiene temporalmente metadatos y hashes de bloques; reenvía PCM y libera el estado al cerrar.
- Teléfono: PCM temporal durante una toma para verificar su hash; se libera al finalizar o abortar. PC: hasta tres tomas, eliminadas al crear otra sesión o cerrar/recargar la página. Una descarga explícita sí crea un archivo local.
- Cloudflare transporta el audio de la demo. HTTPS/WSS cifran el transporte, pero esto no es cifrado de extremo a extremo frente al operador del relay/proxy. No introducir datos de pacientes.
- Una caída no se disimula: la toma se marca incompleta. No hay recuperación automática del audio perdido ni reconexión silenciosa.
- El indicador en milisegundos mide ida y vuelta de cada navegador al relay; **no** es una medición de latencia de extremo a extremo ni p95.
- Las pruebas de muestras detectan errores del protocolo y archivo. No demuestran por sí solas ausencia de cortes del micrófono o del sistema operativo: se debe escuchar el dictado real de prueba.


## Mediciones y vista compacta
El receptor prioriza el área de transcripción, todavía sin ASR. Audio y diagnóstico son desplegables; la conexión, el estado y tres mediciones principales permanecen visibles. No se solicita marcar una casilla de uso sintético. El alcance de pruebas documentado sigue vigente.

En **Mediciones y diagnóstico**, exportar el JSON de la última toma antes de iniciar otra. Definiciones, precisión y campos futuros: [METRICS.md](METRICS.md). Las mediciones se borran al recargar; no se suben a un servicio de analítica.

## Actualización QR directo
Con el backend actualizado, escanear el QR o abrir el enlace copiado conecta automáticamente, sin comparar números. Para entrada manual abrir /mobile, escribir el código y confirmar el número en el PC. El micrófono sigue requiriendo preparación explícita. Exportación independiente en Mediciones y diagnóstico → Exportar emparejamiento.

Es necesario reiniciar el relay para activar este cambio; mientras se sirve desde el backend anterior, la interfaz conserva el flujo con confirmación y muestra el aviso correspondiente.

## Reinicio desde Símbolo del sistema (CMD)
Usar powershell.exe -NoProfile -File seguido de la ruta absoluta entre comillas a scripts/Restart-Relay.ps1. El prefijo & solo corresponde a PowerShell y no funciona en CMD. Tras el reinicio, recargar ambas vistas y crear una sesión nueva. Activación pública del QR directo verificada mediante smoke-pairing.mjs el 28-10-2026 a las 19:19 UTC.
