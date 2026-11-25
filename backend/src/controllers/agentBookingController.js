const bookingService = require('../services/bookingService');
const { toView } = require('../utils/bookingPresenter');

async function list(req, res) {
  try {
    const bookings = await bookingService.listAgentBookings(req.user.id, {
      status: req.query.status,
    });
    res.json(bookings.map(toView));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function detail(req, res) {
  try {
    const booking = await bookingService.getAgentBooking(req.user.id, req.params.id);
    res.json(toView(booking));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { list, detail };
