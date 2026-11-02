// Ranking determinista del glosario de TC de tórax (paso 5, después de la fase A).
// Uso: node scripts/vocab-ranking.mjs --mediciones <fase-a.json> --planilla <candidatos completada.csv> [--frecuencias data/local/vocabulario/frecuencias-tc-torax.json]
// Prioridad = frecuencia 1–3 × tasa de error sin glosario (medida) × impacto clínico 1–3 (del responsable).
// Un término sin medir, sin error o sin impacto no entra. No se rellenan tamaños sin términos suficientes.
// Escribe en data/local/vocabulario/ (fuera de Git) el ranking con sus datos de entrada y hashes.
import fs from 'node:fs';
import path from 'node:path';
import {rankGlossary, parseImpactSheet, stableHash} from '../backend/vocabulary.mjs';

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const medPath = arg('--mediciones'), sheetPath = arg('--planilla'), freqPath = arg('--frecuencias');
if (!medPath || !sheetPath) { console.error('Uso: node scripts/vocab-ranking.mjs --mediciones <fase-a.json> --planilla <candidatos.csv> [--frecuencias <json>]'); process.exit(2); }
const vocab = JSON.parse(fs.readFileSync(path.join('data', 'vocabulario', 'candidatos-tc-torax.v1.json'), 'utf8'));
const med = JSON.parse(fs.readFileSync(medPath, 'utf8'));
if (med.schema !== 'dicta-libre.mediciones-fase-a.v1') { console.error('Mediciones con formato desconocido: usa la salida de scripts/vocab-planilla-errores.mjs --fase A.'); process.exit(2); }
const sheet = parseImpactSheet(fs.readFileSync(sheetPath, 'utf8'));
if (!sheet.seleccionados.length) { console.error('La planilla no tiene términos con «seleccionado» = si.'); process.exit(2); }
const frecuencias = freqPath ? JSON.parse(fs.readFileSync(freqPath, 'utf8')).apariciones : {};
const seleccion = new Set(sheet.seleccionados);
const candidatos = vocab.candidatos.filter(c => seleccion.has(c.termino));
const desconocidos = sheet.seleccionados.filter(t => !candidatos.some(c => c.termino === t));
if (desconocidos.length) { console.error('Términos de la planilla que no están en el vocabulario: ' + desconocidos.join(', ')); process.exit(2); }
const mediciones = Object.fromEntries(Object.entries(med.terminos).map(([t, m]) => [t, {observaciones: m.observaciones, errores: m.errores}]));
const r = rankGlossary({candidatos, mediciones, impactos: sheet.impactos, frecuencias, examen: ['tc-torax', 'angiotc-torax-tep']});
const out = {schema: 'dicta-libre.ranking.v1', generadoEn: new Date().toISOString(), vocabulario_sha256: stableHash(vocab), datos_entrada: {mediciones, impactos: sheet.impactos, frecuencias, seleccionados: sheet.seleccionados, sin_impacto: sheet.sin_impacto}, ...r};
const dir = path.join('data', 'local', 'vocabulario');
fs.mkdirSync(dir, {recursive: true});
const file = path.join(dir, `ranking-tc-torax-${r.hash.slice(0, 12)}.json`);
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`Elegibles: ${r.ranking.length} · sin medir ${r.excluidos.sin_medir.length} · Muse ya los reconoce ${r.excluidos.sin_error_sin_glosario.length} · sin impacto ${r.excluidos.sin_impacto.length}`);
for (const [n, g] of Object.entries(r.glosarios)) console.log(`  ${n}: ${g.omitido ?? g.terminos.length + ' términos'}`);
console.log(`Hash del ranking: ${r.hash}\nGuardado en ${file}`);
