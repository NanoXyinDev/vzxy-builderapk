function clean(value, fallback) {
  const s = String(value || fallback).trim();
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(s)) throw new Error("Invalid build tag");
  return s;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ok:false,error:"Method not allowed"});
  const expected = process.env.WEB_ADMIN_KEY;
  if (!expected) return res.status(503).json({ok:false,error:"WEB_ADMIN_KEY is not configured"});
  if (req.headers["x-admin-key"] !== expected) return res.status(401).json({ok:false,error:"Unauthorized"});

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || "NanoXyinDev";
  const repo = process.env.GITHUB_REPO || "Builder-Apk";
  const workflow = process.env.GITHUB_WORKFLOW || "build.yml";
  const ref = process.env.GITHUB_REF || "main";
  if (!token) return res.status(503).json({ok:false,error:"GITHUB_TOKEN is not configured"});

  try {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const tag = clean(body.tag, `web-${Date.now()}`);
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${token}`,
        "Accept":"application/vnd.github+json",
        "X-GitHub-Api-Version":"2022-11-28",
        "User-Agent":"ZXVCODE-Web"
      },
      body:JSON.stringify({ref, inputs:{tag, build_type:"release"}})
    });
    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ok:false,error:"GitHub workflow dispatch failed",detail:detail.slice(0,500)});
    }
    return res.status(202).json({ok:true, tag, workflow, repo:`${owner}/${repo}`});
  } catch (error) {
    return res.status(500).json({ok:false,error:error.message});
  }
};
