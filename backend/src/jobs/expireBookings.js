const Reservation = require('../models/Reservation');
const Creneau = require('../models/Creneau');
const { STATUS } = require('../constants/bookingStatus');

async function expireBookings() {
  const now = new Date();
  const due = await Reservation.find({
    status: STATUS.VALIDEE,
    expiresAt: { $lt: now },
  });

  for (const booking of due) {
    await Creneau.updateMany(
      { reservationId: booking._id },
      { status: 'DISPONIBLE', reservationId: null }
    );

    booking.status = STATUS.EXPIREE;
    await booking.save();
  }

  return due.length;
}

module.exports = { expireBookings };
