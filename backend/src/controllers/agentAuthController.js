const agentAuthService = require('../services/agentAuthService');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email et mot de passe obligatoires',
      });
    }

    const { agent, token } = await agentAuthService.loginAgent(
      email,
      password
    );

    req.session.agent = {
      id: agent._id.toString(),
      nom: agent.name,
      email: agent.email,
      role: 'agent',
    };

    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: {
        id: agent._id,
        nom: agent.name,
        email: agent.email,
      },
    });
  } catch (error) {
    return res.status(401).json({
      message: error.message,
    });
  }
};

const logout = (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: 'Erreur lors de la déconnexion',
      });
    }

    res.clearCookie('connect.sid');

    return res.status(200).json({
      message: 'Déconnexion réussie',
    });
  });
};

module.exports = {
  login,
  logout,
};
