const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const { STATUS, STATUS_LABELS } = require('../constants/bookingStatus');
const { toView } = require('../utils/bookingPresenter');

const MONTH_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function buildRevenue(bookings) {
  const months = [];
  const now = new Date();

  for (let i = 4; i >= 0; i--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({
      key: date.toISOString().slice(0, 7),
      label: MONTH_SHORT[date.getUTCMonth()] + ' ' + date.getUTCFullYear(),
      total: 0,
    });
  }

  bookings.forEach(function (booking) {
    if (booking.status !== STATUS.PAYEE && booking.status !== STATUS.TERMINEE) {
      return;
    }
    if (!booking.date) {
      return;
    }
    const key = new Date(booking.date).toISOString().slice(0, 7);
    const month = months.find(function (item) {
      return item.key === key;
    });
    if (month) {
      month.total = month.total + booking.amount;
    }
  });

  const max = Math.max.apply(null, months.map(function (item) {
    return item.total;
  }));

  months.forEach(function (item) {
    item.total = Math.round(item.total * 100) / 100;
    item.percent = max > 0 ? Math.round((item.total / max) * 100) : 0;
  });

  return {
    months: months,
    monthTotal: months[months.length - 1].total,
  };
}

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
    revenue: buildRevenue(bookings),
  };
}

module.exports = { getDashboard };
