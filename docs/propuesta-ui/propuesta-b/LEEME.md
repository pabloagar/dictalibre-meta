# Dicta Libre · Propuesta B «Hoja clínica»

Propuesta de interfaz, **sin implementar**. Todo el texto de las maquetas es sintético; no hay datos de pacientes.

## Qué trae

| Archivo | Qué es |
| --- | --- |
| `propuesta-b.html` | La propuesta completa: dirección artística, tipografía, paleta, maquetas en vivo (escritorio de día, escritorio «sala», teléfono listo y grabando) y estados del dictado. Se abre con doble clic en el navegador. |
| `tokens-hoja-clinica.css` | Colores y fuentes como variables CSS, con tema día y «sala» (bajo brillo) y el contraste calculado de cada par. Es el punto de partida para implementar. |
| `maquetas/b-hoja-escritorio.html` | Maqueta v1 del escritorio. Para verla en tema sala, agrega `data-tema="sala"` en `<html>`. |
| `maquetas/b-hoja-movil.html` | Maqueta v1 del teléfono: listo, grabando, procesando y error. |
| `capturas/v2-*.png` | Capturas de la versión 2: página completa, en ancho de teléfono y maquetas. |
| `capturas/b-*.png` | Capturas de la versión 1. |

## La idea en una línea

El informe es una hoja en serif, igual al texto que llegará al RIS, y las alertas y el glosario son notas al margen junto al párrafo. El teléfono funciona como un dictáfono: un visor fijo arriba (estado, tiempo, examen, destino) y una tecla grande abajo.

## Fuentes

- **Source Serif 4** (informe) y **Public Sans** (interfaz), ambas con licencia SIL Open Font License.
- Las maquetas las cargan desde Google Fonts solo para poder verlas. En el producto se alojarían en local y se registrarían en `THIRD_PARTY.md`.
- Sin conexión, el navegador usa Georgia y la fuente del sistema.

## Qué es seguro antes del 4-nov

Solo lo que no toca la lógica:
- aviso «solo material sintético» y marca de prototipo;
- contraste del texto gris;
- tema «sala» automático;
- opciones secundarias del teléfono en «Opciones»;
- visor con estado de grabación de pantalla completa.

La hoja centrada y las notas al margen quedan para después del hackathon.

Origen: rama `claude/dazzling-hamilton-k0apsq` del repositorio dictalibre-meta, 2 de noviembre de 2026.
