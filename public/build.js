const $=s=>document.querySelector(s);
let selectedFile=null,analysis=null,currentUser=null;
function readableError(v){if(typeof v==='string')return v;if(v&&typeof v==='object')return v.message||v.error||JSON.stringify(v);return String(v??'Unknown error')}
async function json(r){const t=await r.text();let d;try{d=t?JSON.parse(t):{}}catch{throw new Error(t.slice(0,220)||`HTTP ${r.status}`)}if(!r.ok)throw new Error(readableError(d));return d}
function setCheck(id,title,sub,cls){$(id).textContent=title;$(id).className=cls||'';$(id.replace('Check','CheckSub')).textContent=sub}
function fmt(n){return n<1024?`${n} B`:`${(n/1024/1024).toFixed(2)} MB`}
function detect(entries){
 const paths=entries.map(x=>x.name.replace(/\\/g,'/').replace(/^\.\//,''));
 const has=p=>paths.some(x=>x===p||x.endsWith(`/${p}`));
 const flutter=has('pubspec.yaml');
 const gradle=has('gradlew')||has('gradlew.bat')||has('settings.gradle')||has('settings.gradle.kts')||has('build.gradle')||has('build.gradle.kts');
 const android=has('android/app/build.gradle')||has('app/build.gradle')||paths.some(x=>x.endsWith('/android/app/build.gradle'));
 const node=has('package.json');
 return {paths,flutter,gradle,android,node};
}
async function inspect(file){
 const zip=await JSZip.loadAsync(file,{checkCRC32:true});
 const entries=Object.values(zip.files);let total=0;let unsafe=[];let sourceFiles=0;let secretHits=0;let dirs=0;const rows=[];const extCounts={};
 for(const e of entries){
  const p=e.name.replace(/\\/g,'/');
  if(e.dir){dirs++;rows.push({path:p,dir:true});continue}
  if(p.startsWith('/')||p.includes('../')||p==='..')unsafe.push(p);
  const bytes=Number(e.uncompressedSize||e._data?.uncompressedSize||0);total+=bytes;sourceFiles++;
  if(total>100*1024*1024)throw new Error('ZIP extract size > 100 MB');
  const ext=(p.includes('.')?p.split('.').pop():'').toLowerCase();extCounts[ext]=(extCounts[ext]||0)+1;
  let secret=false;
  if(/\.(js|ts|json|env|yaml|yml|dart|gradle|kts|properties|xml|txt|php|py|sh)$/i.test(p)&&bytes<1024*1024){
   try{const text=await e.async('string');secret=/(ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|(?:bot|telegram).{0,30}:[A-Za-z0-9_-]{25,}|-----BEGIN (?:RSA|OPENSSH|EC|DSA) PRIVATE KEY-----)/i.test(text)}catch{}
  }
  if(secret)secretHits++;
  rows.push({path:p,dir:false,bytes,ext,secret});
 }
 if(entries.length>5000)throw new Error('ZIP entry count > 5000');
 if(unsafe.length)throw new Error(`ZIP contains unsafe path: ${unsafe[0]}`);
 const kind=detect(entries);analysis={entries,total,sourceFiles,dirs,kind,secretHits,rows,extCounts};
 $('#fileMeta').classList.add('show');$('#fileMeta').innerHTML=`<b>${escapeHtml(file.name)}</b><br><span class="mono">${entries.length} entries · ${fmt(file.size)} compressed · ${fmt(total)} uncompressed</span>`;
 setCheck('#zipCheck','ZIP valid',`${entries.length} entries · no traversal`,'okx');
 const type=kind.flutter?'Flutter':kind.gradle?'Android/Gradle':kind.node?'Node.js / JS':'Unknown';
 const projectReady=kind.flutter||kind.gradle;
 setCheck('#projectCheck',type,projectReady?'APK build markers found':'APK workflow markers not found',projectReady?'okx':'warn');
 setCheck('#sourceCheck',secretHits?'Source scan warning':'Source scan passed',secretHits?`${secretHits} file(s) match credential-like patterns; values are not displayed`:`${sourceFiles} files scanned · ${dirs} directories`,secretHits?'warn':'okx');
 const structure=kind.flutter?'pubspec.yaml ✓':kind.android?'Android Gradle ✓':kind.gradle?'Gradle wrapper/build files ✓':'No APK build entrypoint';
 setCheck('#structureCheck',structure,projectReady?'Ready for workflow':'Analyze Only recommended',projectReady?'okx':'bad');
 $('#scanFiles').textContent=sourceFiles.toLocaleString('id-ID');$('#scanDirs').textContent=dirs.toLocaleString('id-ID');$('#scanSize').textContent=fmt(total);$('#scanSecrets').textContent=String(secretHits);
 $('#scanMeta').textContent=`${Object.keys(extCounts).length} extension types`;
 window.__scanRows=rows;renderFiles('');
 $('#uploadBuild').disabled=false;$('#analyzeOnly').disabled=false;
 return analysis;
}
function renderFiles(query){
 const list=$('#fileList');const rows=(window.__scanRows||[]).filter(x=>!query||x.path.toLowerCase().includes(query.toLowerCase()));
 if(!rows.length){list.innerHTML='<span class="muted">No matching entries.</span>';return}
 const max=500;list.innerHTML=rows.slice(0,max).map(x=>`<div class="file-row"><span class="ext">${x.dir?'DIR':escapeHtml(x.ext||'FILE')}</span><span class="path ${x.secret?'scan-warn':''}" title="${escapeHtml(x.path)}">${escapeHtml(x.path)}</span></div>`).join('');
 if(rows.length>max)list.insertAdjacentHTML('beforeend',`<div class="muted" style="padding:8px">Showing ${max} of ${rows.length} matching entries. The scan itself covered all ${window.__scanRows.length} entries.</div>`);
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function setFile(file){if(!file)return;if(!/\.zip$/i.test(file.name)){return output('Pilih file .zip.')}if(file.size>4*1024*1024)return output('ZIP lebih dari 4 MB. Upload langsung dibatasi 4 MB.');selectedFile=file;$('#dropzone').classList.add('has-file');try{await inspect(file);output(`Source siap: ${file.name}`)}catch(e){selectedFile=null;analysis=null;$('#uploadBuild').disabled=true;$('#analyzeOnly').disabled=true;setCheck('#zipCheck','ZIP invalid',readableError(e),'bad');output(readableError(e))}}
function output(s){$('#output').textContent=readableError(s)}
$('#picker').onchange=e=>setFile(e.target.files[0]);
const dz=$('#dropzone');['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('over')}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('over')}));dz.addEventListener('drop',e=>setFile(e.dataTransfer.files[0]));
async function me(){try{const d=await json(await fetch('/api/me',{credentials:'include',headers:{Accept:'application/json'}}));currentUser=d.user;$('#account').textContent=`${d.user.name} · ${d.user.role.toUpperCase()}`;if(d.user.role==='free')$('#output').textContent='Free: Analyze Only tersedia. Build APK penuh membutuhkan Pro atau Admin.'}catch{location.href='/login'}}
async function upload(){if(!selectedFile)return;const fd=new FormData();fd.append('tag',$('#tag').value.trim()||`build-${Date.now()}`);fd.append('file',selectedFile,selectedFile.name);output('Uploading ZIP ke GitHub…');const d=await json(await fetch('/api/build-upload',{method:'POST',credentials:'include',body:fd}));return d}
async function dispatch(zipUrl,onlyAnalyze){const body={zip_url:zipUrl,tag:$('#tag').value.trim()||`build-${Date.now()}`,build_type:$('#buildType').value,only_analyze:onlyAnalyze};const d=await json(await fetch('/api/build',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)}));if(d.actionsUrl){$('#actionsLink').href=d.actionsUrl;$('#actionsLink').hidden=false}return d}
$('#uploadBuild').onclick=async()=>{try{if(currentUser&&!['pro','admin'].includes(currentUser.role))return output('Build APK membutuhkan role Pro atau Admin.');if(!analysis?.kind.flutter&&!analysis?.kind.gradle){return output('ZIP bukan project Flutter/Android. Gunakan Analyze Only atau upload source APK yang berisi pubspec.yaml / Gradle.')}const uploaded=await upload();output(`Upload OK. Dispatching ${$('#buildType').value}…`);const d=await dispatch(uploaded.rawUrl,false);output(JSON.stringify(d,null,2));loadRuns()}catch(e){output(readableError(e))}};
$('#analyzeOnly').onclick=async()=>{try{const uploaded=await upload();output('ZIP uploaded. Running analyze-only workflow…');const d=await dispatch(uploaded.rawUrl,true);output(JSON.stringify(d,null,2));loadRuns()}catch(e){output(readableError(e))}};
async function loadRuns(){try{const d=await json(await fetch('/api/build-status',{credentials:'include',headers:{Accept:'application/json'},cache:'no-store'}));$('#runs').innerHTML=(d.runs||[]).map(x=>{const cls=x.conclusion==='success'?'done':x.conclusion==='failure'?'fail':'';const st=x.conclusion||x.status||'queued';return `<article class="run"><div><b><span class="status-dot ${cls}"></span>${escapeHtml(x.name||'Build')}</b><br><small>#${x.run_number||'-'} · ${new Date(x.created_at).toLocaleString('id-ID')}</small></div><a href="${escapeHtml(x.html_url||'#')}" target="_blank" rel="noopener" class="ghost">Open</a></article>`}).join('')||'<div class="muted">No recent workflow dispatch runs.</div>'}catch(e){$('#runs').innerHTML=`<div class="muted">${escapeHtml(readableError(e))}</div>`}}
$('#fileSearch').addEventListener('input',e=>renderFiles(e.target.value));$('#refreshRuns').onclick=loadRuns;$('#logout').onclick=async()=>{await fetch('/api/auth?action=logout',{method:'POST',credentials:'include'});location.href='/login'};
me();loadRuns();
