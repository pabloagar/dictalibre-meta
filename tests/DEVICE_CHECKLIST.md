# Validación pendiente en S25 Ultra

No marcar filas como aprobadas sin ejecutarlas. Registrar fecha America/Santiago, modelo, Android/One UI, Chrome, PC/navegador y tipo de red; no identificadores personales ni audios clínicos.

| Caso | Procedimiento | Aceptación | Resultado |
| --- | --- | --- | --- |
| Wi-Fi | Emparejar por URL pública; grabar 30 s en ambos modos | Confirmación coincidente y audio reproducible verificado | Pendiente |
| 4G/5G | Apagar Wi-Fi del teléfono antes de crear sesión; PC en otra red | Misma prueba que Wi-Fi | Pendiente |
| Inicio/final | Repetir diez frases sintéticas con palabras claras al inicio y final | No se pierden sílabas al presionar/soltar | Pendiente |
| Fuera de toma | Decir «FUERA» antes y después y «DENTRO» durante | El WAV contiene solo el intervalo activado | Pendiente |
| Pulsación breve | Veinte ciclos, incluidos toques muy breves | Sin bloqueo, duplicados o toma residual | Pendiente |
| Tres minutos | Toma larga con pausas | Parada al límite, última muestra entregada y archivo verificado | Pendiente |
| Cancelación táctil | Deslizar el dedo fuera del botón, soltar y probar gesto interrumpido | Ninguna grabación queda activa accidentalmente | Pendiente |
| Pérdida de visibilidad | Cambiar de app/bloquear durante grabación | Toma incompleta visible y micrófono liberado; no reinicio automático | Pendiente |
| Pérdida de red | Activar modo avión durante una toma | Desconexión detectada, aviso de incompleto y nuevo emparejamiento | Pendiente |
| Permiso denegado | Rechazar permiso de micrófono | Mensaje claro y posibilidad de reintento | Pendiente |
| Ergonomía | Dictar con ambos controles, una mano, frases y pausas reales sintéticas | El responsable elige preferencia y registra molestias/errores | Pendiente |

La fase 1 y la fase 2 quedan implementadas como prototipo, pero su aceptación en dispositivo requiere estas pruebas. No inferir calidad médica del tono sintético.

Al ejecutar cada condición de red, abrir **Mediciones y diagnóstico** y exportar JSON de cada toma. Registrar P50/P95, bloques sin estimación, resolución del reloj, cola máxima y parada → entrega. Probar interrupción: conservar evidencia de toma incompleta. Revisar compactación en el viewport real del S25 Ultra. Estos casos siguen pendientes.
