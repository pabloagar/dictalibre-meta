# Bilateral · generador de seis sonidos

Módulo independiente para generar pulsos estéreo alternos en el navegador y
exportar WAV PCM16 estéreo a 44.100 Hz. Sin GPU, modelos, muestras, fuentes web,
servicios de audio ni dependencias de ejecución. No solicita micrófono.

## Uso comercial

Esta carpeta conserva su licencia independiente de la licencia Apache 2.0
del resto de Dicta Libre: su código y documentación se publican bajo
[MIT](LICENSE), por solicitud del responsable. Puedes copiar la carpeta completa
a tu app comercial; conserva el aviso MIT al distribuir código o porciones
sustanciales. No tienes que publicar el código de tu app.

Los audios tienen un [permiso separado](OUTPUT-LICENSE.txt) para uso, modificación,
publicación y redistribución comercial sin regalías ni atribución obligatoria
del audio. No se incorporan SLR71, Qwen, Chatterbox ni identidades vocales.
No se garantiza exclusividad ni protección autoral de tonos o ruido sintéticos.
Agregar música o grabaciones externas requiere revisar sus permisos aparte.

La licencia MIT estándar permite uso y venta del software sujeto a conservar
sus avisos: https://opensource.org/license/mit . No cambia la licencia del resto
del repositorio ni resuelve los permisos del laboratorio de voces.

## Abrir o integrar

Sirve esta carpeta por HTTP(S), no mediante file://. Por ejemplo, desde ella:
`python -m http.server 8810 --bind 127.0.0.1`. Abre http://127.0.0.1:8810/.
La app necesita módulos JavaScript, Workers y Web Audio. En tu app, copia todos
los archivos de la carpeta conservando sus rutas; no necesita backend propio.
Una CSP del sitio anfitrión debe permitir módulos/worker/conexiones del mismo
origen. No cambiar políticas de seguridad globales para integrarlo.

API de síntesis, utilizable también desde Node sin dependencias:

```js
import {renderStereo, encodeWav, analyze} from './synth.js';
const audio = renderStereo({sound:'tone', intervalSec:0.65, durationSec:30,
  volume:0.12, separation:1, frequencyHz:440, seed:20261104, firstSide:'left'});
const wav = encodeWav(audio); // ArrayBuffer; no escribe archivos por sí solo.
console.log(analyze(audio));
```

## Sonidos y controles

Tono suave (seno con armónico), campana (parciales con caída), madera (parciales
amortiguados), clic suave (ruido filtrado corto), rosa (aproximación por filtros
espaciados logarítmicamente), marrón (integración con fuga). Son texturas
procedurales, no grabaciones de instrumentos ni espectros certificados.
Todos son pulsos con ataque/salida suavizados y un espacio entre eventos.

Cambio de lado: 0,2–2 s ENTRE EVENTOS, no duración de un ciclo completo I+D.
Separación 100 %: un solo canal por evento; 0 %: mismo pulso en ambos canales,
sin alternancia lateral. La prueba I/D emite dos pulsos aislados, primero a la
izquierda y luego a la derecha. Requiere auriculares estéreo y que el sistema
no mezcle a mono; esto último no puede verificarse desde JavaScript.

Duración 5–120 s. Semilla uint32 reproducible para ruido. Altura 120–1.200 Hz
para los tres sonidos tonales. Volumen UI 0–100 % corresponde a amplitud digital
0–0,5; no es una medida de presión sonora en el oído. El nivel físico depende
de equipo, auriculares y volumen del sistema. Ningún preset prescribe una
intensidad o frecuencia terapéutica.

Reproducir/pausar/continuar/detener; Escape detiene. Al ocultar la pestaña se
pausa la reproducción o cancela su preparación. Nunca se inicia automáticamente.
Volumen cambia suavemente en vivo; otros ajustes detienen para volver a iniciar.
Presets en localStorage solo al guardar, con error visible si falla. Exporta o
importa configuración JSON. No se guardan ni envían datos clínicos o de escucha.

## Exportación y medición

Descargar WAV genera audio en un Worker, calcula pico/RMS, finitud, silencio,
muestras recortadas, duración y número de eventos; codifica PCM16 sin normalizar
ocultamente. Luego ofrece WAV y una ficha JSON con SHA-256 de WAV y synth.js,
configuración, versión y permisos. Conserva ambos para procedencia. Configuración
JSON por separado exporta ajustes, sin fingir que existe un WAV asociado.
Repetir con misma versión/configuración/tasa produce el mismo resultado en el
mismo entorno; funciones trigonométricas pueden variar en los últimos bits
entre motores JavaScript. No se garantiza hash idéntico entre todos los navegadores.

renderMs mide inicio de renderStereo hasta fin de analyze en el Worker;
encodeMs cubre solo encodeWav. Excluye carga del Worker, transferencia, hashes,
descarga y reproducción. Resolución no calibrada y sobrecosto de instrumentación
son null. La exportación usa 44.100 Hz; el dispositivo puede remuestrear al
reproducir. Timing físico de salida, dispositivo, red y resultado clínico null.
El reloj visual refleja AudioContext, no sincronía física medida. La síntesis
local usa CPU/RAM: sin gasto de GPU ni API pagada, no implica energía gratuita.

Hipótesis técnica y criterio: seis sonidos finitos, no silenciosos con volumen
positivo, pico <=0,5, sin recorte; WAV legible de dos canales y duración prevista;
alternancia con canal opuesto exactamente cero al 100 %, simetría al 0 %, semilla
determinista, parada/cancelación sin inicio tardío. Pruebas reproducibles en
`tests/bilateral.test.mjs` desde la raíz (`node --test tests/bilateral.test.mjs`).
No se afirma eficacia clínica por superar estas pruebas.

## Comparación opcional de sonidos IA

El visor opcional ai-compare.html compara un lote privado generado por MOSS y
Stable Audio. Necesita ai-comparison.json y ai-audio/ preparados por
scripts/sfx-ai/build_review.py; no incluye sonidos de muestra ni llama a APIs.
Si faltan archivos lo indica. Su código de interfaz pertenece a este módulo MIT,
pero los audios externos tienen condiciones independientes: OUTPUT-LICENSE.txt
se aplica solo a la síntesis procedural de synth.js. Los sonidos IA no se
publican automáticamente ni se presentan como autorizados por la licencia MIT.

## Alcance clínico

Herramienta de sonido, no tratamiento autónomo ni protocolo validado de EMDR.
El profesional formado define el uso clínico. NICE contempla tonos como una
opción dentro de un tratamiento EMDR estructurado por profesionales:
https://www.nice.org.uk/guidance/ng116/chapter/recommendations .
Audio estéreo alterno no es un batido binaural ni garantiza un efecto terapéutico.

Especificación usada como referencia técnica, sin copiar código de terceros:
https://www.w3.org/TR/webaudio-1.0/ .
