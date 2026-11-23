const authAgent = (req, res, next) => {
    if (!req.session || !req.session.agent) {
        return res.status(401).json({
            message: 'Accès refusé : agent non connecté'
        });
    }
    next();
};
module.exports = authAgent;