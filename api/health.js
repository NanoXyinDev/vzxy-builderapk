function errorMessage(e) { return e && typeof e === "object" ? String(e.message || e.error || JSON.stringify(e)) : String(e || "Unknown error"); }
module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    service: "ZXVCODE WEB",
    runtime: "Vercel Serverless",
    time: new Date().toISOString()
  });
};
