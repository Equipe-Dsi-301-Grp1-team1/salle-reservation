const bookingService = require('../services/bookingService');

async function getRoom(req, res) {
  try {
    const room = await bookingService.getRoomInfo(req.params.roomId);
    res.json(room);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function create(req, res) {
  try {
    const booking = await bookingService.createBooking(req.user.id, req.body);
    res.status(201).json({
      message: 'Votre demande a bien été envoyée.',
      booking,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { getRoom, create };
