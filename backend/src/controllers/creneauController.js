const creneauService = require('../services/creneauService');

async function listAvailable(req, res) {
  try {
    const creneaux = await creneauService.listAvailableCreneaux(req.params.roomId, req.query.date);
    res.json(creneaux);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function roomsAvailable(req, res) {
  try {
    const roomIds = await creneauService.roomsAvailableOn(req.query.date);
    res.json(roomIds);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { listAvailable, roomsAvailable };
