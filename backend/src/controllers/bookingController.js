const bookingService = require('../services/bookingService');

async function getRoom(req, res) {
  try {
    const room = await bookingService.getRoomInfo(req.params.roomId);
    res.json(room);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { getRoom };
