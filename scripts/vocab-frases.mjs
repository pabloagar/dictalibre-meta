// Verifica la cobertura de las frases de TC de tórax contra la selección vigente.
// Uso: node scripts/vocab-frases.mjs --verificar [--planilla <candidatos completada.csv>]
// Sin planilla usa la propuesta editorial (propuesta_medicion). Termina con código 1 si falta cobertura.
import fs from 'node:fs';
import path from 'node:path';
import {phraseCoverage, parseImpactSheet} from '../backend/vocabulary.mjs';

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const vocab = JSON.parse(fs.readFileSync(path.join('data', 'vocabulario', 'candidatos-tc-torax.v1.json'), 'utf8'));
const frases = JSON.parse(fs.readFileSync(path.join('data', 'vocabulario', 'frases-tc-torax.v1.json'), 'utf8'));
const sheet = arg('--planilla');
const seleccion = sheet ? parseImpactSheet(fs.readFileSync(sheet, 'utf8')).seleccionados : vocab.candidatos.filter(c => c.propuesta_medicion).map(c => c.termino);
const {A, B} = frases.fases;
if (!seleccion.length) { console.error('Selección vacía: marca «si» en la columna seleccionado de la planilla.'); process.exit(2); }
const a = phraseCoverage(A.frases, seleccion), b = phraseCoverage(B.frases, seleccion), k = phraseCoverage(B.controles, seleccion);
console.log(`Selección: ${seleccion.length} términos (${sheet ? 'planilla' : 'propuesta editorial'}).`);
console.log(`Fase A: ${A.frases.length} frases. Con menos de 3 frases: ${a.insuficientes.length ? a.insuficientes.map(t => `${t} (${a.por_termino[t].length})`).join(', ') : 'ninguno'}.`);
console.log(`Fase B: ${B.frases.length} frases objetivo; sin cobertura: ${b.sin_cobertura.join(', ') || 'ninguno'}; frases sin término objetivo: ${b.sin_objetivo.join(', ') || 'ninguna'}.`);
console.log(`Controles: ${B.controles.length}; con candidatos: ${k.con_candidatos.join(', ') || 'ninguno'}.`);
if (a.insuficientes.length || b.sin_cobertura.length || k.con_candidatos.length) process.exitCode = 1;
