const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readableError=v=>typeof v==='string'?v:(v&&typeof v==='object'?(v.message||v.error||JSON.stringify(v)):(v==null?'':String(v)));
async function readJson(r){const text=await r.text();try{return JSON.parse(text)}catch{throw new Error(text.slice(0,220)||`HTTP ${r.status}`)}}
let serverCache=[];
async function load(){
  const me=await fetch('/api/me',{credentials:'include',headers:{Accept:'application/json'}});
  if(!me.ok){location.href='/login';return}
  const u=(await readJson(me)).user;
  if(!u||u.role!=='admin'){location.href='/dashboard';return}
  await Promise.all([loadServers(),loadUsers()]);
}
function renderServers(list){
  $('#serverCount').textContent=list.length;
  $('#servers').innerHTML=list.map(s=>`<article class="server"><div class="server-top"><div><div class="server-name">${esc(s.name)}</div><div class="server-host">${esc(s.host)}:${esc(s.port)}</div></div><span class="status">${esc(s.status||'ready')}</span></div><div class="server-meta"><span class="tag">${esc(s.username||'root')}</span><span class="tag">${esc(s.provider||'custom')}</span><span class="tag accent">managed</span></div><div class="server-actions"><button class="danger" onclick="removeServer('${esc(s.id)}')">Delete</button></div></article>`).join('')||'<p class="muted">No servers yet. Add your first server above.</p>';
}
async function loadServers(){
  try{
    const r=await fetch('/api/servers',{credentials:'include',headers:{Accept:'application/json'}});
    const d=await readJson(r);if(!r.ok)throw new Error(readableError(d.error)||`HTTP ${r.status}`);
    serverCache=d.servers||[];filterServers();
  }catch(e){$('#servers').textContent=readableError(e.message)||'Failed to load servers'}
}
function filterServers(){
  const q=($('#serverSearch')?.value||'').trim().toLowerCase();
  renderServers(serverCache.filter(s=>[s.name,s.host,s.provider,s.username,s.status].join(' ').toLowerCase().includes(q)));
}
async function loadUsers(){
  try{
    const r=await fetch('/api/users',{credentials:'include',headers:{Accept:'application/json'}});
    const d=await readJson(r);if(!r.ok)throw new Error(readableError(d.error)||`HTTP ${r.status}`);
    const users=d.users||[];$('#userCount').textContent=users.length;
    $('#users').innerHTML=users.map(u=>`<article class="user-row"><div><b>${esc(u.name)}</b><br><small>${esc(u.email)} · ${new Date(u.created_at).toLocaleDateString('id-ID')}</small></div><span class="role-pill role-${esc(u.role)}">${esc(u.role)}</span><div class="actions-row"><select onchange="setRole('${esc(u.id)}',this.value)"><option value="free" ${u.role==='free'?'selected':''}>Free</option><option value="pro" ${u.role==='pro'?'selected':''}>Pro</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select></div></article>`).join('')||'<p class="muted">No users yet.</p>';
  }catch(e){$('#users').textContent=readableError(e.message)||'Failed to load users'}
}
async function setRole(id,role){
  try{
    const r=await fetch('/api/users',{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({id,role})});
    const d=await readJson(r);if(!r.ok)throw new Error(readableError(d.error)||`HTTP ${r.status}`);await loadUsers();
  }catch(e){alert(readableError(e.message)||'Failed');loadUsers()}
}
async function removeServer(id){
  if(!confirm('Delete this server record?'))return;
  try{
    const r=await fetch('/api/servers?id='+encodeURIComponent(id),{method:'DELETE',credentials:'include',headers:{Accept:'application/json'}});
    const d=await readJson(r);if(!r.ok)throw new Error(readableError(d.error)||`HTTP ${r.status}`);await loadServers();
  }catch(e){alert(readableError(e.message)||'Failed')}
}
$('#serverForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    const r=await fetch('/api/servers',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});
    const d=await readJson(r);if(!r.ok)throw new Error(readableError(d.error)||`HTTP ${r.status}`);e.target.reset();await loadServers();
  }catch(e){alert(readableError(e.message)||'Failed')}
};
$('#serverSearch')?.addEventListener('input',filterServers);
$('#logout').onclick=async()=>{await fetch('/api/auth?action=logout',{method:'POST',credentials:'include'});location.href='/login'};
load();
