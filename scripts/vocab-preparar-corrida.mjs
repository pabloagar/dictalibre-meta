// Prepara (y opcionalmente lanza) la medición del glosario de TC de tórax en el laboratorio local.
// Fase A (selección): node scripts/vocab-preparar-corrida.mjs --fase A [--planilla <csv>] [--ejecutar]
// Fase B (evaluación): node scripts/vocab-preparar-corrida.mjs --fase B --actual <id config glosario actual> --ranking <ranking.json> [--ejecutar]
// Opciones: --lab http://127.0.0.1:8789 · --sin-glosario <id config Muse sin términos>
// Sin --ejecutar solo muestra el plan y no escribe en el laboratorio.
// Condiciones fijas: Muse por archivo, texto original del motor, comandos/números/Revisor DESACTIVADOS.
// Los audios se cargan antes en el laboratorio con nombres <fase>_<frase>_<voz>.wav (ver data/vocabulario/frases-tc-torax.v1.json).
import fs from 'node:fs';
import path from 'node:path';
import {parseAudioName, parseImpactSheet, findTerms, stableHash} from '../backend/vocabulary.mjs';

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const fase = (arg('--fase') ?? '').toUpperCase(), lab = arg('--lab') ?? 'http://127.0.0.1:8789', ejecutar = process.argv.includes('--ejecutar');
if (!['A', 'B'].includes(fase)) { console.error('Indica --fase A o --fase B.'); process.exit(2); }
const api = async (p, body) => {
  const r = await fetch(lab + p, body ? {method: 'POST', headers: {Origin: lab}, body: JSON.stringify(body)} : {});
  const j = await r.json(); if (!r.ok) throw Error(`${p}: ${j.error ?? r.status}`); return j;
};
const vocab = JSON.parse(fs.readFileSync(path.join('data', 'vocabulario', 'candidatos-tc-torax.v1.json'), 'utf8'));
const frases = JSON.parse(fs.readFileSync(path.join('data', 'vocabulario', 'frases-tc-torax.v1.json'), 'utf8'));
const planilla = arg('--planilla');
const seleccion = planilla ? parseImpactSheet(fs.readFileSync(planilla, 'utf8')).seleccionados : vocab.candidatos.filter(c => c.propuesta_medicion).map(c => c.termino);
if (!seleccion.length) { console.error('Selección vacía: marca «si» en la columna seleccionado de la planilla.'); process.exit(2); }
const esperadas = fase === 'A' ? frases.fases.A.frases : [...frases.fases.B.frases, ...frases.fases.B.controles];

const state = await api('/api/state');
const audios = state.audios.map(a => ({audioId: a.id, nombre: a.name, ...parseAudioName(a.name)})).filter(a => a.fase === fase && esperadas.some(f => f.id === a.frase));
const voces = [...new Set(audios.map(a => a.voz))].sort();
const faltantes = voces.flatMap(v => esperadas.filter(f => !audios.some(a => a.voz === v && a.frase === f.id)).map(f => `${fase}_${f.id}_${v}.wav`));
const humanas = voces.filter(v => v.startsWith('v'));
console.log(`Fase ${fase}: ${audios.length} audios reconocidos · voces ${voces.join(', ') || 'ninguna'} · faltan ${faltantes.length}.`);
if (faltantes.length) console.log('  Faltan: ' + faltantes.slice(0, 20).join(', ') + (faltantes.length > 20 ? ' …' : ''));
if (humanas.length < 2) console.log('  Atención: el protocolo pide al menos dos voces humanas (v1, v2).');

