const PDFDocument = require('pdfkit');
const Reservation = require('../models/Reservation');
const { User } = require('../models/User');
const Room = require('../models/Room');
const { formatFrenchDate } = require('../utils/bookingDate');

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function buildReceipt(clientId, bookingId) {
  const booking = await Reservation.findOne({ _id: bookingId, clientId: clientId });
  if (!booking) {
    throw makeError(404, 'Réservation introuvable.');
  }
  if (booking.status !== 'PAYEE' && booking.status !== 'TERMINEE') {
    throw makeError(409, 'Le reçu est disponible seulement après le paiement.');
  }

  const client = await User.findById(clientId).select('name email');
  const room = await Room.findById(booking.roomId).select('name address');

  const doc = new PDFDocument({ margin: 50 });

  const chunks = [];
  doc.on('data', function (chunk) {
    chunks.push(chunk);
  });

  const finished = new Promise(function (resolve) {
    doc.on('end', function () {
      resolve(Buffer.concat(chunks));
    });
  });

  doc.fontSize(20).text('EventSpace', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).text('Reçu de réservation', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(11);
  doc.text('Référence : ' + booking.reference);
  doc.text('Client : ' + (client ? client.name : ''));
  doc.text('E-mail : ' + (client ? client.email : ''));
  doc.moveDown(0.8);

  doc.text('Salle : ' + (room ? room.name : ''));
  doc.text('Adresse : ' + (room ? room.address : ''));
  doc.text('Date de l\'événement : ' + formatFrenchDate(booking.date));
  doc.text('Durée : ' + booking.hours + ' heures');
  doc.text('Nombre d\'invités : ' + booking.guests);
  doc.moveDown(1);

  doc.fontSize(13).text('Montant payé : ' + Number(booking.amount).toFixed(2) + ' EUR');
  if (booking.paidAt) {
    doc.fontSize(10).text('Payé le : ' + formatFrenchDate(booking.paidAt));
  }

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#555555');
  doc.text('Ce reçu atteste du paiement de la réservation. Aucun remboursement automatique n\'est prévu.');

  doc.end();
  return finished;
}

module.exports = { buildReceipt };
