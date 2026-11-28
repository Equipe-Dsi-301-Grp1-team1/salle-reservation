const bookingService = require('../services/bookingService');
const { toView } = require('../utils/bookingPresenter');

async function showRequests(req, res) {
  try {
    const bookings = await bookingService.listAgentBookings(req.agentId, {
      status: req.query.status,
    });
    const rooms = await bookingService.getAgentRooms(req.agentId);

    res.render('reservations/agent/requests', {
      agentId: req.agentId,
      title: 'Demandes de réservation',
      bookings: bookings.map(toView),
      rooms: rooms,
      currentStatus: req.query.status || '',
      message: req.query.message || null,
      error: req.query.error || null,
    });
  } catch (error) {
    res.status(error.status || 500).send(error.message);
  }
}

async function showRequest(req, res) {
  try {
    const booking = await bookingService.getAgentBooking(req.agentId, req.params.id);

    res.render('reservations/agent/request-detail', {
      agentId: req.agentId,
      title: 'Demande ' + booking.reference,
      booking: toView(booking),
      message: req.query.message || null,
      error: req.query.error || null,
    });
  } catch (error) {
    res.status(error.status || 500).send(error.message);
  }
}

module.exports = { showRequests, showRequest };
