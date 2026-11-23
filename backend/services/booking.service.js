'use strict';
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');
const dates = require('../utils/dates');
const env = require('../config/env');
const eventBus = require('../utils/eventBus');
const { computeAmountCents } = require('../utils/money');
const {
  BOOKING_STATUS: S,
  BOOKING_TRANSITIONS,
  OPEN_BOOKING_STATUSES,
  DAY_HOLDING_STATUSES,
  CANCELLABLE_STATUSES,
  BOOKING_STATUS_LABELS,
  LIMITS,
} = require('../utils/constants');

const roomService = () => require('./room.service');
const availability = () => require('./availability.service');
const history = () => require('./history.service');

const POPULATE = [
  { path: 'room', select: 'name address photos' },
  { path: 'client', select: 'name email' },
];

const iso = (d) => (d ? new Date(d).toISOString() : null);

function canCancel(b, today = dates.todayString()) {
  return CANCELLABLE_STATUSES.includes(b.status) && dates.diffDays(b.date, today) > env.CANCELLATION_MIN_DAYS;
}

function canPay(b, now = new Date()) {
  return b.status === S.VALIDATED && Boolean(b.expiresAt) && b.expiresAt > now;
}

function serialize(b, { reviewed = false } = {}) {
  const now = new Date();
  const room = b.room && b.room.name ? b.room : { _id: b.room };
  const client = b.client && b.client.name ? b.client : { _id: b.client };
  return {
    id: b._id.toString(),
    room: {
      id: room._id.toString(),
      name: room.name,
      address: room.address,
      photos: room.photos || [],
    },
    client: { id: client._id.toString(), name: client.name, email: client.email },
    date: b.date,
    hours: b.hours,
    guests: b.guests,
    eventType: b.eventType,
    hourlyPriceCents: b.hourlyPriceCents,
    amountCents: b.amountCents,
    status: b.status,
    statusLabel: BOOKING_STATUS_LABELS[b.status],
    rejectionReason: b.rejectionReason || null,
    expiresAt: iso(b.expiresAt),
    validatedAt: iso(b.validatedAt),
    paidAt: iso(b.paidAt),
    cancelledAt: iso(b.cancelledAt),
    createdAt: iso(b.createdAt),
    canCancel: canCancel(b),
    canPay: canPay(b, now),
    hoursLeftToPay: canPay(b, now) ? Math.max(1, Math.ceil((b.expiresAt - now) / 3600000)) : null,
    hasReview: reviewed,
  };
}

async function serializeMany(bookings) {
  const ids = bookings.filter((b) => b.status === S.COMPLETED).map((b) => b._id);
  const reviewed = new Set((ids.length ? await Review.find({ booking: { $in: ids } }, 'booking') : []).map((r) => r.booking.toString()));
  return bookings.map((b) => serialize(b, { reviewed: reviewed.has(b._id.toString()) }));
}

function loadPopulated(id) {
  return Booking.findById(id).populate(POPULATE);
}

async function transition(bookingId, from, to, extra = {}) {
  const fromList = Array.isArray(from) ? from : [from];
  fromList.forEach((f) => {
    if (!BOOKING_TRANSITIONS[f].includes(to)) throw new Error(`Transition interdite ${f} → ${to}`);
  });
  const updated = await Booking.findOneAndUpdate({ _id: bookingId, status: { $in: fromList } }, { $set: { status: to, ...extra } }, { new: true });
  if (!updated) throw AppError.conflict('INVALID_TRANSITION', 'Cette action est impossible dans l\'état actuel de la réservation.');
  return updated;
}


async function createRequest(clientId, { roomId, date, hours, guests, eventType }) {
  if (date < dates.todayString()) throw AppError.validation('La date ne peut pas être dans le passé.', [{ field: 'date', message: 'La date ne peut pas être dans le passé.' }]);
  const room = await roomService().getPublishedById(roomId);
  if (!(await availability().isOpen(room._id, date))) throw AppError.conflict('DAY_NOT_OPEN', "Ce jour n'est pas disponible pour cette salle.");
  if (guests > room.capacity) {
    throw new AppError(422, 'CAPACITY_EXCEEDED', `Cette salle accueille ${room.capacity} invités au maximum.`, [
      { field: 'guests', message: `Cette salle accueille ${room.capacity} invités au maximum.` },
    ]);
  }
  const duplicate = await Booking.exists({ client: clientId, room: room._id, date, status: { $in: OPEN_BOOKING_STATUSES } });
  if (duplicate) throw AppError.conflict('DUPLICATE_REQUEST', 'Vous avez déjà une demande en cours pour cette salle à cette date.');

  const booking = await Booking.create({
    client: clientId,
    room: room._id,
    agent: room.agent._id || room.agent,
    date,
    hours,
    guests,
    eventType,
    hourlyPriceCents: room.pricePerHourCents,
    amountCents: computeAmountCents(room.pricePerHourCents, hours),
    status: S.PENDING,
  });
  eventBus.emit(eventBus.EVENTS.BOOKING_CREATED, { bookingId: booking._id.toString() });
  return (await serializeMany([await loadPopulated(booking._id)]))[0];
}

