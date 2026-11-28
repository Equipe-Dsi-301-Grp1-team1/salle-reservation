const bookingService = require('../services/bookingService');
const { toClientView } = require('../utils/bookingPresenter');

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

async function listMine(req, res) {
  try {
    const bookings = await bookingService.listClientBookings(req.user.id, req.query.status);
    res.json(bookings);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function detailMine(req, res) {
  try {
    const booking = await bookingService.getClientBooking(req.user.id, req.params.id);
    res.json(toClientView(booking));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

async function cancel(req, res) {
  try {
    const booking = await bookingService.cancelBooking(req.user.id, req.params.id);
    res.json({
      message: 'Votre réservation est annulée.',
      booking: toClientView(booking),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

module.exports = { getRoom, create, listMine, detailMine, cancel };
