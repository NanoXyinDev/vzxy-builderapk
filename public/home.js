function text(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
async function loadStatus(){
  try{
    const response=await fetch('/api/status',{headers:{Accept:'application/json'},cache:'no-store'});
    const raw=await response.text();
    let data;try{data=JSON.parse(raw)}catch{throw new Error(raw.slice(0,160)||`HTTP ${response.status}`)}
    if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
    const online=Number(data.servers?.online||0), total=Number(data.servers?.total||0);
    text('platformStatus','Online');text('platformSub',`API healthy · ${new Date(data.time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);text('onlineCount',online);text('serverCount',total);text('termDb',data.github?.configured?'connected':'not configured');text('termServers',`${online}/${total} online`);text('footerTime','live');
  }catch(error){
    text('platformStatus','Degraded');text('platformSub',error.message||'Service health unavailable');text('termDb','unavailable');text('termServers','unavailable');text('footerTime','degraded');
    const pulse=document.getElementById('platformPulse');if(pulse){pulse.style.background='var(--red)';pulse.style.boxShadow='0 0 0 5px rgba(255,120,139,.08),0 0 20px rgba(255,120,139,.22)'}
  }
}
loadStatus();setInterval(loadStatus,30000);
