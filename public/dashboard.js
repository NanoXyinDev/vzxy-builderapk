async function safeJson(response){
  const text=await response.text();
  try{return JSON.parse(text)}catch{throw new Error(text.slice(0,180)||`HTTP ${response.status}`)}
}
function readableError(value){
  if(typeof value==='string')return value;
  if(value&&typeof value==='object')return value.message||value.error||JSON.stringify(value);
  return value==null?'':String(value);
}
async function getMe(){
  const r=await fetch('/api/me',{credentials:'include',headers:{Accept:'application/json'}});
  if(!r.ok){location.href='/login';return null}
  return (await safeJson(r)).user;
}
(async()=>{
  try{
    const u=await getMe();
    if(!u)return;
    document.querySelector('#hello').textContent=`Hello, ${u.name}.`;
    document.querySelector('#role').textContent=u.role.toUpperCase();
    document.querySelector('#email').textContent=u.email;
    document.querySelector('#sideName').textContent=u.name;
    document.querySelector('#sideRole').textContent=u.role.toUpperCase();
    if(u.role==='admin')document.querySelector('#adminLink').hidden=false;
  }catch(e){document.querySelector('#hello').textContent=readableError(e.message)||'Unable to load dashboard'}
})();
document.querySelector('#logout').onclick=async()=>{await fetch('/api/auth?action=logout',{method:'POST',credentials:'include'});location.href='/login'};

const buildForm=document.querySelector('#buildForm');
let buildTimer=null;
function showBuildNotice(message,type='info'){const el=document.querySelector('#buildNotice');el.hidden=false;el.className=`build-notice ${type}`;el.textContent=readableError(message)}
function setMonitor(run){
  const box=document.querySelector('#buildMonitor');box.hidden=false;
  document.querySelector('#monitorStatus').textContent=run.status==='completed'?(run.conclusion||'completed'):String(run.status||'queued').replace('_',' ');
  document.querySelector('#monitorProgressText').textContent=`${run.progress||0}%`;
  document.querySelector('#monitorProgress').style.width=`${Math.max(0,Math.min(100,run.progress||0))}%`;
  document.querySelector('#monitorJob').textContent=run.job?.name||'Waiting for GitHub runner…';
  const link=document.querySelector('#monitorLink');if(run.html_url){link.href=run.html_url;link.hidden=false}else link.hidden=true;
}
async function pollBuild(runId){
  clearInterval(buildTimer);
  const tick=async()=>{
    try{
      const r=await fetch(`/api/build-status?run_id=${encodeURIComponent(runId)}`,{credentials:'include',headers:{Accept:'application/json'}});
      const d=await safeJson(r);if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);
      setMonitor(d.run);
      if(d.run.status==='completed'){clearInterval(buildTimer);showBuildNotice(d.run.conclusion==='success'?'Build selesai. Artifact APK tersedia di GitHub Actions.':`Build selesai: ${d.run.conclusion||'failed'}`,d.run.conclusion==='success'?'success':'error')}
    }catch(e){showBuildNotice(e.message||'Gagal membaca status build','error')}
  };
  await tick();
  buildTimer=setInterval(tick,5000);
}
buildForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  showBuildNotice('Mengirim build ke GitHub Actions…');
  const submit=e.currentTarget.querySelector('.build-submit');submit.disabled=true;submit.classList.add('loading');
  try{
    const r=await fetch('/api/build',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({zip_url:document.querySelector('#zipUrl').value,build_type:document.querySelector('#buildType').value,tag:document.querySelector('#buildTag').value,only_analyze:document.querySelector('#onlyAnalyze').checked})});
    const d=await safeJson(r);if(!r.ok)throw new Error(d.error||d.detail||`HTTP ${r.status}`);
    showBuildNotice(`Build ${d.build.tag} masuk antrean.`,'success');
    if(d.run?.id){setMonitor(d.run);pollBuild(d.run.id)}
    else { document.querySelector('#buildMonitor').hidden=false; setMonitor({status:'queued',progress:3,job:{name:'Waiting for GitHub runner…'},html_url:d.actions_url}); }
  }catch(e){showBuildNotice(e.message||'Build gagal dikirim','error')}
  finally{submit.disabled=false;submit.classList.remove('loading')}
});
