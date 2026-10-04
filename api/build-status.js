function msg(e){return e&&typeof e==='object'?String(e.message||e.error||JSON.stringify(e)):String(e||'Unknown error')}
async function gh(path){
  const token=String(process.env.GITHUB_TOKEN||'');
  if(!token){const e=new Error('GITHUB_TOKEN is not configured in Vercel Environment Variables');e.status=503;throw e}
  const owner=String(process.env.GITHUB_OWNER||'NanoXyinDev'), repo=String(process.env.GITHUB_REPO||'vzxy-builderapk');
  const r=await fetch(`https://api.github.com${path}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'ZXVCODE-Web'}});
  const t=await r.text(); let d={}; try{d=t?JSON.parse(t):{}}catch{d={message:t}}
  if(!r.ok){const e=new Error(String(d.message||`GitHub API ${r.status}`));e.status=r.status;throw e}
  return d;
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
    const {readSession}=require('./_lib/auth');
    if(!readSession(req))return res.status(401).json({ok:false,error:'Unauthorized'});
    const runId=String(req.query?.run_id||'').trim();
    if(!/^\d+$/.test(runId))return res.status(400).json({ok:false,error:'run_id is required'});
    const owner=String(process.env.GITHUB_OWNER||'NanoXyinDev'), repo=String(process.env.GITHUB_REPO||'vzxy-builderapk');
    const run=await gh(`/repos/${owner}/${repo}/actions/runs/${runId}`);
    const jobs=await gh(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=100`);
    const list=Array.isArray(jobs.jobs)?jobs.jobs:[];
    const activeJob=list.find(j=>j.status==='in_progress'||j.status==='queued')||list[list.length-1]||null;
    const completed=list.filter(j=>j.status==='completed').length;
    const progress=run.status==='completed'?100:Math.min(95,Math.max(6,Math.round((completed/Math.max(list.length,1))*100)));
    return res.json({ok:true,run:{id:run.id,status:run.status,conclusion:run.conclusion,progress,html_url:run.html_url,created_at:run.created_at,updated_at:run.updated_at,job:activeJob?{name:activeJob.name,status:activeJob.status,conclusion:activeJob.conclusion}:null}});
  }catch(e){return res.status(Number(e.status)||500).json({ok:false,error:msg(e)})}
};
