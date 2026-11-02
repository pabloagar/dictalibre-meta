// Cuenta, SOLO EN EL PC DEL RESPONSABLE, cuántas veces aparece cada candidato en las plantillas de TC de tórax.
// Uso: node scripts/vocab-frecuencias.mjs [--catalogo data/local/templates/catalog.json] [--ids lista-ids.txt] [--excluir 28.10.26]
// Escribe solo totales agregados en data/local/vocabulario/ (fuera de Git). Nunca escribe textos, nombres ni rutas.
// Los nombres de las plantillas elegidas se muestran SOLO en consola para que el responsable valide el filtro.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {countTermFrequencies, stableHash, plain} from '../backend/vocabulary.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const catalogPath = arg('--catalogo', path.join('data', 'local', 'templates', 'catalog.json'));
const idsPath = arg('--ids', null);
const excluir = (arg('--excluir', '28.10.26')).split(',').filter(Boolean);
if (!fs.existsSync(catalogPath)) { console.error(`No existe ${catalogPath}. Importa primero las plantillas (scripts/import-templates.py).`); process.exit(2); }
const raw = fs.readFileSync(catalogPath);
const catalog = JSON.parse(raw.toString('utf8'));
const vocab = JSON.parse(fs.readFileSync(path.join('data', 'vocabulario', 'candidatos-tc-torax.v1.json'), 'utf8'));

// Filtro por defecto: modalidad Tomografía y nombre con tórax, pulmón o tromboembolismo. Revisar en consola.
const ids = idsPath ? new Set(fs.readFileSync(idsPath, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean)) : null;
const esTorax = t => ids ? ids.has(t.id) : t.category === 'Tomografía' && /torax|pulmon|tromboemb|\btep\b/.test(plain(t.name ?? ''));
const plantillas = (catalog.templates ?? []).filter(esTorax);
console.log(`Plantillas elegidas (${plantillas.length}); revisa que todas sean TC de tórax. Esta lista NO se guarda:`);
for (const t of plantillas) console.log('  ' + t.name);

const r = countTermFrequencies({plantillas, terminos: vocab.candidatos.map(c => c.termino), excluirRutas: excluir});
const out = {
  schema: 'dicta-libre.frecuencias.v1', examen: 'tc-torax', generadoEn: new Date().toISOString(),
  catalogo_sha256: createHash('sha256').update(raw).digest('hex'), vocabulario_sha256: stableHash(vocab),
  filtro: ids ? 'lista de ids validada por el responsable' : 'Tomografía + nombre con tórax/pulmón/tromboembolismo/TEP', excluir_rutas_que_contienen: excluir,
  advertencia: 'Las plantillas describen sobre todo exámenes normales: un 0 no significa que el término sea raro.',
  ...r,
};
const dir = path.join('data', 'local', 'vocabulario');
fs.mkdirSync(dir, {recursive: true});
const file = path.join(dir, 'frecuencias-tc-torax.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`\nTextos: ${r.textos.total} total, ${r.textos.excluidos_por_ruta} excluidos por ruta, ${r.textos.unicos_exactos} únicos exactos, ${r.textos.unicos_normalizados} únicos normalizados (${r.textos.criterio_normalizado}).`);
console.log(`Términos con al menos una aparición: ${Object.values(r.apariciones).filter(n => n > 0).length} de ${vocab.candidatos.length}.`);
console.log(`Guardado en ${file} (fuera de Git). Hash para el registro: ${stableHash(out.apariciones)}`);
