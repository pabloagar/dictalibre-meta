# Reprueba pública de separación y copia — 2026-11-03

Build comprobado antes: 8757e5f57b257ec3499fa05ae3c99639d0dc9f14. Chrome, Render público. Usuario conectó teléfono y realizó tomas de prueba; se observó texto separado del título RX DE TÓRAX por párrafo. Usuario confirmó «listo se arreglo». No se midió exactitud ASR ni se guardó audio.

Copia por botón: tras Copiar sin revisar la UI anunció Informe copiado. Pegado Ctrl+V en textarea local separado produjo 47 caracteres de una prueba anterior, no el informe actual. Lectura y pegado repetidos después de observar mensaje de finalización mantuvieron esos 47 caracteres. No se acepta el botón como verificado.

Control manual: seleccionar informe y Ctrl+C produjo 426 caracteres; Ctrl+V en el mismo destino pegó 426 caracteres. Coincidencia con texto visible al normalizar espacio terminal. Diferencia de 427 caracteres innerText vs 426 del texto plano: espacio terminal de renderizado. No se atribuye causa a permisos o navegador sin evidencia; comparación indica problema en ruta del botón frente a copia manual en esta sesión. El éxito local anterior con 47 caracteres se conserva, no prueba que copiar un informe distinto en Render funcione.

Sin cambios de código ni reinicio. Informe conservado. Captura privada del pegado manual fuera del repo; sin contenido del informe publicado.
