// Arranca el laboratorio del repo sin escribir en data/local ni .env.local:
// dataDir, keyFile y templateFile apuntan a WORK_DIR o a un directorio temporal, fuera del repo. .runtime/demo.json no existe en el repo,
// por lo que se intercepta solo esa lectura y se responde con el origen HTTPS local del proxy.
import fs from 'node:fs';
const DEMO = JSON.stringify({ url: 'https://localhost:8443', port: 8787 });
const orig = fs.readFileSync;
fs.readFileSync = function (p, ...rest) { if (String(p).replaceAll('\\', '/').endsWith('/.runtime/demo.json')) return DEMO; return orig.call(this, p, ...rest); };
const base = (process.env.WORK_DIR || fs.mkdtempSync('/tmp/dicta-lab-')) + '/';
const { createLab } = await import(new URL('../../../../backend/lab.mjs', import.meta.url));
const lab = createLab({ dataDir: base + 'labdata', keyFile: base + 'no-key.env', templateFile: base + 'no-templates.json' });
lab.server.listen(8789, '127.0.0.1', () => console.log('lab http://127.0.0.1:8789'));
