const { config } = require('./_lib/github-db');

module.exports = (req, res) => {
  const cfg = config();
  res.status(200).json({
    ok: true,
    service: 'ZXVCODE WEB',
    runtime: 'Vercel Serverless',
    github: {
      configured: Boolean(cfg.token),
      repository: `${cfg.owner}/${cfg.repo}`,
      branch: cfg.branch
    },
    auth: {
      secretConfigured: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32),
      adminConfigured: Boolean(process.env.ADMIN_EMAIL)
    },
    time: new Date().toISOString()
  });
};
