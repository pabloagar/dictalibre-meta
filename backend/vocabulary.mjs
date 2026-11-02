// Vocabulario candidato y glosarios de Muse elegidos por medición.
// Dos capas: el vocabulario candidato nunca se envía completo a Muse; el glosario es un
// subconjunto corto elegido con datos medidos (tasa de error sin glosario), por tipo de examen.
import {createHash} from 'node:crypto';
import {normalize as tokens, score} from './lab-core.mjs';

export const VOCAB_SCHEMA = 'dicta-libre.vocabulario.v1';
export const GLOSSARY_SCHEMA = 'dicta-libre.glosario.v1';
export const EXAMS = ['tc-torax', 'angiotc-torax-tep'];
export const ESTADO_PENDIENTE = 'revisión profesional pendiente';
export const PRIORIDAD_TIPO = 'juicio editorial por grupo, no frecuencia medida';
export const TAMANOS = [10, 25, 50, 100];
const MAX_TERMINOS = 100, MAX_LARGO = 100;

export const plain = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');
// JSON canónico: claves ordenadas y valores undefined omitidos, para hashes deterministas.
export const canonical = value => JSON.stringify(value, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().filter(x => v[x] !== undefined).map(x => [x, v[x]])) : v);
export const stableHash = value => createHash('sha256').update(canonical(value)).digest('hex');

// Raíz aproximada para agrupar género y número en español (plural -es/-s, luego -o/-a).
function stem(word) {
  let w = plain(word);
  if (w.length <= 4) return w;
  if (w.endsWith('ces')) return w.slice(0, -3) + 'z';
  if (/[^aeiou]es$/.test(w)) w = w.slice(0, -2); else if (w.endsWith('s')) w = w.slice(0, -1);
  if (w.length > 4 && /[oa]$/.test(w)) w = w.slice(0, -1);
  return w;
}
export const variantKey = term => term.split(/\s+/).filter(Boolean).map(stem).join(' ');

const LATERALIDAD_NEGACION = /(^|\s)(derech[oa]s?|izquierd[oa]s?|bilateral(es)?|unilateral(es)?|contralateral(es)?|ipsilateral(es)?|no|sin|ni)(\s|$)/;
// «no» dentro del nombre de una entidad no es negación (p. ej., neumonía intersticial no específica).
const NEGACION_EXCEPCIONES = new Set(['neumonia intersticial no especifica']);
const UNIDADES = new Set(['milimetro', 'milimetros', 'centimetro', 'centimetros', 'mm', 'cm', 'ml', 'mililitros']);

// Lee el formato «[A] Grupo» + «término (conteo); …» bajo títulos de sección entre líneas de «=».
export function parseVocabSource(text) {
  const lines = text.replace(/^﻿/, '').replace(/\r/g, '').split('\n'), out = [];
  let section = null;
  for (let i = 0; i < lines.length; i++) {
    if (/^={10,}$/.test(lines[i]) && lines[i + 1]?.trim() && !/^=/.test(lines[i + 1])) { section = lines[i + 1].trim(); continue; }
    const head = /^\[([AB])\] (.+)$/.exec(lines[i]);
    if (!head || !section) continue;
    for (const raw of (lines[i + 1] ?? '').split(';')) {
      const item = raw.trim().replace(/\.$/, ''); if (!item) continue;
      const m = /^(.*?) \((\d+)(?:, base)?\)$/.exec(item);
      out.push({section, group: head[2].trim(), prio: head[1], term: (m ? m[1] : item).trim(), count: m ? Number(m[2]) : null, ...(/, base\)$/.test(item) ? {base: true} : {})});
    }
  }
  return out;
}

