const { matchedData, validationResult } = require('express-validator');
const Room = require('../../models/room');

async function apiSearchRooms(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ erreurs: errors.array() });
  }
  const filters = matchedData(req, { locations: ['query'] });
  res.json(await Room.searchRooms(filters));
}

async function apiGetRoom(req, res) {
  const room = await Room.findOne({ _id: req.params.id, isPublished: true });
  if (!room) return res.status(404).json({ erreur: 'Salle introuvable' });
  res.json(room);
}

module.exports = { apiSearchRooms, apiGetRoom };
