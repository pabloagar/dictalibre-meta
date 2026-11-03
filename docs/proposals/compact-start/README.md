# Dos propuestas locales: inicio compacto

Estado: maquetas, no implementadas en la aplicación. Render congelado por petición del responsable. Base al comenzar: ab87b2114e2f09117b4efa9d38f47ac638016e04. No se cambia apps/ ni backend/.

- [A: inicio central](a.html): ENG/ES en la misma fila que la marca; QR centrado; conserva la composición actual.
- [B: inicio lateral](b.html): ENG/ES en el extremo derecho; QR junto a instrucciones, permite ahorrar más altura.

Ambas retiran la fila «Informe radiológico · documento en curso» del inicio, conservan hoja, paleta hueso/grafito y jerarquía de acciones. Las maquetas permiten cambiar idioma, tema y vista Inicio/Escritura; los demás controles ilustran su ubicación. El QR contiene únicamente dicta:design-preview-only; no empareja. No se simula dictado ni IA.

## Protocolo previo
Hipótesis: ambas muestran QR, plantillas y pie sin desplazamiento en escritorio de poca altura; B ocupa menos altura que A. Métrica: borde inferior de .paper respecto del viewport en CSS px, desde y=0; overflow horizontal booleano. Condiciones: Chrome, fuentes locales, inicio vacío, hueso, ES/EN, iframes 1280x600 y 1024x600 CSS px, una lectura por combinación. Aceptación: pie <=600 y sin overflow horizontal; no solapamiento visual del encabezado. Precisión práctica: 1 CSS px. Red localhost; audio=null; dispositivo físico=null; sobrecosto de medición=null; tiempo humano de comprensión=null. No extrapolar a escaneo real: QR definitivo es más denso y necesita prueba física.

Prueba reproducible: abrir test.html, esperar fuentes, leer getBoundingClientRect de header y .paper en cada iframe. Cambios visuales independientes de la lógica de aplicación. No se atribuyen mediciones del prototipo al commit base.

## Resultados
Ocho combinaciones medidas, una lectura por combinación. A: borde inferior de hoja 551,55 CSS px. B: 447,40 CSS px. Encabezado 51,99 CSS px en ambas. Diferencia B frente a A: 104,15 CSS px. Pie visible en las ocho; sin overflow horizontal. En A la franja de controles de la maqueta (fuera del producto) provoca scroll vertical del documento de prueba: ancho útil 1261/1005 frente a iframe nominal 1280/1024. No se oculta el pie de la aplicación.

Evidencia cruda: [measurements.json](measurements.json). Imágenes: [A](a-preview.png), [B](b-preview.png). Revisión visual adicional de B en inglés/penumbra. La capacidad de cambiar viewport del navegador no aplicó las dimensiones solicitadas; se descartó esa medición y se usaron iframes con dimensiones explícitas. Escaneo físico, comprensión humana y efecto en la app completa siguen pendientes. No se ejecutó la suite de producto porque no se cambió código de aplicación; las pruebas aquí son de geometría de maquetas.

Recomendación: A para mantener el inicio centrado y minimizar el cambio; B si la prioridad es reservar más altura para el documento. No elegir automáticamente una ni desplegar.

## Simplificación de A
[A1](a1.html): tres cápsulas de contorno. [A2](a2.html): tres enlaces discretos separados por líneas. Solo En blanco, RX de tórax y TC abdomen y pelvis; se elimina el título explicativo y el enlace duplicado de escritura. En blanco abre el editor de muestra. Ambas siguen siendo maquetas locales, sin cambios en Render. Comprobación visual en Chrome; efecto en atención humana no medido.

## A: QR y teclado
[a-qr.html](a-qr.html): QR centrado, título Escanea para dictar y enlace pequeño Usar teclado. Sin accesos rápidos, explicación, código ni cuenta regresiva en el centro de esta maqueta. Plantillas permanece en la barra. El QR es ilustrativo y no conecta. Solo propuesta local, no aplicada a Render.
