const { Schema, model } = require('mongoose');

const schema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'eur' },
  status: { type: String, enum: ['EN_ATTENTE', 'REUSSIE', 'ECHOUEE'], default: 'EN_ATTENTE' },
  stripeSessionId: String,
  stripeEventId: { type: String, unique: true, sparse: true },
  paidAt: Date,
}, { timestamps: true });

module.exports = model('Payment', schema);
