'use strict';
const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../utils/constants');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'eur' },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
    stripeSessionId: { type: String, required: true, unique: true },
    stripePaymentIntentId: String,
    stripeEventId: { type: String, unique: true, sparse: true },
    paidAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Payment', paymentSchema);
