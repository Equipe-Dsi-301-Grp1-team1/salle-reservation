const mongoose = require('mongoose');
const Room = require('../models/Room');
const Creneau = require('../models/Creneau');
const Reservation = require('../models/Reservation');
const {
  STATUS,
  ACTIVE_STATUSES,
  MIN_HOURS,
  MAX_HOURS,
  EVENT_TYPES,
  PAYMENT_DEADLINE_HOURS,
} = require('../constants/bookingStatus');
const { toDay, today, makeReference } = require('../utils/bookingDate');

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

  return Reservation.create({
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

module.exports = {
  getRoomInfo,
  createBooking,
  getAgentRooms,
  listAgentBookings,
  getAgentBooking,
  listClientBookings,
  getClientBooking,
  validateBooking,
  rejectBooking,
  makeError,
};

