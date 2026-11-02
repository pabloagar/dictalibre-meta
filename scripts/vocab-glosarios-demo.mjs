// Genera los glosarios de DEMOSTRACIÓN (20 términos por examen, 10 exámenes de TC), sin medir.
// Uso: node scripts/vocab-glosarios-demo.mjs <Vocabulario_por_TAC_y_patologia.txt>
// Salida determinista en data/vocabulario/glosarios-demo/: un JSON por examen y revision.csv («;», UTF-8) para el responsable.
// Los conteos de plantillas del archivo fuente solo ordenan dentro de cada grupo; no se escriben.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseVocabSource, selectDemoGlossary, stableHash} from '../backend/vocabulary.mjs';

export const EXAMENES = [
  {id: 'tc-cerebro', nombre: 'TC de cerebro', secciones: ['TAC DE CEREBRO']},
  {id: 'angiotc-cerebro-cuello', nombre: 'AngioTC de cerebro y cuello (incluye perfusión)', secciones: ['ANGIOTAC DE CEREBRO Y CUELLO, Y PERFUSIÓN']},
  {id: 'tc-cavidades-orbitas-oidos', nombre: 'TC de cavidades paranasales, órbitas y oídos', secciones: ['TAC DE CAVIDADES PARANASALES, ÓRBITAS Y OÍDOS']},
  {id: 'tc-cuello', nombre: 'TC de cuello', secciones: ['TAC DE CUELLO']},
  {id: 'tc-columna', nombre: 'TC de columna', secciones: ['TAC DE COLUMNA']},
  {id: 'tc-torax', nombre: 'TC de tórax (incluye alta resolución)', secciones: ['TAC DE TÓRAX Y TAC DE ALTA RESOLUCIÓN']},
  {id: 'angiotc-torax-tep', nombre: 'AngioTC de tórax por tromboembolismo', secciones: ['ANGIOTAC DE TÓRAX: TROMBOEMBOLISMO PULMONAR']},
  {id: 'tc-abdomen-pelvis', nombre: 'TC de abdomen y pelvis', secciones: ['TAC DE ABDOMEN Y PELVIS: ABDOMEN AGUDO', 'TAC DE ABDOMEN: HÍGADO, VÍA BILIAR Y PÁNCREAS', 'TAC DE ABDOMEN: BAZO, SUPRARRENALES Y TUBO DIGESTIVO', 'TAC DE ABDOMEN: RETROPERITONEO Y TRAUMA', 'TAC DE PELVIS']},
  {id: 'pielotc-urotc', nombre: 'PieloTC / UroTC', secciones: ['PIELOTAC, UROTAC Y RETROPERITONEO URINARIO']},
  {id: 'angiotc-aorta', nombre: 'AngioTC de aorta y vasos abdominales', secciones: ['ANGIOTAC DE AORTA Y VASOS ABDOMINALES']},
];
const ESTADO = 'glosario de demostración, sin medir';
const REGLA = 'Términos de las secciones del examen; sin lateralidad, negaciones, unidades ni lista PUC; variantes agrupadas; por grupo: prioridad A, técnicos (10+ letras, sigla o epónimo), conteo en plantillas como apoyo y orden de la fuente; grupos intercalados. Revisión del responsable pendiente.';

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const src = process.argv[2];
  if (!src) { console.error('Uso: node scripts/vocab-glosarios-demo.mjs <Vocabulario_por_TAC_y_patologia.txt>'); process.exit(2); }
  const text = fs.readFileSync(src, 'utf8'), entries = parseVocabSource(text);
  const fuente = {nombre: path.basename(src), sha256: createHash('sha256').update(text).digest('hex')};
  const dir = path.join('data', 'vocabulario', 'glosarios-demo'); fs.mkdirSync(dir, {recursive: true});
  const filas = [['examen', 'orden', 'termino', 'grupo', 'prioridad_editorial', 'tecnico', 'mantener (si/no)', 'reemplazo', 'notas']];
  for (const ex of EXAMENES) {
    const faltan = ex.secciones.filter(s => !entries.some(e => e.section === s));
    if (faltan.length) throw Error(`Sección no encontrada en la fuente: ${faltan.join(', ')}`);
    const r = selectDemoGlossary(entries, {secciones: ex.secciones, n: 20});
    const g = {schema: 'dicta-libre.glosario-demo.v1', examen: ex.id, nombre: ex.nombre, estado: ESTADO, regla: REGLA, secciones: ex.secciones, fuente, terminos: r.terminos, detalle: r.detalle, omitidos_por_repeticion: r.omitidos_por_repeticion};
    g.hash = stableHash(g);
    fs.writeFileSync(path.join(dir, `${ex.id}.json`), JSON.stringify(g, null, 1) + '\n');
    r.detalle.forEach((d, i) => filas.push([ex.id, i + 1, d.termino, d.grupo, d.prioridad, d.tecnico ? 'si' : 'no', 'si', '', '']));
    console.log(`${ex.nombre}: ${r.terminos.length} términos`);
  }
  const cell = v => { const s = String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  fs.writeFileSync(path.join(dir, 'revision.csv'), '﻿' + filas.map(f => f.map(cell).join(';')).join('\r\n') + '\r\n');
}
