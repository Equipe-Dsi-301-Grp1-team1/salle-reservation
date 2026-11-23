const { Schema, model } = require('mongoose');
const schema = new Schema({
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
  name: { type: String, required: true },
  description: String,
  address: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  pricePerHour: { type: Number, required: true, min: 0.01 },
  photos: { type: [String], validate: (v) => v.length <= 5 },
  isPublished: { type: Boolean, default: false },
  ratingAverage: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

schema.index({ isPublished: 1, capacity: 1, pricePerHour: 1 });
module.exports = model('Room', schema);