// Reglas deterministas. Los conteos de plantillas NO se copian: quedan solo en el PC del responsable.
// terminosBase: lista corta escrita por el equipo; se agrega DESPUÉS de la regla de compuestos y no participa en ella.
// excluirTerminos: {término: motivo} para términos de la fuente que no aplican al examen.
export function buildCandidates(entries, {secciones, gruposTransversales = {}, terminosExtra = {}, propuesta = [], terminosBase = [], excluirTerminos = {}}) {
  const byKey = new Map(), excluidos = {lateralidad_negacion: [], unidades: [], compuestos_con_candidato: [], no_aplica_al_examen: [], origen_puc_omitidos: 0};
  const puc = new Set();
  for (const e of entries) {
    const examenes = secciones[e.section] ?? gruposTransversales[e.group] ?? terminosExtra[e.term];
    if (!examenes) continue;
    // Términos de la lista PUC original: permisos de redistribución pendientes; se omiten y solo se cuentan.
    if (e.base) { puc.add(plain(e.term)); excluidos.origen_puc_omitidos = puc.size; continue; }
    const p = plain(e.term);
    if (excluirTerminos[e.term]) { if (!excluidos.no_aplica_al_examen.some(x => x.termino === e.term)) excluidos.no_aplica_al_examen.push({termino: e.term, motivo: excluirTerminos[e.term]}); continue; }
    if (!NEGACION_EXCEPCIONES.has(p) && LATERALIDAD_NEGACION.test(p)) { if (!excluidos.lateralidad_negacion.includes(e.term)) excluidos.lateralidad_negacion.push(e.term); continue; }
    if (UNIDADES.has(p)) { if (!excluidos.unidades.includes(e.term)) excluidos.unidades.push(e.term); continue; }
    const key = variantKey(e.term), prev = byKey.get(key);
    if (prev) {
      for (const x of examenes) if (!prev.examenes.includes(x)) prev.examenes.push(x);
      if (e.prio === 'A') prev.prioridad = 'A';
      if (e.term !== prev.termino && !prev.variantes_omitidas.includes(e.term)) prev.variantes_omitidas.push(e.term);
      continue;
    }
    byKey.set(key, {termino: e.term, forma: /\s/.test(e.term) ? 'expresion' : 'palabra', examenes: [...examenes], grupo: e.group, prioridad: e.prio, origen: 'archivo del responsable', apariciones_plantillas: null, fuente_frecuencia: null, tasa_error_sin_glosario: null, impacto_clinico: null, estado: ESTADO_PENDIENTE, propuesta_medicion: false, variantes_omitidas: []});
  }
  const singles = new Set([...byKey.values()].filter(c => c.forma === 'palabra').map(c => variantKey(c.termino)));
  const candidatos = [];
  for (const c of byKey.values()) {
    if (c.forma === 'expresion' && c.termino.split(/\s+/).some(w => singles.has(stem(w)))) { excluidos.compuestos_con_candidato.push(c.termino); continue; }
    candidatos.push(c);
  }
  for (const b of terminosBase) {
    if (candidatos.some(c => variantKey(c.termino) === variantKey(b.termino))) continue;
    candidatos.push({termino: b.termino, forma: /\s/.test(b.termino) ? 'expresion' : 'palabra', examenes: [...b.examenes], grupo: b.grupo, prioridad: 'A', origen: 'lista base del equipo', apariciones_plantillas: null, fuente_frecuencia: null, tasa_error_sin_glosario: null, impacto_clinico: null, estado: ESTADO_PENDIENTE, propuesta_medicion: false, variantes_omitidas: []});
  }
  const wanted = new Set(propuesta.map(plain));
  for (const c of candidatos) c.propuesta_medicion = wanted.has(plain(c.termino));
  const missing = propuesta.filter(t => !candidatos.some(c => plain(c.termino) === plain(t)));
  if (missing.length) throw Error('Propuesta con términos fuera del vocabulario: ' + missing.join(', '));
  return {candidatos, excluidos};
}

export function validateVocabulary(doc) {
  const errors = [], seen = new Set();
  if (doc?.schema !== VOCAB_SCHEMA) errors.push('schema desconocido');
  const grupos = new Set(doc?.grupos ?? []);
  for (const c of doc?.candidatos ?? []) {
    const t = c.termino;
    if (typeof t !== 'string' || !t.trim()) { errors.push('término vacío'); continue; }
    if (t.length > MAX_LARGO) errors.push(`«${t.slice(0, 20)}…» supera 100 caracteres`);
    const k = plain(t); if (seen.has(k)) errors.push(`término duplicado: ${t}`); seen.add(k);
    if (!grupos.has(c.grupo)) errors.push(`grupo desconocido: ${c.grupo}`);
    if (!['palabra', 'expresion'].includes(c.forma)) errors.push(`forma desconocida: ${t}`);
    if (!Array.isArray(c.examenes) || !c.examenes.length || c.examenes.some(x => !EXAMS.includes(x))) errors.push(`examen desconocido: ${t}`);
    if (!['A', 'B'].includes(c.prioridad)) errors.push(`prioridad inválida: ${t}`);
    if (c.apariciones_plantillas !== null && !(Number.isInteger(c.apariciones_plantillas) && c.apariciones_plantillas >= 0)) errors.push(`apariciones inválidas: ${t}`);
    if (c.tasa_error_sin_glosario !== null && !(typeof c.tasa_error_sin_glosario === 'number' && c.tasa_error_sin_glosario >= 0 && c.tasa_error_sin_glosario <= 1)) errors.push(`tasa inválida: ${t}`);
    if (c.impacto_clinico !== null && ![1, 2, 3].includes(c.impacto_clinico)) errors.push(`impacto inválido: ${t}`);
    if (typeof c.estado !== 'string' || !c.estado) errors.push(`estado vacío: ${t}`);
  }
  return errors;
}