const sinGlosario = state.configs.find(c => c.id === arg('--sin-glosario')) ?? state.configs.find(c => c.engine === 'muse' && !c.readOnly && !c.keywords.length);
if (!sinGlosario) { console.error('No hay configuración de Muse sin términos; créala en el laboratorio o indica --sin-glosario.'); process.exit(2); }
const variantes = [{nombre: 'sin-glosario', configId: sinGlosario.id, terminos: [], repeticiones: fase === 'B' ? 2 : 1}];
const omitidos = {};
let ranking = null;
if (fase === 'B') {
  const actual = state.configs.find(c => c.id === arg('--actual'));
  if (!actual) { console.error('Indica --actual <id> de la configuración con el glosario actual (20 términos).'); process.exit(2); }
  variantes.push({nombre: 'actual', configId: actual.id, terminos: actual.keywords, repeticiones: 1});
  if (!arg('--ranking')) { console.error('Indica --ranking <ranking.json> (salida de scripts/vocab-ranking.mjs).'); process.exit(2); }
  ranking = JSON.parse(fs.readFileSync(arg('--ranking'), 'utf8'));
  for (const [n, g] of Object.entries(ranking.glosarios)) {
    if (g.omitido) { omitidos[n] = g.omitido; continue; }
    const name = `TC tórax · glosario ${n} · ranking ${ranking.hash.slice(0, 12)}`;
    const existing = state.configs.find(c => c.name === name && stableHash(c.keywords) === stableHash(g.terminos));
    variantes.push({nombre: n, configId: existing?.id ?? null, nombreConfig: name, terminos: g.terminos, repeticiones: 1});
  }
}
for (const v of variantes) console.log(`  Variante ${v.nombre}: ${v.terminos.length} términos · ${v.repeticiones} repetición(es) · ${v.configId ? 'config ' + v.configId : 'se creará al ejecutar'}`);
for (const [n, m] of Object.entries(omitidos)) console.log(`  Variante ${n}: omitida (${m})`);
const objetivos = Object.fromEntries(esperadas.map(f => [f.id, findTerms(f.texto, seleccion).exactos]));
const total = audios.length * variantes.reduce((s, v) => s + v.repeticiones, 0);
console.log(`Ejecuciones previstas: ${total}. Condiciones: comandos, números y Revisor desactivados; se evalúa el texto original.`);

const plan = {schema: 'dicta-libre.corrida-vocabulario.v1', fase, creadoEn: new Date().toISOString(), lab, build: state.runs?.[0]?.build ?? null, seleccion, ranking_hash: ranking?.hash ?? null, voces, faltantes, audios, variantes, omitidos, objetivos, condiciones: {commandsEnabled: false, numbersEnabled: false, termsEnabled: false, reviewEnabled: false}, lotes: []};
if (!ejecutar) { console.log('\nPlan sin ejecutar. Repite con --ejecutar para crear configuraciones y lanzar las ejecuciones.'); process.exit(0); }
if (!state.metaConfigured) { console.error('El laboratorio no tiene clave de Meta configurada.'); process.exit(2); }
if (faltantes.length) { console.error('Faltan audios: completa las grabaciones antes de ejecutar.'); process.exit(2); }

for (const v of variantes) if (!v.configId) v.configId = (await api('/api/configs', {engine: 'muse', name: v.nombreConfig, keywords: v.terminos})).id;
const dir = path.join('data', 'local', 'vocabulario'); fs.mkdirSync(dir, {recursive: true});
const file = path.join(dir, `corrida-${fase}-${plan.creadoEn.replace(/[:.]/g, '-')}.json`);
const guardar = () => fs.writeFileSync(file, JSON.stringify(plan, null, 1));
const esperarCola = async () => { for (;;) { const s = await api('/api/state'); if (!s.runs.some(r => ['queued', 'running'].includes(r.status))) return; await new Promise(r => setTimeout(r, 5000)); } };
// Lote 1: todas las variantes juntas por audio (el laboratorio alterna el orden). Lote 2: segunda repetición sin glosario.
const lotes = [{repeticion: 1, configIds: variantes.map(v => v.configId)}, ...(fase === 'B' ? [{repeticion: 2, configIds: [sinGlosario.id]}] : [])];
for (const lote of lotes) {
  const porPeticion = Math.max(1, Math.floor(90 / lote.configIds.length));
  for (let i = 0; i < audios.length; i += porPeticion) {
    await esperarCola();
    const ids = audios.slice(i, i + porPeticion).map(a => a.audioId);
    const r = await api('/api/runs', {audioIds: ids, configIds: lote.configIds, repeats: 1, ...plan.condiciones});
    plan.lotes.push({repeticion: lote.repeticion, configIds: lote.configIds, audioIds: ids, runIds: r.runIds}); guardar();
    console.log(`  Lote rep ${lote.repeticion}: ${r.runIds.length} ejecuciones encoladas.`);
  }
}
await esperarCola(); guardar();
console.log(`Corrida terminada. Plan con ids de ejecución: ${file}\nSiguiente: exporta el JSON del laboratorio y ejecuta scripts/vocab-planilla-errores.mjs.`);
