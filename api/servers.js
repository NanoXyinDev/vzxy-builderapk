const crypto = require("crypto");
const { sql, initDb } = require("./_lib/db");
const { readSession } = require("./_lib/auth");

function body(req){return typeof req.body==="object"&&req.body?req.body:{}}
function clean(v,max=100){return String(v||"").trim().slice(0,max)}
function admin(s){return s && s.role==="admin"}

module.exports = async (req,res) => {
  try {
    const session = await readSession(req);
    if (!session) return res.status(401).json({ok:false,error:"Unauthorized"});
    if (!admin(session)) return res.status(403).json({ok:false,error:"Admin access required"});
    await initDb();

    if (req.method === "GET") {
      const rows = await sql`SELECT id,name,host,port,username,status,provider,created_at,updated_at FROM servers ORDER BY created_at DESC`;
      return res.json({ok:true,servers:rows});
    }

    if (req.method === "POST") {
      const b=body(req), name=clean(b.name,80), host=clean(b.host,253), username=clean(b.username||"root",80);
      const port=Number(b.port||22);
      const provider=clean(b.provider||"custom",40);
      if(!name||!host||!Number.isInteger(port)||port<1||port>65535)
        return res.status(400).json({ok:false,error:"Invalid server fields"});
      const id=crypto.randomUUID();
      await sql`INSERT INTO servers(id,name,host,port,username,provider,status) VALUES(${id},${name},${host},${port},${username},${provider},"offline")`;
      return res.status(201).json({ok:true,id});
    }

    if (req.method === "DELETE") {
      const id=clean(body(req).id,80);
      if(!id) return res.status(400).json({ok:false,error:"Server id required"});
      await sql`DELETE FROM servers WHERE id=${id}`;
      return res.json({ok:true});
    }

    return res.status(405).json({ok:false,error:"Method not allowed"});
  } catch(e) {
    res.status(500).json({ok:false,error:e.message});
  }
};
