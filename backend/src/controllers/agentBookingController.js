const bookingService = require('../services/bookingService');
const { toView } = require('../utils/bookingPresenter');

async function list(req, res) {
  try {
    const bookings = await bookingService.listAgentBookings(req.user.id);
    res.json(bookings.map(toView));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { list };
