const authService = require('../services/authService');
const register = async (req, res) => {
    try {
        const { nom, email, password } = req.body;
        if (!nom || !email || !password) {
            return res.status(400).json({
                message: 'Tous les champs sont obligatoires'
            });
        }
        const user = await authService.registerUser(
            nom,
            email,
            password
        );
        res.status(201).json({
            message: 'Compte créé avec succès',
            user: {
                id: user._id,
                nom: user.nom,
                email: user.email
            }
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email et mot de passe obligatoires'
            });
        }
        const { user, token } = await authService.loginUser(
            email,
            password
        );
        res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user._id,
                nom: user.nom,
                email: user.email
            }
        });
    } catch (error) {
        res.status(401).json({
            message: error.message
        });
    }
};
module.exports = {
    register,
    login
};