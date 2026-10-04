const { readSession } = require('./_lib/auth');
const { getBuilds, initDb } = require('./_lib/db');

function msg(e){return e&&typeof e==='object'?String(e.message||e.error||JSON.stringify(e)):String(e||'Unknown error')}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
  const user=readSession(req);
  if(!user)return res.status(401).json({ok:false,error:'Login required'});
  try{
    await initDb();
    const builds=await getBuilds();
    const own=builds.filter(x=>x.user_id===user.id).slice(0,12).map(x=>({
      id:x.id,
      name:x.tag,
      status:x.status||'queued',
      conclusion:x.conclusion||null,
      created_at:x.created_at,
      updated_at:x.updated_at||x.created_at,
      html_url:x.actions_url||null,
      run_number:x.run_number||null,
      build_type:x.build_type,
      only_analyze:Boolean(x.only_analyze)
    }));
    return res.status(200).json({ok:true,runs:own});
  }catch(e){return res.status(Number(e.status)||500).json({ok:false,error:msg(e)})}
};
