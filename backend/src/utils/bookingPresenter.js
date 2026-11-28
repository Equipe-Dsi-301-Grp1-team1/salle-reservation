const { STATUS_LABELS } = require('../constants/bookingStatus');
const { dayText, formatFrenchDate } = require('./bookingDate');

function toView(booking) {
  const client = booking.clientId;
  const room = booking.roomId;

  return {
    id: booking._id.toString(),
    reference: booking.reference,
    client: client && client.name ? client.name : 'Client inconnu',
    clientEmail: client && client.email ? client.email : '',
    room: room && room.name ? room.name : 'Salle inconnue',
    roomId: room && room._id ? room._id.toString() : '',
    date: booking.date ? dayText(booking.date) : '',
    dateLabel: booking.date ? formatFrenchDate(booking.date) : '',
    hours: booking.hours || 0,
    guests: booking.guests,
    eventType: booking.eventType || '',
    amount: booking.amount,
    status: booking.status,
    statusLabel: STATUS_LABELS[booking.status] || booking.status,
    statusClass: booking.status.toLowerCase(),
    rejectionReason: booking.rejectionReason || '',
  };
}

function toClientView(booking) {
  const room = booking.roomId;
  const status = booking.status;
  let hoursLeft = 0;

  if (status === 'VALIDEE' && booking.expiresAt) {
    const diff = booking.expiresAt.getTime() - Date.now();
    hoursLeft = diff > 0 ? Math.ceil(diff / (60 * 60 * 1000)) : 0;
  }

  return {
    id: booking._id.toString(),
    reference: booking.reference,
    room: {
      id: room && room._id ? room._id.toString() : '',
      name: room && room.name ? room.name : 'Salle inconnue',
      address: room && room.address ? room.address : '',
      pricePerHour: room && room.pricePerHour ? room.pricePerHour : 0,
      photo: room && room.photos && room.photos.length ? room.photos[0] : '',
    },
    date: booking.date ? dayText(booking.date) : '',
    dateLabel: booking.date ? formatFrenchDate(booking.date) : '',
    hours: booking.hours || 0,
    guests: booking.guests,
    eventType: booking.eventType || '',
    amount: booking.amount,
    status: status,
    statusLabel: STATUS_LABELS[status] || status,
    statusClass: status.toLowerCase(),
    rejectionReason: booking.rejectionReason || '',
    expiresAt: booking.expiresAt ? booking.expiresAt.toISOString() : null,
    hoursLeft: hoursLeft,
  };
}

module.exports = { toView, toClientView };
