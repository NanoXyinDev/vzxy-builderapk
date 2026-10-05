const $=s=>document.querySelector(s);
let features=[];
async function load(){
  const r=await fetch('/api/features'); const d=await r.json(); features=d.features||[];
  $('#count').textContent=features.length;
  const groups=[...new Set(features.map(x=>x.group))].sort();
  $('#group').innerHTML='<option value="">All groups</option>'+groups.map(x=>`<option>${x}</option>`).join('');
  render();
}
function render(){
  const q=$('#search').value.toLowerCase(), g=$('#group').value;
  const list=features.filter(x=>(!q||x.name.toLowerCase().includes(q)||x.id.toLowerCase().includes(q))&&(!g||x.group===g));
  $('#grid').innerHTML=list.map(x=>`<article class="card"><h3>${escapeHtml(x.name)}</h3><p>${escapeHtml(x.id)}</p><span class="badge">${escapeHtml(x.group)} · ${escapeHtml(x.status)}</span></article>`).join('');
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('#refresh').onclick=load;
$('#search').oninput=render; $('#group').onchange=render;
$('#health').onclick=async()=>{const r=await fetch('/api/health'); $('#output').textContent=JSON.stringify(await r.json(),null,2)};
$('#build').onclick=async()=>{
  $('#output').textContent='Dispatching...';
  const r=await fetch('/api/build',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':$('#key').value},body:JSON.stringify({tag:$('#tag').value})});
  $('#output').textContent=JSON.stringify(await r.json(),null,2);
};
load().catch(e=>$('#output').textContent=e.message);
