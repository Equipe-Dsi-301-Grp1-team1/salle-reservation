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

module.exports = { toView };
