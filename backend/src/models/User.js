const { Schema, model } = require('mongoose');
const baseOptions = { discriminatorKey: 'role', timestamps: true };

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
}, baseOptions));

const Client = User.discriminator('client', new Schema({
  address: { type: String, default: '' },
}));

const Agent = User.discriminator('agent', new Schema({
  phoneNumber: { type: String, default: '' },
}));

module.exports = { User, Client, Agent };