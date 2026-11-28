const Room = require('../models/Room');

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getRoomInfo(roomId) {
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

module.exports = { getRoomInfo, makeError };