// Escala 1–3 aprobada el 2-nov: plantillas cuando hay conteo > 0; si no, prioridad A/B con su fuente visible.
export function frequencyScore(count, prioridad) {
  if (Number.isInteger(count) && count >= 5) return {valor: 3, fuente: 'plantillas'};
  if (Number.isInteger(count) && count >= 1) return {valor: 2, fuente: 'plantillas'};
  return {valor: prioridad === 'A' ? 2 : 1, fuente: `editorial A/B (${count === 0 ? 'plantillas: 0' : 'sin conteo'})`};
}

// Prioridad = frecuencia (1–3) × tasa de error sin glosario (medida) × impacto clínico (1–3, del responsable).
export function rankGlossary({candidatos, mediciones = {}, impactos = {}, frecuencias = {}, examen, tamanos = TAMANOS}) {
  if (tamanos.some(n => n > MAX_TERMINOS)) throw Error('Ningún glosario puede superar 100 términos.');
  const examenes = [].concat(examen), elegibles = candidatos.filter(c => c.examenes.some(x => examenes.includes(x))).sort((a, b) => a.termino.localeCompare(b.termino, 'es'));
  const excluidos = {sin_medir: [], sin_error_sin_glosario: [], sin_impacto: []}, ranking = [];
  for (const c of elegibles) {
    const m = mediciones[c.termino];
    if (!m || !Number.isInteger(m.observaciones) || m.observaciones <= 0 || !Number.isInteger(m.errores)) { excluidos.sin_medir.push(c.termino); continue; }
    if (m.errores === 0) { excluidos.sin_error_sin_glosario.push(c.termino); continue; }
    const impacto = impactos[c.termino];
    if (![1, 2, 3].includes(impacto)) { excluidos.sin_impacto.push(c.termino); continue; }
    const tasa = m.errores / m.observaciones, f = frequencyScore(frecuencias[c.termino] ?? null, c.prioridad);
    ranking.push({termino: c.termino, puntaje: Number((f.valor * tasa * impacto).toFixed(6)), frecuencia: f.valor, fuente_frecuencia: f.fuente, observaciones: m.observaciones, errores: m.errores, impacto});
  }
  ranking.sort((a, b) => b.puntaje - a.puntaje || a.termino.localeCompare(b.termino, 'es'));
  const entradas = {candidatos: stableHash(elegibles), mediciones: stableHash(mediciones), impactos: stableHash(impactos), frecuencias: stableHash(frecuencias)};
  const glosarios = {};
  for (const n of tamanos) glosarios[n] = ranking.length >= n ? {terminos: ranking.slice(0, n).map(r => r.termino)} : {omitido: `Solo ${ranking.length} términos elegibles; no se rellena.`};
  const result = {examen, entradas, ranking, excluidos, glosarios};
  return {...result, hash: stableHash(result)};
}

