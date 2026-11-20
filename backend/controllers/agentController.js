const authService = require('../services/authService');
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email et mot de passe obligatoires'
            });
        }
        const agent = await authService.loginAgent(email, password);
        req.session.agent = {
            id: agent._id,
            nom: agent.nom,
            email: agent.email
        };
        res.status(200).json({
            message: 'Connexion agent réussie',
            agent: req.session.agent
        });
    } catch (error) {
        res.status(401).json({
            message: error.message
        });
    }
};
const logout = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: 'Erreur lors de la déconnexion'
            });
        }
        res.clearCookie('connect.sid');

        res.status(200).json({
            message: 'Déconnexion réussie'
        });
    });
};
module.exports = {
    login,
    logout
};