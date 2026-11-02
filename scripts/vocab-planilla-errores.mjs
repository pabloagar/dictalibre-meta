// Planilla de errores de la medición del glosario (TC de tórax), en conteos y por voz.
// Uso: node scripts/vocab-planilla-errores.mjs --corrida <corrida-*.json> --export <exportación JSON del laboratorio>
// Evalúa el TEXTO ORIGINAL del motor. Escribe en data/local/vocabulario/ (fuera de Git):
// - planilla-errores-<fase>-*.csv: una fila por ejecución.
// - Fase A: mediciones-fase-a-*.json (voces humanas; las sintéticas van aparte), insumo de scripts/vocab-ranking.mjs.
// - Fase B: resumen-fase-b-*.json con conteos por variante y voz, y la regla de decisión registrada antes de medir.
import fs from 'node:fs';
import path from 'node:path';
import {evaluateRun, decideGlossary, stableHash} from '../backend/vocabulary.mjs';

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
if (!arg('--corrida') || !arg('--export')) { console.error('Uso: node scripts/vocab-planilla-errores.mjs --corrida <corrida.json> --export <export.json>'); process.exit(2); }
const plan = JSON.parse(fs.readFileSync(arg('--corrida'), 'utf8'));
const exp = JSON.parse(fs.readFileSync(arg('--export'), 'utf8'));
const frases = JSON.parse(fs.readFileSync(path.join('data', 'vocabulario', 'frases-tc-torax.v1.json'), 'utf8'));
const textos = Object.fromEntries([...frases.fases.A.frases, ...frases.fases.B.frases, ...frases.fases.B.controles].map(f => [f.id, f.texto]));
const controles = new Set(frases.fases.B.controles.map(f => f.id));
const audios = new Map(plan.audios.map(a => [a.audioId, a])), variantes = new Map(plan.variantes.map(v => [v.configId, v]));
const repDe = new Map(plan.lotes.flatMap(l => l.runIds.map(id => [id, l.repeticion])));
const runs = exp.runs.filter(r => repDe.has(r.id));
const filas = [];
for (const r of runs) {
  const a = audios.get(r.audioId), v = variantes.get(r.configId);
  if (!a || !v) continue;
  const objetivos = plan.objetivos[a.frase] ?? [];
  const e = r.status === 'completed' ? evaluateRun({referencia: textos[a.frase], hipotesis: r.text ?? '', objetivos, glosario: v.terminos}) : null;
  filas.push({run: r.id, fase: plan.fase, frase: a.frase, control: controles.has(a.frase), voz: a.voz, sintetica: a.sintetica, variante: v.nombre, repeticion: repDe.get(r.id), estado: r.status, objetivos, ...(e ?? {}), latencia_ms: r.timings?.requestMs ?? null, total_ms: r.timings?.totalMs ?? null});
}
const sinCompletar = filas.filter(f => f.estado !== 'completed').length;
const dir = path.join('data', 'local', 'vocabulario'); fs.mkdirSync(dir, {recursive: true});
const tag = `${plan.fase}-${stableHash(filas.map(f => f.run)).slice(0, 12)}`;
const cell = x => { const s = Array.isArray(x) ? x.join(' | ') : String(x ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const cols = ['fase', 'frase', 'control', 'voz', 'sintetica', 'variante', 'repeticion', 'estado', 'objetivos', 'aciertos', 'flexionados', 'no_reconocidos', 'no_dichos', 'errores_otras_palabras', 'errores_wer', 'palabras_referencia', 'latencia_ms', 'total_ms', 'run'];
fs.writeFileSync(path.join(dir, `planilla-errores-${tag}.csv`), '﻿' + [cols.join(';'), ...filas.map(f => cols.map(c => cell(f[c])).join(';'))].join('\r\n') + '\r\n');
console.log(`Ejecuciones evaluadas: ${filas.length} (sin completar: ${sinCompletar}). Planilla: ${path.join(dir, `planilla-errores-${tag}.csv`)}`);
const ok = filas.filter(f => f.estado === 'completed');
const mediana = xs => { const s = xs.filter(x => typeof x === 'number').sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };

if (plan.fase === 'A') {
  const medir = filas => {
    const t = {};
    for (const f of filas) for (const o of f.objetivos) {
      const m = t[o] ??= {observaciones: 0, errores: 0, flexionados: 0, frases: [], por_voz: {}};
      const err = !f.aciertos.includes(o), pv = m.por_voz[f.voz] ??= {observaciones: 0, errores: 0};
      m.observaciones++; pv.observaciones++; if (err) { m.errores++; pv.errores++; } if (f.flexionados.includes(o)) m.flexionados++;
      if (!m.frases.includes(f.frase)) m.frases.push(f.frase);
    }
    return t;
  };
  const humanas = ok.filter(f => !f.sintetica && f.variante === 'sin-glosario'), sint = ok.filter(f => f.sintetica && f.variante === 'sin-glosario');
  const out = {schema: 'dicta-libre.mediciones-fase-a.v1', creadoEn: new Date().toISOString(), corrida: path.basename(arg('--corrida')), voces_humanas: [...new Set(humanas.map(f => f.voz))], terminos: medir(humanas), sinteticas: medir(sint), sin_completar: sinCompletar};
  const pocos = Object.entries(out.terminos).filter(([, m]) => m.observaciones < 5 || m.frases.length < 2 || Object.keys(m.por_voz).length < 2).map(([t]) => t);
  out.cobertura_insuficiente = pocos;
  fs.writeFileSync(path.join(dir, `mediciones-fase-a-${tag}.json`), JSON.stringify(out, null, 1));
  console.log(`Términos medidos: ${Object.keys(out.terminos).length} · con cobertura insuficiente (menos de 5 lecturas, 2 frases o 2 voces): ${pocos.length}`);
  for (const [t, m] of Object.entries(out.terminos).sort((a, b) => b[1].errores - a[1].errores || a[0].localeCompare(b[0], 'es'))) console.log(`  ${t}: ${m.errores}/${m.observaciones} errores (flexionados ${m.flexionados})`);
} else {
  const agrega = filas => ({aciertos: filas.filter(f => !f.control).reduce((s, f) => s + f.aciertos.length, 0), objetivos: filas.filter(f => !f.control).reduce((s, f) => s + f.objetivos.length, 0), grabaciones_control: filas.filter(f => f.control).length, controles_no_dichos: filas.filter(f => f.control).reduce((s, f) => s + f.no_dichos.length, 0), no_dichos_en_objetivo: filas.filter(f => !f.control).reduce((s, f) => s + f.no_dichos.length, 0), errores_otras_palabras: filas.reduce((s, f) => s + f.errores_otras_palabras, 0), errores: filas.reduce((s, f) => s + f.errores_wer, 0), palabras: filas.reduce((s, f) => s + f.palabras_referencia, 0), latencia_mediana_ms: mediana(filas.map(f => f.latencia_ms)), grabaciones: filas.length});
  const base1 = new Map(ok.filter(f => f.variante === 'sin-glosario' && f.repeticion === 1).map(f => [f.frase + '|' + f.voz, f.errores_otras_palabras]));
  const nuevas = filas => filas.reduce((s, f) => s + Math.max(0, f.errores_otras_palabras - (base1.get(f.frase + '|' + f.voz) ?? f.errores_otras_palabras)), 0);
  const resumen = {};
  for (const v of plan.variantes) for (const rep of v.nombre === 'sin-glosario' ? [1, 2] : [1]) {
    const key = v.nombre === 'sin-glosario' ? `sin-glosario-rep${rep}` : v.nombre, sel = ok.filter(f => f.variante === v.nombre && f.repeticion === rep);
    resumen[key] = {terminos: v.terminos.length, humanas: {...agrega(sel.filter(f => !f.sintetica)), errores_nuevos_vs_sin_glosario: nuevas(sel.filter(f => !f.sintetica))}, por_voz: Object.fromEntries([...new Set(sel.map(f => f.voz))].sort().map(vz => [vz, {...agrega(sel.filter(f => f.voz === vz)), errores_nuevos_vs_sin_glosario: nuevas(sel.filter(f => f.voz === vz))}]))};
  }
  const tamanos = plan.variantes.filter(v => /^\d+$/.test(v.nombre)).map(v => v.nombre);
  const decision = resumen['sin-glosario-rep1'] && resumen['sin-glosario-rep2'] ? decideGlossary({sin_glosario: [resumen['sin-glosario-rep1'].humanas, resumen['sin-glosario-rep2'].humanas], variantes: Object.fromEntries(tamanos.map(n => [n, resumen[n].humanas]))}) : null;
  const out = {schema: 'dicta-libre.resumen-fase-b.v1', creadoEn: new Date().toISOString(), corrida: path.basename(arg('--corrida')), ranking_hash: plan.ranking_hash, omitidos: plan.omitidos, sin_completar: sinCompletar, nota: 'Decisión sobre voces humanas agrupadas; voces sintéticas solo informativas. La latencia la decide el responsable.', resumen, decision};
  fs.writeFileSync(path.join(dir, `resumen-fase-b-${tag}.json`), JSON.stringify(out, null, 1));
  for (const [k, r] of Object.entries(resumen)) { const h = r.humanas; console.log(`  ${k} (${r.terminos} términos): aciertos ${h.aciertos}/${h.objetivos} · no dichos en controles ${h.controles_no_dichos}/${h.grabaciones_control} grabaciones · errores WER ${h.errores}/${h.palabras} · errores nuevos ${h.errores_nuevos_vs_sin_glosario} · latencia mediana ${h.latencia_mediana_ms == null ? 'null' : Math.round(h.latencia_mediana_ms) + ' ms'}`); }
  console.log(decision ? `Decisión (regla registrada): ${decision.decision}` : 'Faltan las dos repeticiones sin glosario: no se aplica la regla.');
}
