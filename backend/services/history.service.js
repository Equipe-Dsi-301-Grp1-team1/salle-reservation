'use strict';
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const { BOOKING_STATUS: S, BOOKING_STATUS_LABELS } = require('../utils/constants');


async function getClientHistory(agentId, clientId, excludeBookingId) {
  const base = { agent: new mongoose.Types.ObjectId(agentId), client: new mongoose.Types.ObjectId(clientId), _id: { $ne: new mongoose.Types.ObjectId(excludeBookingId) } };
  const [rows, paid, list] = await Promise.all([
    Booking.aggregate([{ $match: base }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { ...base, status: { $in: [S.PAID, S.COMPLETED] } } }, { $group: { _id: null, total: { $sum: '$amountCents' } } }]),
    Booking.find(base).populate('room', 'name').sort({ date: -1 }).limit(20),
  ]);
  const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.n]));
  const n = (s) => byStatus[s] || 0;
  const counts = {
    total: rows.reduce((sum, r) => sum + r.n, 0),
    completed: n(S.COMPLETED),
    cancelled: n(S.CANCELLED),
    rejected: n(S.REJECTED),
    expired: n(S.EXPIRED),
  };
  return {
    counts,
    paidTotalCents: paid[0] ? paid[0].total : 0,
    items: list.map((b) => ({ id: b._id.toString(), date: b.date, roomName: b.room ? b.room.name : '—', amountCents: b.amountCents, status: b.status, statusLabel: BOOKING_STATUS_LABELS[b.status] })),
  };
}

module.exports = { getClientHistory };
