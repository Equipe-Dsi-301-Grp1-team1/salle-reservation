const { Schema, model } = require('mongoose');
const { STATUS } = require('../constants/bookingStatus');

const schema = new Schema({
  reference: { type: String, unique: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  date: { type: Date, index: true },
  hours: { type: Number, min: 1, max: 12 },
  guests: { type: Number, required: true, min: 1 },
  eventType: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, enum: Object.values(STATUS), default: STATUS.EN_ATTENTE },
  rejectionReason: String,
  validatedAt: Date,
  expiresAt: Date,
  paidAt: Date,
  cancelledAt: Date,
  completedAt: Date,
  creneaux: [{ type: Schema.Types.ObjectId, ref: 'Creneau' }],
  resources: [{ type: Schema.Types.ObjectId, ref: 'Resource' }],
  paymentMethodId: { type: Schema.Types.ObjectId, ref: 'PaymentMethod' },
}, { timestamps: true });

schema.index({ clientId: 1, roomId: 1, date: 1 });

module.exports = model('Reservation', schema);
