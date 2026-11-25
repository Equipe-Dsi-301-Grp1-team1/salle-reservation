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
    const history = await bookingService.getClientHistory(req.agentId, booking.clientId._id, booking._id);

    res.render('reservations/agent/request-detail', {
      agentId: req.agentId,
      title: 'Demande ' + booking.reference,
      booking: toView(booking),
      history: history,
      message: req.query.message || null,
      error: req.query.error || null,
    });
  } catch (error) {
    res.status(error.status || 500).send(error.message);
  }
}

async function validateRequest(req, res) {
  const url = '/agent/requests/' + req.params.id + '?agentId=' + req.agentId;
  try {
    await bookingService.validateBooking(req.agentId, req.params.id);
    res.redirect(url + '&message=' + encodeURIComponent('Réservation validée. Le client peut payer.'));
  } catch (error) {
    res.redirect(url + '&error=' + encodeURIComponent(error.message));
  }
}

async function rejectRequest(req, res) {
  const url = '/agent/requests/' + req.params.id + '?agentId=' + req.agentId;
  try {
    await bookingService.rejectBooking(req.agentId, req.params.id, req.body.reason);
    res.redirect(url + '&message=' + encodeURIComponent('Demande refusée.'));
  } catch (error) {
    res.redirect(url + '&error=' + encodeURIComponent(error.message));
  }
}

module.exports = { showRequests, showRequest, validateRequest, rejectRequest };
