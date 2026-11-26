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
        return res.status(201).json({
            message: 'Compte cree avec succes',
            user: {
                id: user._id,
                nom: user.nom,
                email: user.email
            }
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message
        });
    }
};
module.exports = {
    register
};