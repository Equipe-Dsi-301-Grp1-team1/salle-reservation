const Reservation = require('../models/Reservation');
const { STATUS } = require('../constants/bookingStatus');

async function completePastBookings() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const due = await Reservation.find({
    status: STATUS.PAYEE,
    date: { $lt: today },
  });

  for (const booking of due) {
    booking.status = STATUS.TERMINEE;
    booking.completedAt = new Date();
    await booking.save();
  }

  return due.length;
}

module.exports = { completePastBookings };