async function listForClient(clientId, { status, page = 1, limit = 10 } = {}) {
  const query = { client: clientId };
  if (status) query.status = status;
  const [items, total] = await Promise.all([
    Booking.find(query).populate(POPULATE).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    Booking.countDocuments(query),
  ]);
  return { items: await serializeMany(items), page, limit, total, totalPages: Math.ceil(total / limit) };
}

async function getOwnedByClient(bookingId, clientId) {
  if (!mongoose.isValidObjectId(bookingId)) throw AppError.notFound('Réservation introuvable.');
  const b = await Booking.findOne({ _id: bookingId, client: clientId }).populate(POPULATE);
  if (!b) throw AppError.notFound('Réservation introuvable.');
  return b;
}

async function getForClient(bookingId, clientId) {
  return (await serializeMany([await getOwnedByClient(bookingId, clientId)]))[0];
}

async function cancel(clientId, bookingId) {
  const booking = await getOwnedByClient(bookingId, clientId);
  if (!CANCELLABLE_STATUSES.includes(booking.status)) throw AppError.conflict('INVALID_TRANSITION', 'Cette réservation ne peut plus être annulée.');
  const daysUntil = dates.diffDays(booking.date, dates.todayString());
  if (daysUntil <= env.CANCELLATION_MIN_DAYS) {
    throw AppError.conflict('CANCELLATION_TOO_LATE', `Une réservation ne peut être annulée que plus de ${env.CANCELLATION_MIN_DAYS} jours avant l'événement.`);
  }
  const previous = booking.status;
  await transition(booking._id, previous, S.CANCELLED, { cancelledAt: new Date() });
  if (DAY_HOLDING_STATUSES.includes(previous)) await availability().releaseDay(booking.room._id, booking.date, booking._id);
  eventBus.emit(eventBus.EVENTS.BOOKING_CANCELLED, { bookingId: booking._id.toString() });
  return getForClient(bookingId, clientId);
}

async function getPaidForClient(bookingId, clientId) {
  const booking = await getOwnedByClient(bookingId, clientId);
  if (![S.PAID, S.COMPLETED].includes(booking.status)) {
    throw AppError.conflict('PAYMENT_ERROR', 'Le reçu est disponible uniquement pour une réservation payée.');
  }
  return booking;
}


async function listForAgent(agentId, { status, room, page = 1, limit = 10 } = {}) {
  const query = { agent: agentId };
  if (status) query.status = status;
  if (room) query.room = room;
  const [items, total] = await Promise.all([
    Booking.find(query).populate(POPULATE).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    Booking.countDocuments(query),
  ]);
  const [counts, paid] = await Promise.all([countByStatusForAgent(agentId), listPaidForAgent(agentId, new Date(`${dates.monthOf(new Date())}-01T00:00:00Z`))]);
  const monthRevenueCents = paid.reduce((sum, b) => sum + b.amountCents, 0);
  return { items: await serializeMany(items), page, limit, total, totalPages: Math.ceil(total / limit), summary: { counts, monthRevenueCents } };
}

async function getOwnedByAgent(bookingId, agentId) {
  if (!mongoose.isValidObjectId(bookingId)) throw AppError.notFound('Demande introuvable.');
  const b = await Booking.findOne({ _id: bookingId, agent: agentId }).populate(POPULATE);
  if (!b) throw AppError.notFound('Demande introuvable.');
  return b;
}

async function getForAgent(bookingId, agentId) {
  const b = await getOwnedByAgent(bookingId, agentId);
  const [booking] = await serializeMany([b]);
  return { booking, history: await history().getClientHistory(agentId, b.client._id, b._id) };
}

