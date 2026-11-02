// Genera el vocabulario candidato de TC de tórax a partir de «Vocabulario_por_TAC_y_patologia.txt».
// Uso: node scripts/vocab-candidatos.mjs <ruta al .txt>
// Salida determinista: data/vocabulario/candidatos-tc-torax.v1.json y planilla .csv (separador «;», UTF-8 con BOM).
// Los conteos de plantillas del archivo fuente NO se copian (quedan solo en el PC del responsable).
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseVocabSource, buildCandidates, validateVocabulary, VOCAB_SCHEMA, PRIORIDAD_TIPO, ESTADO_PENDIENTE} from '../backend/vocabulary.mjs';

const CHEST = ['tc-torax', 'angiotc-torax-tep'];
const SECCIONES = {'TAC DE TÓRAX Y TAC DE ALTA RESOLUCIÓN': ['tc-torax'], 'ANGIOTAC DE TÓRAX: TROMBOEMBOLISMO PULMONAR': ['angiotc-torax-tep']};
const GRUPOS_TRANSVERSALES = {'Densidad y atenuación': CHEST, 'Realce y fases de contraste': CHEST, 'Forma, tamaño y márgenes': CHEST};
const TERMINOS_EXTRA = {'Lung-RADS': CHEST, 'Fleischner': CHEST};
// Lista base escrita por el equipo (aprobada por el responsable el 2-nov-2026): palabras frecuentes de tórax que la fuente
// dejaba fuera (lista PUC u otras secciones). Coinciden con términos genéricos de esa lista; no copian texto de plantillas.
const BASE = ['neumotórax', 'derrame pleural', 'derrame pericárdico', 'nódulo', 'masa', 'adenopatía', 'linfonodo', 'tromboembolismo pulmonar', 'aorta', 'tráquea', 'esófago', 'pericardio', 'pleura', 'parénquima pulmonar', 'bronquio', 'diafragma']
  .map(termino => ({termino, grupo: 'Términos base de tórax', examenes: CHEST}));
const NO_APLICA = Object.fromEntries(['fase nefrográfica', 'fase corticomedular', 'fase excretora'].map(t => [t, 'fase de contraste de abdomen; no aplica a TC de tórax']));
// Propuesta editorial del equipo para la fase A (a confirmar o cambiar por el responsable en la planilla).
// Criterio declarado: términos técnicos largos, de origen griego o latino, epónimos y siglas, repartidos por grupo.
// Es una hipótesis para medir, no evidencia de dificultad.
export const PROPUESTA = ['bronconeumonía', 'broncograma aéreo', 'vidrio esmerilado', 'árbol en brote', 'bronquiolitis', 'cavitación', 'tuberculoma', 'aspergiloma', 'empiema',
  'atelectasia', 'bandas fibroatelectásicas', 'hemotórax', 'hidroneumotórax', 'neumomediastino', 'paquipleuritis', 'mesotelioma', 'pleurodesis', 
  'bula', 'hiperinsuflación', 'atrapamiento aéreo', 'patrón en mosaico', 'bronquiectasia', 'bronquiolectasias', 'traqueobroncomalacia', 'língula',
  'micronódulo', 'nódulo subsólido', 'nódulo perifisural', 'adenocarcinoma', 'carcinoma epidermoide', 'linfangitis carcinomatosa', 'tumor de Pancoast', 'segmentectomía', 'neumonectomía', 'ventana aortopulmonar', 'adenopatía subcarinal', 'timoma',
  'reticulación', 'panalización', 'engrosamiento septal interlobulillar', 'neumonitis por hipersensibilidad', 'crazy paving', 'sarcoidosis', 'asbestosis', 'líneas de Kerley',
  'cardiomegalia', 'ateromatosis aórtica', 'esternotomía', 'cerclajes esternales', 'traqueostomía', 'sonda nasoenteral',
  'defecto de repleción', 'joroba de Hampton', 'septum interventricular', 'opacificación subóptima', 'espiculado', 'Fleischner', 'Lung-RADS', 'TEP', 'EPOC'];

