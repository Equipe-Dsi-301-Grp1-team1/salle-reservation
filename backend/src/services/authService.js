const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Client } = require('../models/User');

const registerUser = async (nom, email, password) => {
  const name = nom;
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('Cet email est déjà utilisé');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await Client.create({
    name,
    email,
    passwordHash,
  });
  return user;
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error('Email ou mot de passe incorrect');
  }
  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw new Error('Email ou mot de passe incorrect');
  }
  const token = jwt.sign(
    { id: user._id, role: user.role || 'client' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '1d' }
  );
  return { user, token };
};

module.exports = {
  registerUser,
  loginUser,
};
