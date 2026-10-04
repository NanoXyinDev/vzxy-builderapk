const { readSession } = require('./_lib/auth');
const { config } = require('./_lib/github-db');

function msg(e) { return e && typeof e === 'object' ? String(e.message || e.error || JSON.stringify(e)) : String(e || 'Unknown error'); }
async function gh(path) {
  const c = config();
  const r = await fetch(`https://api.github.com${path}`, { headers: { Accept:'application/vnd.github+json', Authorization:`Bearer ${c.token}`, 'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'ZXVCODE-Web' } });
  const raw=await r.text(); let d; try{d=raw?JSON.parse(raw):{}}catch{d={message:raw}};
  if(!r.ok) throw Object.assign(new Error(d.message||`GitHub API ${r.status}`),{status:502});
  return d;
}
module.exports=async(req,res)=>{
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});
  if(!readSession(req)) return res.status(401).json({ok:false,error:'Login required'});
  try{
    const c=config(); if(!c.token) return res.status(503).json({ok:false,error:'GITHUB_TOKEN is not configured'});
    const workflow=encodeURIComponent(process.env.GITHUB_WORKFLOW||'build.yml');
    const owner=encodeURIComponent(c.owner),repo=encodeURIComponent(c.repo);
    const runs=await gh(`/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=8`);
    const list=(runs.workflow_runs||[]).map(run=>({id:run.id,name:run.name,status:run.status,conclusion:run.conclusion,created_at:run.created_at,updated_at:run.updated_at,html_url:run.html_url,run_number:run.run_number}));
    return res.json({ok:true,runs:list});
  }catch(e){return res.status(Number(e.status)||500).json({ok:false,error:msg(e)})}
};
