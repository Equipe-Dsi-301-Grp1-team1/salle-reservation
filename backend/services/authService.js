const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Agent = require('../models/Agent');
const registerUser = async (nom, email, password) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('Cet email est déjà utilisé');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
        nom,
        email,
        password: hashedPassword
    });
    return user;
};
const loginUser = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Email ou mot de passe incorrect');
    }
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
        throw new Error('Email ou mot de passe incorrect');
    }
    const token = jwt.sign(
        { id: user._id, role: 'client' },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
    return { user, token };
};
const loginAgent = async (email, password) => {
    const agent = await Agent.findOne({ email });
    if (!agent) {
        throw new Error('Email ou mot de passe incorrect');
    }
    const passwordValid = await bcrypt.compare(password, agent.password);

    if (!passwordValid) {
        throw new Error('Email ou mot de passe incorrect');
    }
    return agent;
};
module.exports = {
    registerUser,
    loginUser,
    loginAgent
};