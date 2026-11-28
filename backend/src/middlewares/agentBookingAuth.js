function agentBookingAuth(req, res, next) {
  const agentId =
    req.headers['x-test-agent-id'] ||
    req.headers['x-agent-id'] ||
    req.query.agentId ||
    (req.body && req.body.agentId);

  if (!agentId) {
    return res.status(401).json({ message: 'Agent non identifié.' });
  }

  req.user = { id: agentId.toString(), role: 'agent' };
  next();
}

module.exports = agentBookingAuth;
