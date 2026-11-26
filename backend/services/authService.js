const bcrypt = require('bcryptjs');
const User = require('../models/User');
const registerUser = async (nom, email, password) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('Cet email est deja utilise');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
        nom,
        email,
        password: hashedPassword
    });
    return user;
};
module.exports = {
    registerUser
};