async function validate(agentId, bookingId) {
  const booking = await getOwnedByAgent(bookingId, agentId);
  if (booking.status !== S.PENDING) throw AppError.conflict('INVALID_TRANSITION', "Seule une demande en attente peut être validée.");
  if (booking.date < dates.todayString()) throw AppError.conflict('DAY_NOT_OPEN', 'La date de cette demande est déjà passée.');

  const locked = await availability().lockDay(booking.room._id, booking.date, booking._id);
  if (!locked) {
    const day = await availability().getDay(booking.room._id, booking.date);
    if (day && day.status === 'booked') throw AppError.conflict('DAY_ALREADY_TAKEN', 'Ce jour est déjà réservé par une autre demande.');
    throw AppError.conflict('DAY_NOT_OPEN', "Ce jour n'est plus ouvert à la réservation.");
  }
  const now = new Date();
  try {
    await transition(booking._id, S.PENDING, S.VALIDATED, {
      validatedAt: now,
      expiresAt: new Date(now.getTime() + env.PAYMENT_DEADLINE_HOURS * 3600 * 1000),
    });
  } catch (err) {
    await availability().releaseDay(booking.room._id, booking.date, booking._id);
    throw err;
  }
  eventBus.emit(eventBus.EVENTS.BOOKING_VALIDATED, { bookingId: booking._id.toString() });
  return (await serializeMany([await loadPopulated(booking._id)]))[0];
}

async function reject(agentId, bookingId, reason) {
  const booking = await getOwnedByAgent(bookingId, agentId);
  const cleaned = String(reason || '').trim();
  if (!cleaned) throw AppError.validation('Le motif du refus est obligatoire.', [{ field: 'reason', message: 'Le motif du refus est obligatoire.' }]);
  await transition(booking._id, S.PENDING, S.REJECTED, { rejectionReason: cleaned });
  eventBus.emit(eventBus.EVENTS.BOOKING_REJECTED, { bookingId: booking._id.toString() });
  return (await serializeMany([await loadPopulated(booking._id)]))[0];
}

async function hasActiveBookings(roomId) {
  return Boolean(await Booking.exists({ room: roomId, status: { $in: DAY_HOLDING_STATUSES } }));
}

async function hasOpenBookingOnDay(roomId, date) {
  return Boolean(await Booking.exists({ room: roomId, date, status: { $in: OPEN_BOOKING_STATUSES } }));
}

async function rejectPendingForRoom(roomId, reason) {
  const pending = await Booking.find({ room: roomId, status: S.PENDING }, '_id');
  for (const { _id } of pending) {
    try {
      await transition(_id, S.PENDING, S.REJECTED, { rejectionReason: reason });
      eventBus.emit(eventBus.EVENTS.BOOKING_REJECTED, { bookingId: _id.toString() });
    } catch {
    }
  }
  return pending.length;
}

async function countByStatusForAgent(agentId) {
  const rows = await Booking.aggregate([{ $match: { agent: new mongoose.Types.ObjectId(agentId) } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  const out = Object.fromEntries(Object.values(S).map((s) => [s, 0]));
  rows.forEach((r) => { out[r._id] = r.n; });
  return out;
}

async function listPaidForAgent(agentId, sinceDate) {
  return Booking.find({ agent: agentId, status: { $in: [S.PAID, S.COMPLETED] }, paidAt: { $gte: sinceDate } });
}

async function listPendingForAgent(agentId, limit = 5) {
  const items = await Booking.find({ agent: agentId, status: S.PENDING }).populate(POPULATE).sort({ createdAt: 1 }).limit(limit);
  return serializeMany(items);
}

async function markPaid(bookingId, paidAt = new Date()) {
  try {
    const b = await transition(bookingId, S.VALIDATED, S.PAID, { paidAt });
    return b;
  } catch (err) {
    if (err.code === 'INVALID_TRANSITION') return null;
    throw err;
  }
}


async function expireDueBookings(now = new Date()) {
  const due = await Booking.find({ status: S.VALIDATED, expiresAt: { $lte: now } });
  let count = 0;
  for (const b of due) {
    try {
      await transition(b._id, S.VALIDATED, S.EXPIRED);
    } catch {
      continue; 
    }
    await availability().releaseDay(b.room, b.date, b._id);
    eventBus.emit(eventBus.EVENTS.BOOKING_EXPIRED, { bookingId: b._id.toString() });
    count += 1;
  }
  return count;
}

async function completePastBookings(today = dates.todayString()) {
  const res = await Booking.updateMany({ status: S.PAID, date: { $lt: today } }, { $set: { status: S.COMPLETED, completedAt: new Date() } });
  return res.modifiedCount;
}

module.exports = {
  serialize,
  serializeMany,
  transition,
  createRequest,
  listForClient,
  getForClient,
  getOwnedByClient,
  getPaidForClient,
  cancel,
  listForAgent,
  getForAgent,
  getOwnedByAgent,
  validate,
  reject,
  hasActiveBookings,
  hasOpenBookingOnDay,
  rejectPendingForRoom,
  countByStatusForAgent,
  listPaidForAgent,
  listPendingForAgent,
  markPaid,
  expireDueBookings,
  completePastBookings,
  LIMITS,
  Room,
};