// Solo totales agregados: nunca textos, nombres ni rutas.
export function countTermFrequencies({plantillas, terminos, excluirRutas = []}) {
  const fuera = t => (t.sources ?? []).length > 0 && t.sources.every(s => excluirRutas.some(x => String(s.path).includes(x)));
  const usadas = plantillas.filter(t => !fuera(t));
  const exactos = new Map(usadas.map(t => [t.text, t]));
  const norm = t => plain(t).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const normalizados = [...new Set([...exactos.keys()].map(norm))];
  const apariciones = {}, textos_con_termino = {};
  for (const term of terminos) {
    const pat = new RegExp(`(?<![\\p{L}\\p{N}])${norm(term).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'gu');
    let n = 0, k = 0;
    for (const text of normalizados) { const c = (text.match(pat) ?? []).length; n += c; if (c) k++; }
    apariciones[term] = n; textos_con_termino[term] = k;
  }
  return {textos: {total: plantillas.length, excluidos_por_ruta: plantillas.length - usadas.length, unicos_exactos: exactos.size, unicos_normalizados: normalizados.length, criterio_normalizado: 'minúsculas, sin tildes, sin puntuación, espacios colapsados'}, apariciones, textos_con_termino};
}

// Busca términos en un texto: exacto por tokens (sin mayúsculas, con tildes) o flexionado (misma raíz).
export function findTerms(text, terminos) {
  const t = tokens(text), st = t.map(stem), exactos = [], flexionados = [];
  for (const term of terminos) {
    const q = tokens(term), qs = q.map(stem);
    let exact = false, flex = false;
    for (let i = 0; i + q.length <= t.length; i++) {
      if (q.every((w, j) => t[i + j] === w)) { exact = true; break; }
      if (qs.every((w, j) => st[i + j] === w)) flex = true;
    }
    if (exact) exactos.push(term); else if (flex) flexionados.push(term);
  }
  return {exactos, flexionados};
}

export function validateGlossary(g) {
  if (g?.schema !== GLOSSARY_SCHEMA || !EXAMS.includes(g.examen) || !Number.isInteger(g.version) || g.version < 1) throw Error('Glosario inválido.');
  if (!Array.isArray(g.terminos) || !g.terminos.length || g.terminos.length > MAX_TERMINOS || g.terminos.some(t => typeof t !== 'string' || !t.trim() || t.length > MAX_LARGO)) throw Error('Glosario inválido: 1 a 100 términos de hasta 100 caracteres.');
  if (new Set(g.terminos.map(plain)).size !== g.terminos.length) throw Error('Glosario con términos duplicados.');
  if (g.hash !== stableHash({...g, hash: undefined})) throw Error('Hash del glosario no coincide con su contenido.');
  return g;
}

// Configuración de Muse de solo lectura; no se guarda en el catálogo y su id cambia con cada versión/hash.
export function glossaryToConfig(g) {
  validateGlossary(g);
  return {id: `vocab:${g.examen}:v${g.version}:${g.hash.slice(0, 12)}`, name: `Vocabulario ${g.examen} v${g.version} · solo lectura`, engine: 'muse', version: g.version, parentId: null, model: 'muse-voice-transcribe-1.0', language: 'es', device: null, precision: null, beams: null, keywords: [...g.terminos], preparation: 'scipy-resample-poly-mono-16k-v1', mode: 'file', correction: false, readOnly: true, vocabulario: {examen: g.examen, version: g.version, hash: g.hash, hash_entradas: g.hash_entradas ?? null}, createdAt: g.generadoEn ?? null};
}

// Lee la planilla «;» completada por el responsable (Excel es-CL). Devuelve seleccionados e impactos 1–3.
export function parseCsv(text, sep = ';') {
  const rows = [[]]; let cell = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
    if (ch === '"') q = true; else if (ch === sep) { rows.at(-1).push(cell); cell = ''; }
    else if (ch === '\n') { rows.at(-1).push(cell.replace(/\r$/, '')); cell = ''; rows.push([]); }
    else cell += ch;
  }
  if (cell || rows.at(-1).length) rows.at(-1).push(cell.replace(/\r$/, ''));
  return rows.filter(r => r.some(c => c.trim()));
}
export function parseImpactSheet(text) {
  const [head, ...rows] = parseCsv(text), col = name => head.findIndex(h => h.startsWith(name));
  const [ti, si, ii] = [col('termino'), col('seleccionado'), col('impacto_clinico')];
  if (ti < 0 || si < 0 || ii < 0) throw Error('Planilla sin columnas termino/seleccionado/impacto_clinico.');
  const seleccionados = [], impactos = {}, sin_impacto = [];
  for (const r of rows) {
    if (!/^s[ií]$/i.test((r[si] ?? '').trim())) continue;
    const t = r[ti].trim(), v = (r[ii] ?? '').trim(); seleccionados.push(t);
    if (!v) { sin_impacto.push(t); continue; }
    if (!['1', '2', '3'].includes(v)) throw Error(`Valor de impacto inválido para «${t}»: ${v} (usar 1, 2 o 3).`);
    impactos[t] = Number(v);
  }
  return {seleccionados, impactos, sin_impacto};
}

// Cobertura de frases: dónde aparece cada término (exacto) y qué frases traen candidatos (exactos o flexionados).
export function phraseCoverage(frases, terminos, minimo = 3) {
  const por_termino = Object.fromEntries(terminos.map(t => [t, []])), sin_objetivo = [], con_candidatos = [];
  for (const f of frases) {
    const r = findTerms(f.texto, terminos);
    for (const t of r.exactos) por_termino[t].push(f.id);
    if (!r.exactos.length) sin_objetivo.push(f.id);
    if (r.exactos.length || r.flexionados.length) con_candidatos.push(f.id);
  }
  return {por_termino, sin_objetivo, con_candidatos, sin_cobertura: terminos.filter(t => !por_termino[t].length), insuficientes: terminos.filter(t => por_termino[t].length < minimo)};
}

// Regla de decisión registrada el 2-nov-2026, ANTES de medir (EXPERIMENTS.md):
// - mejora = aciertos(variante) − aciertos(sin glosario, repetición 1), en ocurrencias de términos objetivo;
// - candidato: el glosario más corto con mejora ≥ 90 % de la mejora máxima;
// - se rechaza con cualquier término del glosario no dicho en las grabaciones control (cero en N, N ≥ 20);
// - se rechaza si su WER general supera al de «sin glosario» en más que la diferencia entre las dos repeticiones sin glosario (ruido);
// - si ninguna cumple, se mantiene el glosario actual. La latencia se informa y la decide el responsable.
export function decideGlossary({sin_glosario: [b1, b2], variantes}) {
  const wer = x => x.errores / x.palabras, ruido = Math.abs(wer(b2) - wer(b1));
  const tamanos = Object.keys(variantes).sort((a, b) => Number(a) - Number(b));
  const mejora = Object.fromEntries(tamanos.map(n => [n, variantes[n].aciertos - b1.aciertos]));
  const mejora_maxima = Math.max(0, ...Object.values(mejora)), motivos = {};
  let elegido = null;
  for (const n of tamanos) {
    const v = variantes[n];
    if (mejora_maxima <= 0) motivos[n] = 'Ninguna variante mejora los aciertos respecto de sin glosario.';
    else if (mejora[n] < 0.9 * mejora_maxima) motivos[n] = `Logra ${mejora[n]} de ${mejora_maxima}: menos del 90 % de la mejora máxima.`;
    else if (v.controles_no_dichos > 0) motivos[n] = `${v.controles_no_dichos} término(s) del glosario no dicho(s) en controles.`;
    else if (wer(v) - wer(b1) > ruido) motivos[n] = `Aumenta el WER general (${wer(v).toFixed(4)} frente a ${wer(b1).toFixed(4)}; ruido ${ruido.toFixed(4)}).`;
    else { motivos[n] = 'Cumple.'; elegido ??= n; }
  }
  return {elegido, mejora, mejora_maxima, ruido_wer: ruido, motivos, decision: elegido ? `Glosario de ${elegido} términos.` : 'Ninguna variante cumple: se mantiene el glosario actual.'};
}

// Nombre de archivo de la medición: <fase>_<id de frase>_<voz>.wav (v = voz humana, s = sintética).
export function parseAudioName(name) {
  const m = /^([AB])_([ABK]\d{2})_([vs]\d+)\.wav$/i.exec(String(name).trim());
  return m ? {fase: m[1].toUpperCase(), frase: m[2].toUpperCase(), voz: m[3].toLowerCase(), sintetica: m[3][0].toLowerCase() === 's'} : null;
}

// Posiciones de tokens de la referencia que pertenecen a términos objetivo (exactos o flexionados).
function targetPositions(refTokens, terminos) {
  const st = refTokens.map(stem), pos = new Set();
  for (const term of terminos) {
    const q = tokens(term).map(stem);
    for (let i = 0; i + q.length <= st.length; i++) if (q.every((w, j) => st[i + j] === w)) for (let j = 0; j < q.length; j++) pos.add(i + j);
  }
  return pos;
}

// Evalúa una grabación sobre el TEXTO ORIGINAL del motor (sin formato de números ni comandos).
// Acierto = forma exacta de la referencia (sin mayúsculas, con tildes). Flexionado se informa aparte y no es acierto.
// Errores en otras palabras: sustituciones/omisiones fuera de los términos objetivo, más inserciones no contiguas a ellos.
export function evaluateRun({referencia, hipotesis, objetivos, glosario = []}) {
  const h = findTerms(hipotesis ?? '', objetivos), ref = findTerms(referencia, glosario), hyp = findTerms(hipotesis ?? '', glosario);
  const dichos = new Set([...ref.exactos, ...ref.flexionados]);
  const no_dichos = [...hyp.exactos, ...hyp.flexionados].filter(t => !dichos.has(t));
  const s = score(referencia, hipotesis ?? ''), pos = targetPositions(tokens(referencia), objetivos);
  let last = -1, otras = 0;
  for (const op of s.alignment) {
    if (op.kind === 'insertion') { if (!pos.has(last) && !pos.has(last + 1)) otras++; continue; }
    last++; if (op.kind !== 'equal' && !pos.has(last)) otras++;
  }
  return {aciertos: h.exactos, flexionados: h.flexionados, no_reconocidos: objetivos.filter(t => !h.exactos.includes(t) && !h.flexionados.includes(t)), no_dichos, errores_wer: s.substitutions + s.deletions + s.insertions, palabras_referencia: s.referenceWords, errores_otras_palabras: otras};
}
