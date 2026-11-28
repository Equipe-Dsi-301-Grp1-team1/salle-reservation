const bookingService = require('../services/bookingService');
const { toView } = require('../utils/bookingPresenter');

async function showRequests(req, res) {
  try {
    const bookings = await bookingService.listAgentBookings(req.agentId);
    const rooms = await bookingService.getAgentRooms(req.agentId);

    res.render('reservations/agent/requests', {
      agentId: req.agentId,
      title: 'Demandes de réservation',
      bookings: bookings.map(toView),
      rooms: rooms,
      message: req.query.message || null,
      error: req.query.error || null,
    });
  } catch (error) {
    res.status(error.status || 500).send(error.message);
  }
}

module.exports = { showRequests };
