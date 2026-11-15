const { Schema, model } = require('mongoose');
module.exports = model('Resource', new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  marque: { type: String },
}, { timestamps: true }));