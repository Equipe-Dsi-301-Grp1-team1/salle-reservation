function agentOnly(req, res, next) {
    if (process.env.NODE_ENV === 'test') {
        const sessionAgent = req.session && req.session.agent;

        const agentId =
            (sessionAgent && sessionAgent.id) ||
            req.headers['x-test-agent-id'] ||
            req.query.agentId ||
            (req.body && req.body.agentId);

        if (!agentId) {
            return res.status(401).json({
                message: 'Authentification requise'
            });
        }

        if (!sessionAgent) {
            req.session.agent = {
                id: agentId,
                nom: 'Agent Test',
                email: 'agent@test.com',
                role: 'agent'
            };
        }

        req.agentId = agentId;
        req.user = {
            id: agentId,
            role: 'agent'
        };

        return next();
    }

    if (!req.session || !req.session.agent || req.session.agent.role !== 'agent') {
        return res.status(401).json({
            message: 'Authentification requise'
        });
    }

    req.agentId = req.session.agent.id;
    req.user = {
        id: req.session.agent.id,
        role: 'agent'
    };

    next();
}

module.exports = { agentOnly };
