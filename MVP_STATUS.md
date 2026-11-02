# MVP · corte del 02-11-2026

Aplicación activa en Render y laboratorio: `16b62ff`; código evaluado `72f25f0`, sin cambios posteriores de backend/frontend. 161/161 pruebas y sintaxis aprobadas. Evidencia: HACKATHON_LOG.md, tests/MVP_CORRECTIONS_PROTOCOL.md. Este corte sustituye estados anteriores del MVP; no declara validación clínica.

## Diseño 1 · recorrido del usuario

```text
✅ Entrar a dicta y conectar Samsung [prueba comunicada]
  ↓
✅ Dictar, editar, copiar y nuevo informe [Samsung comunicado + pruebas técnicas]
  ↓
✅ Dos puntos y avisos Spark corregidos [evaluación + despliegue verificado]
  ↓
🟨 Volver de WhatsApp sin código [implementado; falta aceptación física final]
  ↓
🟨 Plantilla → dictado → revisión → copia [285 pruebas de modelo; falta recorrido físico completo]
  ↓
⬜ iPhone [Pablo, 03-11-2026]
  ↓
🟨 Calidad de voz humana y errores sensibles [15 audios repetidos; queda sustitución de término]
  ↓
⬜ Congelar versión → ensayo completo → video de respaldo → demo
```

## Diseño 2 · diez etapas originales

| Etapa | Avance orientativo | Para cerrar el alcance MVP |
|---|---|---|
| 1. Captura | 🟩🟩🟨 | iPhone: inicio/final, permisos, interrupciones |
| 2. Conexión | 🟩🟩🟨 | Aceptación física WhatsApp/bloqueo y recuperación sin grabar sola |
| 3. Segmentación | 🟩🟩🟩 | Manual fijada para demo; automática fuera del cierre |
| 4. Reconocimiento | 🟩🟩🟨 | Referencias humanas y sustitución neumotórax→hemotórax |
| 5. Comandos y formato | 🟩🟩🟨 | Corrección probada; repetir medidas/negaciones/comandos con voz física |
| 6. Fusión de motores | ➖ | Diferida; no bloquea MVP |
| 7. Terminología | 🟩🟨⬜ | Medir error con referencia escuchada; comparar glosario solo si procede |
| 8. Revisión con IA | 🟩🟩🟨 | Spark público verificado; aceptación humana y límites de falsos negativos |
| 9. Editor y plantillas | 🟩🟩🟨 | 285 pruebas de modelo + una plantilla en navegador; recorrido físico completo |
| 10. Evaluación y entrega | 🟩🟩🟨 | Prueba física, decisión de calidad, congelación y grabación |

🟩 realizado dentro del alcance · 🟨 validación parcial/pendiente · ⬜ tarea pendiente · ➖ diferido. No son porcentajes ni medidas de precisión. Samsung deriva en parte de resultados comunicados por Pablo, no de una repetición actual del agente. Los 285 casos no son 285 validaciones clínicas.

## Prioridades

1. Completar recorrido físico iPhone y reconexión; repetir en Samsung si reaparece un fallo.
2. Validar por escucha referencias y términos sensibles. La segunda serie dio 13/15 coincidencias contra guiones provisionales: una tilde ausente y hemotórax por neumotórax, sin aviso de Spark. En ASR congelado solo la mejora 11→12/15 es atribuible al formateador.
3. Probar dictado dentro de plantilla y origen del texto: diferenciar normalidad heredada de contenido añadido por reconocimiento. Reemplazo, deshacer, copia y nuevo informe no deben perder texto.
4. Corregir bloqueantes, repetir casos fallidos y recorrido completo, congelar commit/configuración y grabar demo más video de respaldo. Conservar todos los resultados, no seleccionar solo los favorables.

Plan de mañana y tabla de registro: [tests/IPHONE_MVP.md](tests/IPHONE_MVP.md). No se necesita añadir otro motor, fusión, Tonos, plantillas por voz ni más rediseños para cerrar este alcance. Ningún resultado anterior garantiza ausencia general de invenciones.

Actualización de terminología: piloto equilibrado con neumotórax/hemotórax/hemitórax mejora coincidencias de términos de 8/12 a 12/12 en una voz sintética, dos repeticiones, sin regresiones observadas en controles. Sigue pendiente la prueba humana; no cambia el estado de cierre ni se activa el glosario en producción. Detalles y ocho frases reservadas en [tests/TERM_PAIR_PROTOCOL.md](tests/TERM_PAIR_PROTOCOL.md).
