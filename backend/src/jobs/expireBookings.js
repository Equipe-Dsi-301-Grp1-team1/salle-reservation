const Reservation = require('../models/Reservation');
const Creneau = require('../models/Creneau');
const { STATUS } = require('../constants/bookingStatus');
const Room = require('../models/Room');
const { User } = require('../models/User');
const bookingMailer = require('../services/bookingMailer');

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

    const room = await Room.findById(booking.roomId);
    const client = await User.findById(booking.clientId).select('email');
    await bookingMailer.sendExpired(
      client ? client.email : null,
      booking,
      room || { name: 'Salle' }
    );
  }

  return due.length;
}

module.exports = { expireBookings };
