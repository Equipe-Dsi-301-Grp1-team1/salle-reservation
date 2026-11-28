const mongoose = require('mongoose');
const Room = require('../models/Room');
const Creneau = require('../models/Creneau');
const Reservation = require('../models/Reservation');
const { User } = require('../models/User');
const {
  STATUS,
  ACTIVE_STATUSES,
  MIN_HOURS,
  MAX_HOURS,
  EVENT_TYPES,
  STATUS_LABELS,
  PAYMENT_DEADLINE_HOURS,
  CANCELLATION_MIN_DAYS,
} = require('../constants/bookingStatus');
const { toDay, today, daysBetween, makeReference } = require('../utils/bookingDate');
const { toView } = require('../utils/bookingPresenter');
const bookingMailer = require('./bookingMailer');

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getRoomInfo(roomId) {
  if (!mongoose.isValidObjectId(roomId)) {
    throw makeError(404, 'Salle introuvable.');
  }
  const room = await Room.findById(roomId);
  if (!room || room.isPublished === false) {
    throw makeError(404, 'Salle introuvable.');
  }
  return {
    id: room._id,
    name: room.name,
    description: room.description,
    address: room.address,
    capacity: room.capacity,
    pricePerHour: room.pricePerHour,
    equipments: room.equipments,
    photos: room.photos,
  };
}

async function createBooking(clientId, data) {
  const body = data || {};
  const room = await Room.findById(body.roomId).catch(() => null);
  if (!room || room.isPublished === false) {
    throw makeError(404, 'Salle introuvable.');
  }

  const date = toDay(body.date);
  if (date < today()) {
    throw makeError(400, 'La date de réservation est passée.');
  }

  const hours = Number(body.hours);
  if (!Number.isInteger(hours) || hours < MIN_HOURS || hours > MAX_HOURS) {
    throw makeError(400, 'Le nombre d\'heures doit être compris entre 1 et 12.');
  }

  const guests = Number(body.guests);
  if (!Number.isInteger(guests) || guests < 1) {
    throw makeError(400, 'Le nombre d\'invités doit être supérieur à 0.');
  }
  if (guests > room.capacity) {
    throw makeError(422, 'Cette salle accueille ' + room.capacity + ' personnes maximum.');
  }

  const eventType = String(body.eventType || '').trim();
  if (!EVENT_TYPES.includes(eventType)) {
    throw makeError(400, 'Choisissez un type d\'événement.');
  }

  const creneau = await Creneau.findOne({ roomId: room._id, date: date });
  if (!creneau || creneau.status !== 'DISPONIBLE') {
    throw makeError(409, 'Ce jour n\'est pas disponible pour cette salle.');
  }

  const alreadyAsked = await Reservation.findOne({
    clientId: clientId,
    roomId: room._id,
    date: date,
    status: { $in: ACTIVE_STATUSES },
  });
  if (alreadyAsked) {
    throw makeError(409, 'Vous avez déjà une demande pour ce jour.');
  }

  const amount = Math.round(room.pricePerHour * hours * 100) / 100;

  const booking = await Reservation.create({
    reference: makeReference(),
    clientId: clientId,
    roomId: room._id,
    date: date,
    hours: hours,
    guests: guests,
    eventType: eventType,
    amount: amount,
    status: STATUS.EN_ATTENTE,
    creneaux: [creneau._id],
  });

  const agent = await User.findById(room.agentId).select('email name');
  const client = await User.findById(clientId).select('name');
  await bookingMailer.sendNewRequest(
    agent ? agent.email : null,
    booking,
    room,
    client ? client.name : 'Un client'
  );

  return booking;
}

async function getAgentRooms(agentId) {
  return Room.find({ agentId: agentId }).sort({ name: 1 });
}

async function listAgentBookings(agentId, filters) {
  const options = filters || {};
  const rooms = await getAgentRooms(agentId);
  const roomIds = rooms.map(function (room) {
    return room._id;
  });

  const query = { roomId: { $in: roomIds } };
  if (options.status && Object.values(STATUS).includes(options.status)) {
    query.status = options.status;
  }

  return Reservation.find(query)
    .populate('clientId', 'name email')
    .populate('roomId', 'name')
    .sort({ createdAt: -1 });
}

async function getAgentBooking(agentId, bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw makeError(404, 'Demande introuvable.');
  }

  const booking = await Reservation.findById(bookingId)
    .populate('clientId', 'name email')
    .populate('roomId', 'name address pricePerHour agentId');

  if (!booking || !booking.roomId || booking.roomId.agentId.toString() !== agentId.toString()) {
    throw makeError(404, 'Demande introuvable.');
  }

  return booking;
}

