'use strict';
const mongoose = require('mongoose');
const { BOOKING_STATUS, EVENT_TYPES, LIMITS } = require('../utils/constants');

const bookingSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    hours: { type: Number, required: true, min: LIMITS.MIN_HOURS, max: LIMITS.MAX_HOURS, validate: Number.isInteger },
    guests: { type: Number, required: true, min: 1, validate: Number.isInteger },
    eventType: { type: String, enum: EVENT_TYPES, required: true },
    hourlyPriceCents: { type: Number, required: true, min: 1 },
    amountCents: { type: Number, required: true, min: 1 },
    status: { type: String, enum: Object.values(BOOKING_STATUS), default: BOOKING_STATUS.PENDING, required: true },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    validatedAt: Date,
    expiresAt: Date,
    paidAt: Date,
    cancelledAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

bookingSchema.index({ agent: 1, status: 1, createdAt: -1 });
bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ room: 1, date: 1 });
bookingSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
