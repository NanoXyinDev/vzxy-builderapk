const profile = require('../data/build-profile.json');
module.exports = (req, res) => {
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
  res.status(200).json({ ok:true, profile });
};
