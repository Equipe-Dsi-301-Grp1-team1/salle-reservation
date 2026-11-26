const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Agent } = require('../models/User');

const loginAgent = async (email, password) => {
  const agent = await Agent.findOne({
    email: email.toLowerCase(),
  });

  if (!agent) {
    throw new Error('Email ou mot de passe incorrect');
  }

  const passwordValid = await bcrypt.compare(
    password,
    agent.passwordHash
  );

  if (!passwordValid) {
    throw new Error('Email ou mot de passe incorrect');
  }

  const token = jwt.sign(
    {
      id: agent._id,
      role: 'agent',
    },
    process.env.JWT_SECRET || 'dev-secret',
    {
      expiresIn: '1d',
    }
  );

  return { agent, token };
};

module.exports = {
  loginAgent,
};
