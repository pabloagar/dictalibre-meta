# Propuesta visual de fase 9 · 01-11-2026

Maqueta independiente: design/dictation-workspace.html, servida localmente en 8793 mediante .runtime/design-preview.mjs. No integrada en /live, sin audio, inferencias, biblioteca ni persistencia real. La conexión, toma, temporizador y propuesta son ejemplos explícitos. La simulación escribe una frase predefinida cada 800 ms, no reproduce latencia real de Muse.

Análisis: conexión permanente en columna izquierda, controles sucesivos de motor/glosario y buscador de plantillas desplazan el editor. Tarjetas por toma repiten texto y detalles técnicos compiten con el informe.

Diseño propuesto: informe dominante desde la primera vista; fuente 24 px ajustable 18–32; estado de captura compacto; provisional en su destino con subrayado/tono ámbar, consolidación sin desplazar informe; plantillas/ajustes/datos bajo demanda; revisión lateral opcional. No usar color como única señal. Al integrar, seguir cursor solo durante dictado si el usuario no está revisando otra zona; no forzar scroll ni foco. Copia disponible tras consolidación. Conexión fallida visible con acción de recuperación, QR solo al conectar.

Stitch: primer conector falló conexión; alternativo permitió listar proyectos pero generación/listado de pantallas devolvieron ausencia de vista previa. Nueva consulta no mostró pantalla creada. No se afirma entrega en Stitch ni se cambiaron diseños existentes. Solicitud enviada al proyecto de pruebas 18361479074057273599. Maqueta local creada como alternativa verificable.

Verificación: navegador local mostró simulación pasando Escuchando→Toma finalizada y texto Sin derrame pleural. Controles de copia/deshacer rehabilitados al consolidar. Apertura/cierre de revisión lateral comprobada y capturas guardadas en design/. No se ensayó teléfono ni motor real con esta propuesta.

Antes de comparar UX integrada: hipótesis reducir desplazamientos y tiempo para localizar/revisar dictado sin empeorar inserción. Misma pantalla/navegador/zoom/plantilla/audio, versión cliente explícita, orden alternado, cinco tareas por variante. Medir scrolls y clics hasta editor (conteos), tarea desde indicación hasta selección/copia correctas (ms), preview/final DOM y coste de persistencia por separado. Criterio: cero pérdidas/cambios fuera de selección, cero saltos de foco, editor visible al cargar en 1366x768 y 1920x1080, menor necesidad de scroll; umbral humano de comodidad pendiente. No hay comparación medida aún. Guardar resultados favorables y desfavorables, condiciones desconocidas null.

Implementación de la referencia Hoja clínica: [estado y límites](HOJA_CLINICA.md).

Propuestas posteriores en Stitch, aún no implementadas: [dos direcciones y hueso atenuado](STITCH_DIRECCIONES.md).
