const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const { STATUS, STATUS_LABELS } = require('../constants/bookingStatus');
const { toView } = require('../utils/bookingPresenter');

async function getDashboard(agentId) {
  const rooms = await Room.find({ agentId: agentId }).select('_id');
  const roomIds = rooms.map(function (room) {
    return room._id;
  });

  const bookings = await Reservation.find({ roomId: { $in: roomIds } })
    .populate('clientId', 'name email')
    .populate('roomId', 'name')
    .sort({ createdAt: -1 });

  const counts = Object.values(STATUS).map(function (status) {
    return {
      status: status,
      label: STATUS_LABELS[status],
      count: 0,
    };
  });

  let pending = [];

  bookings.forEach(function (booking) {
    const line = counts.find(function (item) {
      return item.status === booking.status;
    });
    if (line) {
      line.count = line.count + 1;
    }
    if (booking.status === STATUS.EN_ATTENTE && pending.length < 5) {
      pending.push(toView(booking));
    }
  });

  return {
    counts: counts,
    pending: pending,
    total: bookings.length,
    rooms: rooms.length,
  };
}

module.exports = { getDashboard };
