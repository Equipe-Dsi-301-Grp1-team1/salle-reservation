const { Schema, model } = require('mongoose');
const STATUS = ['EN_ATTENTE', 'VALIDEE', 'PAYEE', 'REFUSEE', 'EXPIREE', 'ANNULEE', 'TERMINEE'];
const schema = new Schema({
  reference: { type: String, unique: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  guests: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true },
  status: { type: String, enum: STATUS, default: 'EN_ATTENTE' },
  rejectionReason: String,
  expiresAt: Date,
  // Linked references according to diagram relations (creneaux & resources included)
  creneaux: [{ type: Schema.Types.ObjectId, ref: 'Creneau' }],
  resources: [{ type: Schema.Types.ObjectId, ref: 'Resource' }],
  paymentMethodId: { type: Schema.Types.ObjectId, ref: 'PaymentMethod' },
}, { timestamps: true });

module.exports = model('Reservation', schema);