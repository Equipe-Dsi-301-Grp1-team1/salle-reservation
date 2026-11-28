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

async function listAgentBookings(agentId) {
  const rooms = await getAgentRooms(agentId);
  const roomIds = rooms.map(function (room) {
    return room._id;
  });

  return Reservation.find({ roomId: { $in: roomIds } })
    .populate('clientId', 'name email')
    .populate('roomId', 'name')
    .sort({ createdAt: -1 });
}

module.exports = { getRoomInfo, createBooking, getAgentRooms, listAgentBookings, makeError };

