"""Apply the shared minimal review presentation to the eight-voice page.

Preserves the original blind randomization, four scoring criteria and JSON schema.
"""
from pathlib import Path


def minimal_eight(html):
    template = Path(__file__).with_name('compare.html').read_text(encoding='utf-8-sig')
    css = template.split('<style>', 1)[1].split('</style>', 1)[0]
    css += '''body{max-width:none;padding:0}body>h1,body>p,body>.bar,body>details{max-width:912px;margin:24px auto;padding:0 20px}body>h1{margin-top:40px}main{padding-top:0}.card{background:var(--card);border-color:var(--line);margin:0}.quote{background:transparent;border:0;font-size:23px;padding:0}.sample{border-color:var(--line)}.muted{color:var(--muted)}.scores{grid-template-columns:1fr}.scores label{display:block}.scores .choices{margin-top:6px}.bar button.active{background:var(--green)}textarea{border-color:var(--line)}#minimal-nav{max-width:912px;margin:20px auto;display:flex;gap:12px;justify-content:space-between;padding:0 20px}#minimal-nav span{align-self:center;color:var(--muted)}'''
    script = '''<script>
let minimalIndex=0;
const originalRender=render;
render=function(){document.querySelectorAll('audio').forEach(a=>a.pause());originalRender();minimalEnhance()};
function minimalEnhance(){
 const cards=[...document.querySelectorAll('#cards .card')];minimalIndex=Math.min(minimalIndex,Math.max(0,cards.length-1));cards.forEach((c,i)=>c.hidden=i!==minimalIndex);
 for(const select of document.querySelectorAll('.scores select')){
  select.hidden=true;const choices=document.createElement('div');choices.className='choices';
  for(let i=0;i<=5;i++){const b=document.createElement('button');b.textContent=i;b.type='button';b.setAttribute('aria-pressed',String(select.value===String(i)));b.onclick=()=>{select.value=select.value===String(i)?'':String(i);select.dispatchEvent(new Event('change'));for(const x of choices.children)x.setAttribute('aria-pressed',String(x===b&&select.value===String(i)))};choices.append(b)}select.parentElement.append(choices)
 }
 document.querySelectorAll('audio').forEach(a=>a.onplay=()=>document.querySelectorAll('audio').forEach(b=>{if(a!==b)b.pause()}));
 let nav=document.getElementById('minimal-nav');if(!nav){nav=document.createElement('div');nav.id='minimal-nav';document.getElementById('cards').after(nav)}nav.replaceChildren();
 const prev=document.createElement('button'),next=document.createElement('button'),skip=document.createElement('button'),position=document.createElement('span');prev.textContent='← Anterior';prev.disabled=minimalIndex===0;prev.onclick=()=>{minimalIndex--;render()};position.textContent='Frase '+(minimalIndex+1)+' de '+cards.length;
 next.textContent='Guardar y siguiente →';next.className='primary';next.onclick=()=>{save();const card=DATA.cards.filter(c=>c.voice===voice)[minimalIndex];const ready=['A','B'].every(s=>{const v=state[card.key+'_'+s];return v?.heard&&metrics.every(([k])=>v[k]!==null&&v[k]!==undefined&&v[k]!==''&&Number(v[k])>=0&&Number(v[k])<=5)});if(!ready){document.getElementById('message').textContent='Completa la escucha y los cuatro criterios de ambos audios.';return}if(minimalIndex<cards.length-1){minimalIndex++;render()}else document.getElementById('message').textContent='Voz revisada. Selecciona otra voz o exporta la evaluación.'};
 skip.textContent='Saltar';skip.disabled=minimalIndex>=cards.length-1;skip.onclick=()=>{minimalIndex++;render()};nav.append(prev,position,skip,next);
 document.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>{voice=b.dataset.voice;minimalIndex=0;render()});
}
minimalEnhance();
</script>'''
    shell = Path(__file__).with_name('bench_shell.html').read_text(encoding='utf-8-sig')
    return html.replace('</style>', css + '</style>', 1).replace('</body>', script + shell + '</body>', 1)
