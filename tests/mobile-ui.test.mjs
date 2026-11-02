import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../apps/mobile/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../apps/mobile/mobile.js', import.meta.url), 'utf8');

test('la vista móvil conserva todos los elementos que usa mobile.js', () => {
  const ids = [...new Set([...js.matchAll(/\$\('([a-z-]+)'\)/g)].map((m) => m[1]))];
  assert.ok(ids.length > 15);
  assert.deepEqual(ids.filter((id) => !html.includes(`id="${id}"`)), []);
});

test('el control de grabar queda en la vista principal y lo técnico en Más opciones', () => {
  const opciones = html.slice(html.indexOf('class="more-options"'));
  const principal = html.slice(0, html.indexOf('class="more-options"'));
  for (const id of ['status', 'duration', 'level', 'prepare', 'record', 'modes']) assert.ok(principal.includes(`id="${id}"`), id);
  for (const id of ['restart', 'export-lifecycle', 'capture-info', 'rtt', 'close', 'test-signal', 'test-haptics']) assert.ok(opciones.includes(`id="${id}"`), id);
  assert.match(html.slice(html.indexOf('</details>')), /sin validación clínica/);
});
