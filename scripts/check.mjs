import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
function walk(path) { return readdirSync(path, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${path}/${e.name}`) : [`${path}/${e.name}`]); }
for (const file of ['apps', 'backend', 'scripts', 'tests'].flatMap(walk).filter(f => /\.(m?js)$/.test(f))) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status) process.exit(result.status);
}
console.log('Sintaxis JavaScript: OK');
