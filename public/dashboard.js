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
