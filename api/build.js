function errorMessage(e) {
  return e && typeof e === "object" ? String(e.message || e.error || JSON.stringify(e)) : String(e || "Unknown error");
}
function clean(value, fallback, max=80) {
  const s = String(value ?? fallback ?? "").trim();
  if (s.length > max || !s) throw new Error("Invalid build value");
  return s;
}
function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}
function githubConfig() {
  return {
    token: String(process.env.GITHUB_TOKEN || ""),
    owner: String(process.env.GITHUB_OWNER || "NanoXyinDev"),
    repo: String(process.env.GITHUB_REPO || "vzxy-builderapk"),
    branch: String(process.env.GITHUB_BRANCH || "main"),
    workflow: String(process.env.GITHUB_BUILD_WORKFLOW || "build.yml")
  };
}
async function github(path, options={}) {
  const cfg = githubConfig();
  if (!cfg.token) {
    const e = new Error("GITHUB_TOKEN is not configured in Vercel Environment Variables");
    e.status = 503;
    throw e;
  }
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ZXVCODE-Web",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data={};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message:text.slice(0,500) }; }
  if (!response.ok) {
    const e = new Error(String(data.message || `GitHub API ${response.status}`));
    e.status = response.status;
    throw e;
  }
  return data;
}
async function findRecentRun(sinceMs) {
  const cfg=githubConfig();
  for (let i=0;i<3;i++) {
    const data=await github(`/repos/${cfg.owner}/${cfg.repo}/actions/workflows/${encodeURIComponent(cfg.workflow)}/runs?branch=${encodeURIComponent(cfg.branch)}&per_page=5`);
    const runs=Array.isArray(data.workflow_runs)?data.workflow_runs:[];
    const run=runs.find(x=>Math.abs(new Date(x.created_at).getTime()-sinceMs)<180000);
    if (run) return run;
    if (i<2) await new Promise(r=>setTimeout(r,1500));
  }
  return null;
}
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  try {
    if (req.method !== 'POST') return res.status(405).json({ok:false,error:'Method not allowed'});
    const { readSession } = require('./_lib/auth');
    const user=readSession(req);
    if (!user) return res.status(401).json({ok:false,error:'Unauthorized'});
    const body=parseBody(req);
    const zipUrl=String(body.zip_url || '').trim();
    if (!/^https?:\/\//i.test(zipUrl)) return res.status(400).json({ok:false,error:'Source ZIP URL harus diawali http:// atau https://'});
    if (zipUrl.length>2000) return res.status(400).json({ok:false,error:'Source ZIP URL terlalu panjang'});
    const buildType=String(body.build_type || 'release').toLowerCase();
    if (!['debug','release'].includes(buildType)) return res.status(400).json({ok:false,error:'build_type harus debug atau release'});
    const onlyAnalyze=Boolean(body.only_analyze);
    const tag=clean(body.tag || `web-${Date.now()}`, `web-${Date.now()}`, 80);
    if (!/^[A-Za-z0-9._-]+$/.test(tag)) return res.status(400).json({ok:false,error:'Tag hanya boleh berisi huruf, angka, titik, underscore, atau strip'});

    const cfg=githubConfig();
    const createdAt=Date.now();
    await github(`/repos/${cfg.owner}/${cfg.repo}/actions/workflows/${encodeURIComponent(cfg.workflow)}/dispatches`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ref:cfg.branch,inputs:{zip_url:zipUrl,tag,build_type:buildType,only_analyze:String(onlyAnalyze)}})
    });
    const run=await findRecentRun(createdAt);
    return res.status(202).json({
      ok:true,
      user:{id:user.sub,name:user.name,role:user.role},
      build:{tag,build_type:buildType,only_analyze:onlyAnalyze,workflow:cfg.workflow,repo:`${cfg.owner}/${cfg.repo}`},
      run:run?{id:run.id,status:run.status,conclusion:run.conclusion,html_url:run.html_url,created_at:run.created_at}:null,
      actions_url:`https://github.com/${cfg.owner}/${cfg.repo}/actions/workflows/${encodeURIComponent(cfg.workflow)}`
    });
  } catch(e) {
    const status=Number(e.status)||500;
    return res.status(status).json({ok:false,error:errorMessage(e)});
  }
};
