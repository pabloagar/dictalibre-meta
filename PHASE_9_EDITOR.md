# Fase 9 · Editor con plantillas y dictado por selección

Implementación piloto del 29-10-2026. Alcance acordado: trabajar en la página y copiar el informe al RIS; integración directa con RIS diferida.

## Comportamiento
- Elegir informe en blanco o una plantilla. Incluye estructura de prueba sin hallazgos predefinidos; las plantillas clínicas reales las aporta el profesional.
- Guardar nombre/contenido como una plantilla nueva. Crear informe hace una copia editable; no cambia el original.
- Al iniciar una toma se fija la selección del editor, o el último cursor conocido. Si nunca se posicionó, usa final del borrador restaurado.
- Muse-streaming actualiza un fragmento subrayado con fondo suave dentro del informe. Solo ese fragmento cambia. El original seleccionado se conserva hasta finalizar o cancelar. Muse-Normal y Whisper local insertan al terminar.
- Mover el cursor no cambia una toma iniciada. Editar fuera de ella desplaza su posición; editar dentro de una toma pendiente se bloquea. Un destino ocupado por otra toma no se sobrescribe: el resultado queda en su tarjeta para copiar manualmente.
- Final: números/comandos ya procesados sustituyen el borrador una sola vez. Cancelación/error restaura el texto seleccionado. Deshacer revierte el cambio como una acción; no disponible hasta terminar todas las tomas pendientes.
- Meta conserva sus tarjetas de sugerencias bajo el informe. Una propuesta aceptada actualiza el fragmento asociado solo si sigue intacto. Edición manual o deshacer puede invalidar esa asociación: la propuesta queda en su toma, sin sobrescribir el informe.
- Copiar informe entrega texto plano con saltos; botón inhabilitado mientras hay tomas pendientes. No se automatiza pegar ni se comprueba el RIS.

## Persistencia y límites
Plantillas e informe consolidado se guardan en localStorage de este navegador/origen. El borrador provisional nunca se guarda como resultado final; al recargar queda el texto previo a la toma inconclusa. Reiniciar sesión limpia el informe, conserva plantillas y resultados del laboratorio. Historial de deshacer/asociaciones de tomas solo en memoria; no se recupera al recargar. No hay sincronización entre navegadores, respaldo central ni resolución de edición simultánea en varias pestañas.

No hay formato enriquecido, campos/tabulación por voz ni comandos de selección todavía. Copiar no añade marcas de procedencia. El contenido de plantilla se advierte como pendiente de revisión, pero aún no se marca individualmente cada frase heredada. Las propuestas Meta siguen en tarjetas, no en globos dentro del texto. Esto mantiene fase 9 parcial/en validación.

## Arquitectura y pruebas
apps/shared/report-model.js mantiene texto, destinos y deshacer; apps/desktop/report-editor.js maneja selección DOM, plantillas, persistencia y métricas; live.js conecta eventos de captura/ASR y revisión. No cambian motores, segmentación ni reglas de números/comandos.
Pruebas reproducibles: node --test tests/report-model.test.mjs. Casos de selección, cancelación, respuesta tardía, finales fuera de orden, edición antes del destino, bloqueo de solapamiento, revisión desactualizada, Unicode, números y deshacer. Prueba de navegador con controles simulados aislados: selección→borrador→mover cursor→final→deshacer→copiar; plantilla y borrador restaurados tras recarga. Sin nueva grabación física: pendiente S25 y valoración de comodidad.

## Biblioteca importada
Además de plantillas propias, biblioteca local con buscador sin acentos, categorías, favoritas y vista previa/procedencia. Detalles, cantidades y estado de activación en TEMPLATE_LIBRARY.md. La revisión clínica del contenido sigue pendiente.

## 2026-11-02 · Plantilla de un solo uso y revisión local de sexo (F/M)
Aprobado por el responsable.

- **Plantilla de un solo uso:** al pulsar «Crear informe», el panel de plantillas se cierra y su resumen muestra «Plantilla: <nombre> · cambiar». Si el informe tiene contenido propio, aplicar otra plantilla pide un segundo clic («Reemplazar informe actual»); el cambio se puede deshacer.
- **Revisión de sexo:** selector «Sexo: sin dato / F / M», que vuelve a «sin dato» al crear un informe nuevo. Activa una revisión **local**, que no se envía a Meta, con regla exacta: órganos femeninos (útero, ovario, endometrio, miometrio, trompa uterina, cérvix, vagina, histerectomía) en un informe marcado M, o masculinos (próstata, vesículas seminales, testículo, epidídimo, escroto, pene, conducto deferente, prostatectomía, orquiectomía) en uno marcado F.
  - «Mama» queda fuera a propósito.
  - El aviso cita el fragmento («Revisar: «Próstata» en un informe marcado F.»), nunca cambia texto ni bloquea la copia, y se descarta con «Es correcto».
  - Eventos de medición: `sex-marked` y `sex-warning-dismissed`.
- **Pruebas:** `needsReplaceConfirmation` y `sexAnatomyWarnings` en `tests/report-model.test.mjs`, vistas fallar antes de implementar.
- **Verificación:** recorrido en Chromium con el laboratorio real.
- **Límites:** la lista es cerrada y no reconoce sinónimos fuera de ella. No sabe de cirugías de afirmación de género ni de intersexualidad: por eso el aviso es solo para revisar.