async function validateBooking(agentId, bookingId) {
  const booking = await getAgentBooking(agentId, bookingId);

  if (booking.status !== STATUS.EN_ATTENTE) {
    throw makeError(409, 'Cette demande a déjà été traitée.');
  }

  const roomId = booking.roomId._id;
  let creneau = await Creneau.findOneAndUpdate(
    { _id: { $in: booking.creneaux }, status: 'DISPONIBLE' },
    { status: 'RESERVE', reservationId: booking._id },
    { returnDocument: 'after' }
  );

  if (!creneau) {
    creneau = await Creneau.findOneAndUpdate(
      { roomId: roomId, date: booking.date, status: 'DISPONIBLE' },
      { status: 'RESERVE', reservationId: booking._id },
      { returnDocument: 'after' }
    );
  }

  if (!creneau) {
    throw makeError(409, 'Ce jour est déjà réservé.');
  }

  booking.status = STATUS.VALIDEE;
  booking.validatedAt = new Date();
  booking.expiresAt = new Date(Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000);
  await booking.save();

  return getAgentBooking(agentId, booking._id);
}

async function rejectBooking(agentId, bookingId, reason) {
  const booking = await getAgentBooking(agentId, bookingId);

  if (booking.status !== STATUS.EN_ATTENTE) {
    throw makeError(409, 'Cette demande a déjà été traitée.');
  }

  const text = String(reason || '').trim();
  if (!text) {
    throw makeError(400, 'Le motif du refus est obligatoire.');
  }

  booking.status = STATUS.REFUSEE;
  booking.rejectionReason = text;
  await booking.save();

  return getAgentBooking(agentId, booking._id);
}

async function listClientBookings(clientId, status) {
  const query = { clientId: clientId };
  if (status && Object.values(STATUS).includes(status)) {
    query.status = status;
  }

  return Reservation.find(query)
    .populate('roomId', 'name address photos')
    .sort({ createdAt: -1 });
}

async function getClientBooking(clientId, bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw makeError(404, 'Réservation introuvable.');
  }

  const booking = await Reservation.findOne({ _id: bookingId, clientId: clientId })
    .populate('roomId', 'name address pricePerHour photos');

  if (!booking) {
    throw makeError(404, 'Réservation introuvable.');
  }

  return booking;
}

async function cancelBooking(clientId, bookingId) {
  const booking = await getClientBooking(clientId, bookingId);

  if (![STATUS.EN_ATTENTE, STATUS.VALIDEE, STATUS.PAYEE].includes(booking.status)) {
    throw makeError(409, 'Cette réservation ne peut plus être annulée.');
  }

  const daysLeft = daysBetween(today(), booking.date);
  if (daysLeft <= CANCELLATION_MIN_DAYS) {
    throw makeError(409, 'Annulation impossible : la date est dans moins de 7 jours.');
  }

  await Creneau.updateMany(
    { reservationId: booking._id },
    { status: 'DISPONIBLE', reservationId: null }
  );

  booking.status = STATUS.ANNULEE;
  booking.cancelledAt = new Date();
  await booking.save();

  return getClientBooking(clientId, booking._id);
}

async function getClientHistory(agentId, clientId, currentBookingId) {
  const rooms = await getAgentRooms(agentId);
  const roomIds = rooms.map(function (room) {
    return room._id;
  });

  const bookings = await Reservation.find({
    clientId: clientId,
    roomId: { $in: roomIds },
    _id: { $ne: currentBookingId },
  })
    .populate('roomId', 'name')
    .sort({ date: -1 });

  const byStatus = {};
  let paidTotal = 0;

  bookings.forEach(function (booking) {
    byStatus[booking.status] = (byStatus[booking.status] || 0) + 1;
    if (booking.status === STATUS.PAYEE || booking.status === STATUS.TERMINEE) {
      paidTotal += booking.amount;
    }
  });

  const counts = Object.keys(byStatus).map(function (status) {
    return {
      status: status,
      label: STATUS_LABELS[status] || status,
      count: byStatus[status],
    };
  });

  return {
    total: bookings.length,
    counts: counts,
    paidTotal: Math.round(paidTotal * 100) / 100,
    items: bookings.slice(0, 10).map(toView),
  };
}

module.exports = {
  getRoomInfo,
  createBooking,
  getAgentRooms,
  listAgentBookings,
  getAgentBooking,
  listClientBookings,
  getClientBooking,
  getClientHistory,
  validateBooking,
  rejectBooking,
  cancelBooking,
  makeError,
};

