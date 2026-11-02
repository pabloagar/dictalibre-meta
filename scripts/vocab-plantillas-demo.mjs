// Muestra, SOLO EN LA CONSOLA DEL PC DEL RESPONSABLE, qué plantillas reconoce /live para cada uno de los 10 exámenes de la demo.
// Uso: node scripts/vocab-plantillas-demo.mjs [--catalogo data/local/templates/catalog.json] [--solo-totales]
// No escribe archivos. Con --solo-totales no imprime nombres de plantillas (para compartir la salida).
import fs from 'node:fs';
import path from 'node:path';
import {examForTemplate} from '../apps/shared/report-model.js';
import {EXAMENES} from './vocab-glosarios-demo.mjs';

const i = process.argv.indexOf('--catalogo');
const catalogPath = i > 0 ? process.argv[i + 1] : path.join('data', 'local', 'templates', 'catalog.json');
if (!fs.existsSync(catalogPath)) { console.error(`No existe ${catalogPath}.`); process.exit(2); }
const plantillas = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).templates ?? [];
const soloTotales = process.argv.includes('--solo-totales');
const porExamen = new Map(EXAMENES.map(e => [e.id, []]));
let sinExamen = 0;
for (const t of plantillas) { const ex = examForTemplate(t); if (ex && porExamen.has(ex)) porExamen.get(ex).push(t.name); else sinExamen++; }
for (const e of EXAMENES) {
  const nombres = porExamen.get(e.id);
  console.log(`${e.orden}. ${e.nombre}: ${nombres.length} plantilla(s)${nombres.length ? '' : ' · SIN PLANTILLA: la demo saltaría este examen'}`);
  if (!soloTotales) for (const n of nombres.slice(0, 15)) console.log('     ' + n);
}
console.log(`Plantillas sin examen reconocido (otras modalidades o nombres no reconocidos): ${sinExamen} de ${plantillas.length}.`);
