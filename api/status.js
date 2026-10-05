const { readJson, config } = require('./_lib/github-db');

module.exports = async (req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
    if (!config().token) return res.status(200).json({ok:true,platform:'online',servers:{online:0,total:0},github:{configured:false},time:new Date().toISOString()});
    const {value}=await readJson('servers',[]);
    const servers=Array.isArray(value)?value:[];
    const online=servers.filter(s=>String(s.status||'').toLowerCase()==='online').length;
    return res.status(200).json({ok:true,platform:'online',servers:{online,total:servers.length},github:{configured:true},time:new Date().toISOString()});
  }catch(e){
    return res.status(Number(e.status)||500).json({ok:false,error:e instanceof Error?e.message:String(e),platform:'degraded',time:new Date().toISOString()});
  }
};
