const { readSession } = require("./_lib/auth");
module.exports = async (req,res) => {
  const session = await readSession(req);
  if (!session) return res.status(401).json({ok:false,error:"Unauthorized"});
  res.status(200).json({ok:true,user:{id:session.sub,name:session.name,email:session.email,role:session.role}});
};
