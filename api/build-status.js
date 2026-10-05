const { getCurrentUser } = require('./_lib/session-user');
const { getBuilds, updateBuild, getBuildQuota } = require('./_lib/db');
const { config } = require('./_lib/github-db');
const { assertSameOrigin } = require('./_lib/security');
function msg(e){return e&&typeof e==='object'?String(e.message||e.error||JSON.stringify(e)):String(e||'Unknown error')}
async function github(path){const c=config();if(!c.token) return null;const r=await fetch(`https://api.github.com${path}`,{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${c.token}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'ZXVCODE-Web'}});const t=await r.text();let d;try{d=t?JSON.parse(t):{}}catch{d={message:t}}if(!r.ok)throw Object.assign(new Error(d.message||`GitHub API ${r.status}`),{status:r.status});return d}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
  try{
    const user=await getCurrentUser(req); if(!user)return res.status(401).json({ok:false,error:'Login required'});
    let builds=await getBuilds();
    if(String(req.query?.sync||'')==='1' && config().token){
      const c=config(); const wf=encodeURIComponent(String(process.env.GITHUB_WORKFLOW||'build.yml'));
      const data=await github(`/repos/${c.owner}/${c.repo}/actions/workflows/${wf}/runs?event=workflow_dispatch&per_page=30&branch=${encodeURIComponent(String(process.env.GITHUB_REF||c.branch))}`);
      const runs=Array.isArray(data?.workflow_runs)?data.workflow_runs:[];
      const own=builds.filter(x=>x.user_id===user.id).slice(0,12);
      for(const b of own){
        const run=runs.find(r=>String(r.name||r.display_title||'').includes(String(b.tag)));
        if(run){await updateBuild(b.id,{run_id:run.id,run_number:run.run_number,status:run.status||b.status,conclusion:run.conclusion||null,actions_url:run.html_url||b.actions_url,updated_at:new Date().toISOString()});}
      }
      builds=await getBuilds();
    }
    const own=builds.filter(x=>x.user_id===user.id).slice(0,12).map(x=>({id:x.id,name:x.tag,status:x.status||'queued',conclusion:x.conclusion||null,created_at:x.created_at,updated_at:x.updated_at||x.created_at,html_url:x.actions_url||null,run_number:x.run_number||null,build_type:x.build_type,only_analyze:Boolean(x.only_analyze)}));
    const build_quota = await getBuildQuota(user);
    return res.status(200).json({ok:true,runs:own,build_quota});
  }catch(e){return res.status(Number(e.status)||500).json({ok:false,error:msg(e)})}
};
