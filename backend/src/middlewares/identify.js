function agentOnly(req, res, next) {
  const agentId = req.headers['x-agent-id'] || req.query.agentId || (req.body && req.body.agentId);
  if (!agentId) {
    return res.status(401).json({ message: 'agentId manquant' });
  }
  req.agentId = agentId;
  next();
}

module.exports = { agentOnly };
