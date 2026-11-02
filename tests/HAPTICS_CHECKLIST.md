# Vibración opcional · protocolo S25 Ultra

Hipótesis: pulsos solicitados de 12 ms permiten percibir inicio/parada sin añadir ruido audible ni perder palabras. Pendiente de prueba física; no se afirma que 12 ms sea la duración efectiva del motor.

Mantener teléfono, agarre, distancia, navegador, red, motor, glosario y modo de grabación constantes. Usar cinco frases sintéticas de 2–10 s, repetir las mismas con vibración desactivada y activada, alternando el orden entre pares. Mantener el Revisor apagado. Registrar versiones/build disponible, fecha, condiciones y orden; valores desconocidos null. No atribuir automáticamente el servidor activo al último commit.

Escuchar especialmente los primeros/últimos 300 ms de cada audio y las palabras inicial/final completas. Registrar por toma: pulso percibido al inicio/parada (sí/no), ruido audible (sí/no/dudoso), palabra cortada y comodidad. Comparar parada→texto y primer borrador con las métricas existentes, sin concluir rendimiento por cinco pares. Criterio inicial: ningún corte nuevo ni ruido atribuible al pulso; si aparece, desactivar y revisar antes de adoptarlo.

Exportar últimas cinco tomas en el PC por serie; en el teléfono pulsar «Exportar diagnóstico de interrupciones» antes de recargar; conservar JSON del laboratorio para asociar audios/resultados. El diagnóstico móvil registra preferencia por toma, intentos y resultado de API, no prueba vibración física. La ventana guarda últimos 100 eventos.

Comprobar ambos controles (mantener e inicio/parada), recarga sin grabar, apagado de la opción y nueva toma. Desde first-input-v2 la vibración empieza activada si no hay preferencia guardada; una elección explícita de apagarla se conserva. Preferencia por origen/navegador: persiste al reconectar al mismo enlace. La vibración depende del navegador y ajustes del teléfono. No hay pulso de finalización exitosa en abort/interrupción ni en una toma sin muestras. No se retrasa ni silencia el audio para ocultar el pulso inicial.

El inicio ahora se confirma al procesar la primera entrada de audio, incluido silencio; recibir solamente la orden start no confirma captura. Antes de esa respuesta se muestra Iniciando; al ordenar stop, Deteniendo; al confirmar el vaciado, Comprobando entrega. Ningún pulso acredita recepción, transcripción ni exactitud del texto. Prueba inicial en Render: [PHONE_SMOKE_RENDER.md](PHONE_SMOKE_RENDER.md). La percepción con guantes/dedo húmedo permanece pendiente de comprobación humana; no equivale a detectar que un toque falló.
