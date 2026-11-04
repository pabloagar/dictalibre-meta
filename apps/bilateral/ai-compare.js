// SPDX-License-Identifier: MIT
export function mountAiReview(data, d = document, w = window) {
  const root = d.getElementById('ai-cases'), status = d.getElementById('review-status');
  const key = 'bilateral-ai-review-v1'; let ratings = {};
  try { ratings = JSON.parse(w.localStorage.getItem(key) || '{}'); } catch { status.textContent = 'No se pudieron recuperar las observaciones.'; }
  const safe = file => typeof file === 'string' && /^ai-audio\/[a-z0-9_-]+\.wav$/i.test(file);
  root.replaceChildren(); const available = data.rows.filter(r => safe(r.playback) && safe(r.original));
  d.getElementById('count').textContent = available.length + '/10 audios';
  status.textContent = available.length === 10 ? 'Diez muestras listas para escuchar.' : `${available.length} muestras listas. Las restantes siguen pendientes; no se sustituyen con otros sonidos.`;
  const save = () => { try { w.localStorage.setItem(key, JSON.stringify(ratings)); status.textContent = 'Observación guardada.'; }
    catch { status.textContent = 'Sin guardar: descarga la evaluación antes de cerrar.'; } };
  for (const [index, item] of data.cases.entries()) {
    const section = d.createElement('section'); section.className = 'ai-case';
    const h = d.createElement('h2'); h.textContent = `${index + 1}. ${item.name}`; section.append(h);
    const pair = d.createElement('div'); pair.className = 'ai-pair'; section.append(pair);
    for (const engine of ['moss', 'stable']) {
      const box = d.createElement('article'); box.className = 'ai-sample';
      const title = d.createElement('h3'); title.textContent = data.engines[engine]; box.append(title);
      const row = available.find(r => r.engine === engine && r.case === item.id);
      if (!row) { box.classList.add('pending'); const p = d.createElement('p'); p.className = 'small'; p.textContent = 'Pendiente de generación'; box.append(p); pair.append(box); continue; }
      const audio = d.createElement('audio'); audio.controls = true; audio.preload = 'none'; audio.src = row.playback;
      audio.setAttribute('aria-label', `${item.name} · ${data.engines[engine]}`);
      audio.addEventListener('play', () => d.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); })); box.append(audio);
      const info = d.createElement('p'); info.className = 'small'; info.textContent = `${row.audio.duration_seconds.toFixed(1)} s · ${row.audio.channels === 1 ? 'mono' : 'estéreo'} · ${row.audio.sample_rate / 1000} kHz`; box.append(info);
      const original = d.createElement('a'); original.className = 'original'; original.href = row.original; original.download = ''; original.textContent = 'WAV original'; box.append(original);
      const details = d.createElement('details'), summary = d.createElement('summary'); summary.textContent = 'Mi evaluación (opcional)'; details.append(summary);
      const id = engine + '_' + item.id + '_' + row.sha256;
      for (const [field, label] of [['sound_match','Coincide'],['cleanliness','Limpieza'],['listening_comfort','Comodidad']]) {
        const wrap = d.createElement('div'); wrap.className = 'rating'; const caption = d.createElement('span'); caption.textContent = label;
        const choices = d.createElement('div'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', `${label} · ${item.name} · ${data.engines[engine]}`);
        const update = () => [...choices.children].forEach(b => b.setAttribute('aria-pressed', String(ratings[id]?.[field] === Number(b.textContent))));
        for (let n = 0; n <= 5; n++) { const b = d.createElement('button'); b.textContent = n; b.onclick = () => { (ratings[id] ??= {sha256:row.sha256})[field] = n; update(); save(); }; choices.append(b); } update();
        wrap.append(caption, choices); details.append(wrap);
      }
      const note = d.createElement('textarea'); note.placeholder = 'Qué escuchas: textura, timbre, golpes, voces inesperadas…';
      note.setAttribute('aria-label', `Observación · ${item.name} · ${data.engines[engine]}`); note.value = ratings[id]?.notes || '';
      note.oninput = () => { (ratings[id] ??= {sha256:row.sha256}).notes = note.value; save(); }; details.append(note); box.append(details); pair.append(box);
    }
    const prompt = d.createElement('details'), summary = d.createElement('summary'), p = d.createElement('p'); summary.textContent = 'Descripción enviada a ambos modelos'; p.textContent = item.prompt; prompt.append(summary, p); section.append(prompt); root.append(section);
  }
  const exportButton = d.getElementById('export-review'); exportButton.disabled = false;
  exportButton.onclick = () => {
    const blob = new Blob([JSON.stringify({schema:'sfx-human-review-v1', manifest_id:data.manifest_id, ratings,
      evaluation:'open_comparison_single_listener_exploratory', missing_ratings:null, created_utc:new Date().toISOString()}, null, 2)], {type:'application/json'});
    const url = w.URL.createObjectURL(blob), link = d.createElement('a'); link.href = url; link.download = 'evaluacion-sonidos-ia.json'; link.click(); w.URL.revokeObjectURL(url);
  };
  return { ratings };
}
if (typeof document !== 'undefined') fetch('./ai-comparison.json', {cache:'no-store'}).then(r => {
  if (!r.ok) throw Error('La prueba todavía no está disponible.'); return r.json();
}).then(data => mountAiReview(data)).catch(error => { document.getElementById('review-status').textContent = error.message; });