export function buildDocument(sourceText, sourceName) {
  const entries = parseVocabSource(sourceText);
  const {candidatos, excluidos} = buildCandidates(entries, {secciones: SECCIONES, gruposTransversales: GRUPOS_TRANSVERSALES, terminosExtra: TERMINOS_EXTRA, propuesta: PROPUESTA, terminosBase: BASE, excluirTerminos: NO_APLICA});
  const doc = {
    schema: VOCAB_SCHEMA, version: 1, examen_inicial: 'tc-torax',
    descripcion: 'Vocabulario candidato para glosarios de Muse en TC de tórax. Nunca se envía completo a Muse: el glosario es un subconjunto elegido por medición.',
    estado: ESTADO_PENDIENTE, prioridad_tipo: PRIORIDAD_TIPO,
    fuente: {nombre: sourceName, sha256: createHash('sha256').update(sourceText).digest('hex'), autoria: 'Responsable del proyecto, 2-nov-2026; derivado de lectura de plantillas y literatura citada.'},
    reglas: ['Secciones de TC de tórax y angioTC de tromboembolismo, grupos transversales de densidad/realce/forma, y Lung-RADS y Fleischner.', 'Se agrupan variantes de género y número; se conserva la primera forma de la fuente.', 'Se excluyen lateralidad, negación y unidades.', 'Se omiten los términos de la lista PUC original (permisos de redistribución pendientes); solo se registra cuántos.', 'Se excluyen expresiones que contienen una palabra que ya es candidata por sí sola.', 'Se excluyen las fases de contraste de abdomen (nefrográfica, corticomedular, excretora).', '«no» dentro del nombre de una entidad (neumonía intersticial no específica) no se trata como negación.', 'Se agrega una lista base de 16 términos de tórax escrita por el equipo (origen «lista base del equipo»), después de la regla de compuestos y sin participar en ella.', 'Conteos en plantillas, tasa de error e impacto clínico quedan en null hasta medirse o asignarse.'],
    fuentes_bibliograficas: [...new Set(sourceText.split(/\r?\n/).map(l => l.trim()).filter(l => /^https?:\/\//.test(l)))],
    grupos: [...new Set(candidatos.map(c => c.grupo))],
    excluidos, candidatos,
  };
  const errors = validateVocabulary(doc);
  if (errors.length) throw Error('Vocabulario inválido: ' + errors.join('; '));
  return doc;
}

const cell = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function planilla(doc) {
  const head = ['termino', 'grupo', 'forma', 'examenes', 'prioridad_editorial', 'propuesta_medicion', 'seleccionado (si/no)', 'impacto_clinico (1-3)', 'notas'];
  const rows = doc.candidatos.map(c => [c.termino, c.grupo, c.forma, c.examenes.join(' '), c.prioridad, c.propuesta_medicion ? 'si' : 'no', '', '', '']);
  return '﻿' + [head, ...rows].map(r => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const src = process.argv[2];
  if (!src) { console.error('Uso: node scripts/vocab-candidatos.mjs <Vocabulario_por_TAC_y_patologia.txt>'); process.exit(2); }
  const doc = buildDocument(fs.readFileSync(src, 'utf8'), path.basename(src));
  const out = path.join('data', 'vocabulario');
  fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, 'candidatos-tc-torax.v1.json'), JSON.stringify(doc, null, 1) + '\n');
  fs.writeFileSync(path.join(out, 'candidatos-tc-torax.v1.csv'), planilla(doc));
  console.log(`Candidatos: ${doc.candidatos.length} · propuesta para medir: ${doc.candidatos.filter(c => c.propuesta_medicion).length} · excluidos: ${Object.entries(doc.excluidos).map(([k, v]) => k + ' ' + (typeof v === 'number' ? v : v.length)).join(', ')}`);
}
