# dicta — guía de colores y encargo para Stitch

Actualizada el 3 de noviembre de 2026. Puedes pegar este documento completo en Stitch.

## Encargo
Diseña una interfaz para **dicta**, una aplicación de dictado radiológico que usa el teléfono como micrófono y el computador como editor. Conserva la estética minimalista aprobada: hoja centrada, tipografía editorial, controles compactos y superficies de baja luminosidad. Mejora únicamente lo solicitado por el usuario; no inventes funciones, estadísticas ni contenido clínico.

Usa los colores siguientes por función. No sustituyas el tema claro por blanco puro ni el oscuro por una interfaz de neón. Prioriza legibilidad sin grandes superficies brillantes. El confort en salas oscuras es un objetivo de diseño, no una validación médica realizada.

## Paleta vigente del escritorio

Estos valores reflejan las reglas finales del CSS, incluidas las modificaciones de Stitch. No uses la antigua paleta Penumbra que también aparece antes en el archivo.

| Función | Día / hueso | Penumbra / grafito | Ámbar / sepia |
|---|---|---|---|
| Fondo exterior | #E2DED4 | #131416 | #110E0A |
| Hoja del informe | #EBE7DD | #1C1F24 | #18140F |
| Barra superior | #E5E1D7 | #181A1E | #14110D |
| Texto principal | #2B2823 | #EDEDEB | #D8C9B0 |
| Texto secundario | #5B554B | #9AA1AD | #9D8F79 |
| Bordes y separadores | #C9C1B3 | #292D34 | #352E24 |
| Control seleccionado / fondo suave | #DBD5C8 | #25292F | #251F17 |
| Acento de revisión y foco | #7A5217 | #B7C5D7 | #D6A04B |
| Fondo de aviso | #E9DCC5 | #26313B | #2C2215 |
| Grabación / error | #97392A | #E08A7E | #E2846A |
| Estado correcto (token) | #3B6536 | #34D399 | #A8C48A |

### Acción destacada: Revisar con IA

| Elemento | Día | Penumbra | Ámbar |
|---|---|---|---|
| Fondo | #3E6256 | #225C4F | #715125 |
| Texto | #F2F0E9 | #E9F3EF | #F5E9D5 |
| Borde | #537B6D | #4B937F | #A6834D |

- **Revisar con IA:** acción destacada con relleno apagado y destello pequeño; sin animación permanente.
- **Copiar al portapapeles:** fondo transparente, texto principal y borde sutil.
- **Nuevo informe:** fondo suave, borde más visible y nombre completo; no debe confundirse con reiniciar la conexión.
- **Ajustes:** secundario, discreto.
- QR: soporte hueso #F0EDE5, módulos oscuros y margen de seguridad. Mantener contraste y zona libre; no aplicar efectos sobre los módulos.
- Indicador pequeño de conexión actual: espera #D69E40 y conectado #34D399. Estos puntos usan colores específicos, distintos del token general de algunos temas. No extenderlos a grandes superficies.
- Halo temporal del QR: borde del botón de IA del tema, sombra #638F7E22. Se muestra al solicitar conexión; nunca parpadeo permanente.

## Tipografías y proporciones

- Controles y textos de interfaz: **Public Sans**, pesos 400 y 600.
- Informe y título «Escanea para dictar»: **Source Serif 4**; título en cursiva.
- Tamaño, contador y reloj: **Atkinson Hyperlegible Mono**.
- Usar el logo oficial suministrado de dicta; no recrear una marca diferente.
- Encabezado de escritorio: 52 px; ENG/ES en la misma línea que el logo, sin segunda fila.
- Hoja centrada, ancho máximo aproximado 980 px, esquinas exteriores 14 px.
- Barra de edición integrada en el borde superior de la hoja, de unos 44 px de alto.
- Tamaño del informe: valor inicial 19, rango 14–28; control visible sin la unidad «px».
- Deshacer/Rehacer: iconos compactos con nombre accesible y ayuda al pasar el cursor.
- Conservar superficies táctiles adecuadas en móvil y foco visible con teclado; no copiar sin adaptación las dimensiones compactas del escritorio.

## Flujo aprobado que debe conservarse

1. **Inicio vacío:** en el centro solo QR, «Escanea para dictar» y enlace pequeño «Usar teclado». No incluir ejemplos de informes ni plantillas precargadas.
2. **Plantillas:** solo en su botón de la barra superior. No duplicar cápsulas ni explicaciones debajo del QR.
3. **Conectar teléfono:** si el QR está visible, resaltarlo suavemente durante tres segundos sin abrir el menú antiguo ni quitarlo del centro. Desplazar hacia él únicamente si queda fuera de vista. Respetar movimiento reducido.
4. **Usar teclado:** abrir el editor; permitir conectar el teléfono después. Si ya existe texto y se solicita conexión, mostrar el QR encima del editor sin borrar ni sustituir el texto.
5. **Teléfono conectado:** el informe sigue vacío hasta escribir, dictar o insertar explícitamente una plantilla. No comenzar a grabar automáticamente.
6. **Nuevo informe:** conserva conexión; si hay texto, confirma antes de vaciar y permite deshacer.
7. **Revisión con IA:** propone cambios concretos para aceptar o rechazar; nunca aplica correcciones silenciosamente.

Eliminar el rótulo «Informe radiológico · documento en curso»: añade una fila sin ayudar a actuar. Evitar duplicar instrucciones, bloques técnicos del laboratorio y menús extensos de conexión en el flujo inicial.

## Qué entregar

Proponer pantallas coherentes para inicio con QR, edición y sugerencia de IA. Mostrar Día/hueso y Penumbra con la misma geometría; conservar Ámbar como variante opcional. Mantener los mismos nombres y jerarquía. No afirmar que un QR de maqueta conecta realmente. Diferenciar diseño propuesto de funciones implementadas.

## Fuente y verificación

Fuente de implementación: [apps/shared/style.css](https://github.com/pabloagar/dictalibre-meta/blob/codex/capture-transport/apps/shared/style.css). Identidad de archivo Git verificada contra GitHub: `c56b2b316e004e2406152d9df0d4c18a394bd787`.

El CSS contiene reglas históricas y sobrescrituras. Esta guía resume la paleta final del **escritorio**, no afirma que toda la interfaz del teléfono ya use estos mismos valores. El contraste de cada composición nueva debe verificarse; no se heredan automáticamente los cálculos de versiones anteriores.

## Ampliación del 03-11-2026: seis temas
Se añaden Sala, Negatoscopio y Contraste; los anteriores y Penumbra predeterminado se conservan. Fuente exacta: los selectores finales de style.css.

| Tema | Fondo | Hoja | Texto | Texto secundario | CTA IA |
| --- | --- | --- | --- | --- | --- |
| Sala | #18191a | #1f2021 | #b4b5b1 | #8b8d89 | #27463e |
| Negatoscopio | #161718 | #cdc8bc | #1d1b18 | #4a463f | #2a5248 |
| Contraste | #eceef0 | #ffffff | #0a0b0c | #33383d | #0d4f3c |

Negatoscopio mantiene barras oscuras #1d1e20 con texto #bcb9b2 y secundario #8c8981; no usar la tinta oscura de la hoja sobre esas barras. Sala se identifica internamente como sala-neutral para conservar la migración histórica sala→ambar. El blanco de Contraste es una opción explícita, no el tema inicial. Solo se adoptan los colores del archivo de referencia, no sus sugerencias clínicas ni controles esquemáticos.
